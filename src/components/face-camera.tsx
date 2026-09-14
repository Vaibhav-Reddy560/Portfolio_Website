'use client';

import { useEffect, useRef, useState } from 'react';
import {
  DETECT_HEIGHT,
  DETECT_WIDTH,
  ENROLL_SAMPLES_PER_POSE,
  FACE_MODEL_URL,
  LIVENESS_HINT_MS,
  CAPTURE_INPUT_SIZE,
  LIVENESS_INPUT_SIZE,
  LOGIN_SAMPLE_COUNT,
  TFJS_WASM_URL,
  POSE_PITCH_DELTA,
  POSE_YAW_DELTA,
} from '@/lib/face/constants';
import { createLivenessDetector } from '@/lib/face/liveness';

type FaceApiModule = typeof import('@vladmandic/face-api');
type Point = { x: number; y: number };

let weightsPromise: Promise<void> | null = null;
let loopWarmPromise: Promise<void> | null = null;
let descriptorWarmPromise: Promise<void> | null = null;

function warmCanvas() {
  const canvas = document.createElement('canvas');
  canvas.width = DETECT_WIDTH;
  canvas.height = DETECT_HEIGHT;
  const context = canvas.getContext('2d');
  if (context) {
    context.fillStyle = '#808080';
    context.fillRect(0, 0, canvas.width, canvas.height);
  }
  return canvas;
}

/**
 * Selects the WASM backend before any model loads.
 *
 * These nets are small, and on WebGL the cost is dominated by compiling a GPU
 * shader for every op — measured at ~21s on an Apple M2 (7.7s detector, 4.4s
 * landmarks, 8.3s descriptor), which was essentially the whole of the 20-25s
 * sign-in. WASM has no shader compilation at all: the same measurement is
 * ~390ms end to end, and it is also about twice as fast per frame, because
 * WebGL's per-op dispatch overhead outweighs the GPU for work this size.
 *
 * Threaded WASM would need cross-origin isolation (COOP/COEP), which this app
 * doesn't set, so this runs single-threaded SIMD — which is what those numbers
 * were measured under.
 *
 * Falls back to leaving the default backend in place if anything here fails,
 * so a missing binary means "slow, like before" rather than "sign-in broken".
 */
async function selectBackend(faceapi: FaceApiModule) {
  // face-api's bundled tfjs type definitions re-export only a curated subset
  // of tfjs-core, so these three are absent from the types despite existing on
  // the runtime bundle (confirmed by calling them against it). Narrow shape
  // rather than `any`, so a genuine signature change still fails the build.
  const tf = faceapi.tf as unknown as {
    setWasmPaths: (path: string) => void;
    setBackend: (name: string) => Promise<boolean>;
    ready: () => Promise<void>;
    getBackend: () => string;
  };

  try {
    tf.setWasmPaths(TFJS_WASM_URL);
    await tf.setBackend('wasm');
    await tf.ready();
  } catch {
    await tf.ready();
  }
}

function ensureWeights(faceapi: FaceApiModule) {
  weightsPromise ??= (async () => {
    await selectBackend(faceapi);
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(FACE_MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(FACE_MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(FACE_MODEL_URL),
    ]);
  })();
  return weightsPromise;
}

/**
 * Runs each net once so the first real frame isn't the one paying for
 * initialisation. Cheap on WASM (~150ms); it mattered enormously on WebGL,
 * where it was seconds of shader compilation.
 *
 * The nets are invoked directly rather than via detectSingleFace's chained
 * form: a blank canvas contains no face, so the chained landmark stage would
 * be skipped and never initialised.
 */
function ensureLoopReady(faceapi: FaceApiModule) {
  loopWarmPromise ??= (async () => {
    await ensureWeights(faceapi);
    const warm = warmCanvas();
    await faceapi.detectSingleFace(
      warm,
      new faceapi.TinyFaceDetectorOptions({ inputSize: LIVENESS_INPUT_SIZE }),
    );
    await faceapi.nets.faceLandmark68Net.detectLandmarks(warm);
  })();
  return loopWarmPromise;
}

/**
 * The descriptor net isn't needed until the moment of capture, so it
 * initialises in the background while the liveness check is still running
 * rather than holding up the camera.
 */
