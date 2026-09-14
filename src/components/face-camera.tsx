'use client';

import { useEffect, useRef, useState } from 'react';
import {
  CAPTURE_INPUT_SIZE,
  DETECT_HEIGHT,
  DETECT_WIDTH,
  ENROLL_SAMPLES_PER_POSE,
  FACE_MODEL_URL,
  LIVENESS_FALLBACK_MS,
  LIVENESS_INPUT_SIZE,
  LOGIN_SAMPLE_COUNT,
  POSE_PITCH_DELTA,
  POSE_YAW_DELTA,
  YAW_TURN_DELTA,
} from '@/lib/face/constants';
import { createBlinkDetector } from '@/lib/face/liveness';

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

function ensureWeights(faceapi: FaceApiModule) {
  weightsPromise ??= Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(FACE_MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(FACE_MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(FACE_MODEL_URL),
  ]).then(() => undefined);
  return weightsPromise;
}

/**
 * Compiles the WebGL shaders for the two nets the blink loop needs.
 *
 * Downloading the weights is the cheap part (~120ms); the first inference on
 * each net is what costs — measured at ~6.6s for the detector. Left unwarmed,
 * the user stares at "blink once" through a multi-second stall in which no
 * frame is sampled, so every blink during it is invisible. That was the whole
 * reason Face ID felt broken even once it worked.
 *
 * The nets are invoked directly rather than via detectSingleFace's chained
 * form: a blank canvas contains no face, so the chained landmark stage would
 * be skipped and its shaders never compiled.
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
 * The descriptor net is the most expensive to compile (~8s) but isn't needed
 * until the moment of capture, so it warms in the background while the user
 * is still being asked to blink, rather than holding up the prompt.
 */
function ensureDescriptorReady(faceapi: FaceApiModule) {
  descriptorWarmPromise ??= (async () => {
    await ensureWeights(faceapi);
    await faceapi.nets.faceRecognitionNet.computeFaceDescriptor(warmCanvas());
  })();
  return descriptorWarmPromise;
}

/**
 * Starts the download and shader compilation early, without opening a camera.
 * Call it when the user shows intent (hovering or focusing the Face ID
 * button) so the several seconds of one-time GPU work are already underway —
 * or finished — by the time they actually click. Safe to call repeatedly;
 * every stage is memoised.
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
 * Login requires proof of life first — a blink, or a head turn if no blink
 * registers in time — so a photo held up to the camera can't sign in.
 * Enrollment skips that: reaching it already required an authenticated admin
 * session, so a liveness check there is friction that buys nothing.
 *
 * The detection loop deliberately runs *landmarks only*. The descriptor net
 * is the expensive one (6.4MB), and running it every frame drops the loop to
 * ~2-3fps — far too slow to ever observe a ~120ms blink. It now runs exactly
 * once, at the moment of capture.
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
      // holding up the blink prompt.
      void ensureDescriptorReady(faceapi).catch(() => undefined);

      setStatus('Position your face in frame');

      const livenessOptions = new faceapi.TinyFaceDetectorOptions({
        inputSize: LIVENESS_INPUT_SIZE,
        scoreThreshold: 0.4,
      });
      const captureOptions = new faceapi.TinyFaceDetectorOptions({
        inputSize: CAPTURE_INPUT_SIZE,
        scoreThreshold: 0.4,
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
      const blinkDetector = createBlinkDetector();
      let yawMin = Infinity;
      let yawMax = -Infinity;
      const collected: { descriptor: number[]; pose: string }[] = [];
      let lastSampleAt = 0;
      const livenessStartedAt = Date.now();

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

        const ear =
          (eyeAspectRatio(detection.landmarks.getLeftEye()) +
            eyeAspectRatio(detection.landmarks.getRightEye())) /
          2;
        const { eyesOpen, blinked } = blinkDetector.observe(ear);

        if (!live) {
          if (blinked) {
            live = true;
          } else if (Date.now() - livenessStartedAt > LIVENESS_FALLBACK_MS) {
            const yaw = yawProxy(detection.landmarks.positions);
            yawMin = Math.min(yawMin, yaw);
            yawMax = Math.max(yawMax, yaw);
            if (yawMax - yawMin > YAW_TURN_DELTA) {
              live = true;
            } else {
              setStatus('Turn your head slowly left, then back');
              schedule();
              return;
            }
          } else {
            setStatus('Blink once to continue');
            schedule();
            return;
          }
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

        // Normally already finished during the blink prompt; awaiting it keeps
        // capture off a cold descriptor net, which costs seconds.
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
