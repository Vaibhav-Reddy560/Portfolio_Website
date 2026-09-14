'use client';

import { useEffect, useRef, useState } from 'react';
import {
  CAPTURE_INPUT_SIZE,
  ENROLL_SAMPLE_COUNT,
  FACE_MODEL_URL,
  LIVENESS_FALLBACK_MS,
  LIVENESS_INPUT_SIZE,
  YAW_TURN_DELTA,
} from '@/lib/face/constants';
import { createBlinkDetector } from '@/lib/face/liveness';

type FaceApiModule = typeof import('@vladmandic/face-api');
type Point = { x: number; y: number };

let modelsPromise: Promise<void> | null = null;

function ensureModelsLoaded(faceapi: FaceApiModule) {
  modelsPromise ??= Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(FACE_MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(FACE_MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(FACE_MODEL_URL),
  ]).then(() => undefined);
  return modelsPromise;
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

type FaceCameraProps = {
  mode: 'enroll' | 'login';
  onCapture: (descriptor: number[]) => void;
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
      try {
        faceapi = await import('@vladmandic/face-api');
        if (isStale()) return;
        setStatus('Loading face recognition…');
        await ensureModelsLoaded(faceapi);
      } catch {
        if (!isStale()) {
          setErrorMessage('Could not load face recognition. Check your connection and try again.');
        }
        return;
      }
      if (isStale()) return;

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

      setStatus('Position your face in frame');

      const livenessOptions = new faceapi.TinyFaceDetectorOptions({
        inputSize: LIVENESS_INPUT_SIZE,
        scoreThreshold: 0.4,
      });
      const captureOptions = new faceapi.TinyFaceDetectorOptions({
        inputSize: CAPTURE_INPUT_SIZE,
        scoreThreshold: 0.4,
      });

      let live = mode !== 'login';
      const blinkDetector = createBlinkDetector();
      let yawMin = Infinity;
      let yawMax = -Infinity;
      const samples: Float32Array[] = [];
      let lastSampleAt = 0;
      const livenessStartedAt = Date.now();

      const schedule = () => {
        timerRef.current = setTimeout(tick, 16);
      };

      const tick = async () => {
        if (isStale() || !videoRef.current) return;

        const detection = await faceapi
          .detectSingleFace(videoRef.current, livenessOptions)
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

        if (!eyesOpen) {
          schedule();
          return;
        }

        const full = await faceapi
          .detectSingleFace(videoRef.current, captureOptions)
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (isStale()) return;
        if (!full) {
          schedule();
          return;
        }

        if (mode === 'login') {
          stopStream();
          onCaptureRef.current(Array.from(full.descriptor));
          return;
        }

        const now = Date.now();
        if (now - lastSampleAt > 500) {
          samples.push(full.descriptor);
          lastSampleAt = now;
        }

        if (samples.length >= ENROLL_SAMPLE_COUNT) {
          const averaged = new Array<number>(full.descriptor.length).fill(0);
          for (const sample of samples) {
            for (let i = 0; i < sample.length; i += 1) averaged[i] += sample[i] / samples.length;
          }
          stopStream();
          onCaptureRef.current(averaged);
          return;
        }

        setStatus(`Captured ${samples.length}/${ENROLL_SAMPLE_COUNT} — hold still`);
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