function ensureDescriptorReady(faceapi: FaceApiModule) {
  descriptorWarmPromise ??= (async () => {
    await ensureWeights(faceapi);
    await faceapi.nets.faceRecognitionNet.computeFaceDescriptor(warmCanvas());
  })();
  return descriptorWarmPromise;
}

/**
 * Starts the model download and initialisation early, without opening a
 * camera. Call it when the user shows intent (hovering or focusing the Face
 * ID button) so it's already done by the time they click. Safe to call
 * repeatedly; every stage is memoised.
 */
export function prewarmFaceRecognition() {
  void (async () => {
    try {
      const faceapi = await import('@vladmandic/face-api');
      await ensureLoopReady(faceapi);
      await ensureDescriptorReady(faceapi);
    } catch {
      /* the camera flow surfaces load failures properly when it runs */
    }
  })();
}

function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Eye-aspect-ratio (Soukupová & Čech, 2016): low while closed, higher while open. */
function eyeAspectRatio(eye: Point[]) {
  const vertical = distance(eye[1], eye[5]) + distance(eye[2], eye[4]);
  const horizontal = distance(eye[0], eye[3]);
  return horizontal ? vertical / (2 * horizontal) : 0;
}

/** Nose tip offset from the eye-line midpoint, scaled by inter-ocular distance. */
function yawProxy(positions: Point[]) {
  const leftOuter = positions[36];
  const rightOuter = positions[45];
  const noseTip = positions[30];
  const interOcular = distance(leftOuter, rightOuter);
  return interOcular ? (noseTip.x - (leftOuter.x + rightOuter.x) / 2) / interOcular : 0;
}

/** Nose tip height relative to the eye line, scaled the same way. */
function pitchProxy(positions: Point[]) {
  const leftOuter = positions[36];
  const rightOuter = positions[45];
  const noseTip = positions[30];
  const interOcular = distance(leftOuter, rightOuter);
  return interOcular ? (noseTip.y - (leftOuter.y + rightOuter.y) / 2) / interOcular : 0;
}

/**
 * The enrollment walk-through. Each position is captured separately so the
 * stored model covers a range of angles instead of one straight-on view.
 *
 * The two turn steps and the two tilt steps don't hardcode a direction:
 * the first accepts movement either way and the second then requires the
 * opposite sign. That sidesteps having to reason about whether the camera
 * feed is mirrored, and it works the same whichever way the person turns
 * first.
 */
const ENROLL_POSES = [
  { id: 'centre', prompt: 'Look straight at the camera' },
  { id: 'turn-a', prompt: 'Slowly turn your head to one side' },
  { id: 'turn-b', prompt: 'Now turn to the other side' },
  { id: 'tilt-a', prompt: 'Tilt your chin up or down' },
  { id: 'tilt-b', prompt: 'Now tilt it the other way' },
] as const;

function cameraErrorMessage(error: unknown) {
  const name = error instanceof DOMException ? error.name : '';
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return 'Camera access was denied. Allow camera access and try again.';
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return 'No camera was found on this device.';
  }
  return 'Could not access the camera.';
}

export type FaceSample = { descriptor: number[]; pose: string };

type FaceCameraProps = {
  mode: 'enroll' | 'login';
  onCapture: (samples: FaceSample[]) => void;
  onCancel: () => void;
};

/**
 * Shared camera + descriptor-capture UI for Face ID enrollment and login.
 *
 * Login checks for proof of life first, passively — nothing is demanded of
 * the person, it just watches for the involuntary movement a real face always
 * has (see lib/face/liveness.ts). Enrollment skips the check entirely:
 * reaching it already required an authenticated admin session, so liveness
 * there is friction that buys nothing.
 *
 * The detection loop deliberately runs *landmarks only*. Running the
 * descriptor net every frame instead would drop the loop to a few frames per
 * second; it now runs only at the moment of capture.
 *
 * face-api and its models load only when this component mounts, behind a
 * dynamic import, so they never reach the login page's initial bundle.
 */
export function FaceCamera({ mode, onCapture, onCancel }: FaceCameraProps) {
  const [status, setStatus] = useState('Starting camera…');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runIdRef = useRef(0);

  // Both callers pass an inline arrow, so depending on it directly would tear
  // down and restart the camera on every parent re-render.
  const onCaptureRef = useRef(onCapture);
  useEffect(() => {
    onCaptureRef.current = onCapture;
  });

  useEffect(() => {
    // Bumped per effect run so a Strict Mode remount (or a fast cancel/retry)
    // can't leave the previous run's async loop writing into the new one.
    runIdRef.current += 1;
    const runId = runIdRef.current;
    const isStale = () => runId !== runIdRef.current;

    const stopStream = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };

    async function start() {
      let faceapi: FaceApiModule;
      let loopReady: Promise<void>;
      try {
        faceapi = await import('@vladmandic/face-api');
        if (isStale()) return;
        setStatus('Loading face recognition…');
        // Not awaited yet: shader compilation runs while the camera is being
        // opened and the preview is coming up, instead of after it.
        loopReady = ensureLoopReady(faceapi);
      } catch {
        if (!isStale()) {
          setErrorMessage('Could not load face recognition. Check your connection and try again.');
        }
        return;
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        });
      } catch (error) {
        if (!isStale()) setErrorMessage(cameraErrorMessage(error));
        return;
      }
      if (isStale()) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();
      if (isStale()) return;

      try {
        await loopReady;
      } catch {
        if (!isStale()) {
          setErrorMessage('Could not load face recognition. Check your connection and try again.');
        }
        return;
      }
      if (isStale()) return;

      // Only needed at capture, so it compiles in the background rather than
      // holding up the liveness check.
      void ensureDescriptorReady(faceapi).catch(() => undefined);

      setStatus('Position your face in frame');

      // Cheap options for the every-frame liveness loop; accurate ones for the
      // handful of capture frames, which run against the full-resolution video
      // rather than the downscaled canvas. Enrollment and sign-in both use the
      // capture path, so descriptors stay directly comparable.
      const livenessOptions = new faceapi.TinyFaceDetectorOptions({
        inputSize: LIVENESS_INPUT_SIZE,
        scoreThreshold: 0.4,
      });
      const captureOptions = new faceapi.TinyFaceDetectorOptions({
        inputSize: CAPTURE_INPUT_SIZE,
        scoreThreshold: 0.5,
      });

      // Detection runs against a downscaled copy of the frame rather than the
      // raw camera feed; the eye-aspect ratio is a ratio, so shrinking the
      // frame doesn't affect it.
      const frame = document.createElement('canvas');
      frame.width = DETECT_WIDTH;
      frame.height = DETECT_HEIGHT;
      const frameContext = frame.getContext('2d');

      const grabFrame = () => {
        if (!frameContext || !videoRef.current) return null;
        frameContext.drawImage(videoRef.current, 0, 0, frame.width, frame.height);
        return frame;
      };

      let live = mode !== 'login';
      const livenessDetector = createLivenessDetector();
      const collected: { descriptor: number[]; pose: string }[] = [];
      let lastSampleAt = 0;
      let firstFaceAt: number | null = null;

      // Enrollment walk-through state.
      let poseIndex = 0;
      let poseSamples = 0;
      let baselineYaw = 0;
      let baselinePitch = 0;
      let baselineFrames = 0;
      let turnSign = 0;
      let tiltSign = 0;

      const schedule = () => {
        timerRef.current = setTimeout(tick, 16);
      };

      const tick = async () => {
        if (isStale() || !videoRef.current) return;

        const source = grabFrame();
        if (!source) {
          schedule();
          return;
        }

        const detection = await faceapi
          .detectSingleFace(source, livenessOptions)
          .withFaceLandmarks();

        if (isStale()) return;
        if (!detection) {
          setStatus('Position your face in frame');
          schedule();
          return;
        }

        const positions = detection.landmarks.positions;
        const ear =
          (eyeAspectRatio(detection.landmarks.getLeftEye()) +
            eyeAspectRatio(detection.landmarks.getRightEye())) /
          2;
        const { live: detectedLive, eyesOpen } = livenessDetector.observe(positions, ear);
        if (detectedLive) live = true;

        if (!live) {
          // The clock starts at the first frame a face is actually seen, not
          // when the camera opened — otherwise the hint fires while the person
          // is still getting into frame, which reads as nonsense.
          firstFaceAt ??= Date.now();
          setStatus(
            Date.now() - firstFaceAt > LIVENESS_HINT_MS
              ? 'Still checking — try moving a little closer'
              : 'Checking…',
          );
          schedule();
          return;
        }

        // Never sample a blinking frame — a half-closed eye shifts the
        // descriptor for no good reason.
        if (!eyesOpen) {
          schedule();
          return;
        }

        const yaw = yawProxy(detection.landmarks.positions);
        const pitch = pitchProxy(detection.landmarks.positions);

        // Decide whether this frame is worth spending the descriptor net on,
        // before paying for it.
        let pose = 'login';
        if (mode === 'enroll') {
          const current = ENROLL_POSES[poseIndex];
          pose = current.id;

          if (poseIndex === 0) {
            // The centre step doubles as calibration: whatever they're doing
            // while looking at the camera becomes the reference for "moved".
            baselineYaw = (baselineYaw * baselineFrames + yaw) / (baselineFrames + 1);
            baselinePitch = (baselinePitch * baselineFrames + pitch) / (baselineFrames + 1);
            baselineFrames += 1;
          } else {
            const dYaw = yaw - baselineYaw;
            const dPitch = pitch - baselinePitch;
            let reached = false;

            if (current.id === 'turn-a') {
              reached = Math.abs(dYaw) > POSE_YAW_DELTA;
            } else if (current.id === 'turn-b') {
              reached = Math.sign(dYaw) === -turnSign && Math.abs(dYaw) > POSE_YAW_DELTA;
            } else if (current.id === 'tilt-a') {
              reached = Math.abs(dPitch) > POSE_PITCH_DELTA;
            } else if (current.id === 'tilt-b') {
              reached = Math.sign(dPitch) === -tiltSign && Math.abs(dPitch) > POSE_PITCH_DELTA;
            }

            if (!reached) {
              setStatus(
                `${poseIndex + 1}/${ENROLL_POSES.length} · ${current.prompt}`,
              );
              schedule();
              return;
            }

            if (current.id === 'turn-a') turnSign = Math.sign(dYaw);
            if (current.id === 'tilt-a') tiltSign = Math.sign(dPitch);
          }
        }

        const cadence = mode === 'login' ? 120 : 220;
        if (Date.now() - lastSampleAt < cadence) {
          schedule();
          return;
        }

        await ensureDescriptorReady(faceapi);
        if (isStale() || !videoRef.current) return;

        const full = await faceapi
          .detectSingleFace(videoRef.current, captureOptions)
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (isStale()) return;
        if (!full) {
          schedule();
          return;
        }

        collected.push({ descriptor: Array.from(full.descriptor), pose });
        lastSampleAt = Date.now();

        if (mode === 'login') {
          if (collected.length >= LOGIN_SAMPLE_COUNT) {
            stopStream();
            onCaptureRef.current(collected);
            return;
          }
          setStatus('Hold still…');
          schedule();
          return;
        }

        poseSamples += 1;
        if (poseSamples >= ENROLL_SAMPLES_PER_POSE) {
          poseIndex += 1;
          poseSamples = 0;
          if (poseIndex >= ENROLL_POSES.length) {
            stopStream();
            onCaptureRef.current(collected);
            return;
          }
        }

        setStatus(
          `${poseIndex + 1}/${ENROLL_POSES.length} · ${ENROLL_POSES[poseIndex].prompt}` +
            ` · ${collected.length} captured`,
        );
        schedule();
      };

      schedule();
    }

    start();

    return () => {
      runIdRef.current += 1;
      stopStream();
    };
  }, [mode]);

  if (errorMessage) {
    return (
      <div className="space-y-3">
        <p role="alert" className="t-data text-[11px] uppercase tracking-[0.1em] text-rust">
          ⚠ {errorMessage}
        </p>
        <button type="button" onClick={onCancel} className="btn w-full py-1.5 text-[11px]">
          Use password instead
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <video
        ref={videoRef}
        muted
        playsInline
        className="w-full scale-x-[-1] border border-phosphor/30 bg-crt"
      />
      <p className="t-data text-[11px] uppercase tracking-[0.1em] text-phosphor/70">{status}</p>
      <button type="button" onClick={onCancel} className="btn w-full py-1.5 text-[11px]">
        Cancel
      </button>
    </div>
  );
}
