'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { EAR_BLINK_THRESHOLD, ENROLL_SAMPLE_COUNT, FACE_MODEL_URL } from '@/lib/face/constants';

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
  return vertical / (2 * horizontal);
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
 * Shared camera + liveness + descriptor-capture UI for both Face ID
 * enrollment and Face ID login. Requires one observed blink (proof of life
 * against a printed photo or a phone held up to the camera) before accepting
 * a frame. Enrollment averages ENROLL_SAMPLE_COUNT post-blink samples for
 * resilience to lighting/angle noise; login accepts the first one.
 *
 * face-api.js and its models are only ever loaded here, behind a dynamic
 * import — mounting this component is the only thing that pulls the ~7MB of
 * model weights and the recognition library into the page.
 */
export function FaceCamera({ mode, onCapture, onCancel }: FaceCameraProps) {
  const [status, setStatus] = useState('Starting camera…');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelledRef = useRef(false);
  const blinkedRef = useRef(false);
  const wasClosedRef = useRef(false);
  const samplesRef = useRef<Float32Array[]>([]);
  const lastSampleAtRef = useRef(0);

  const stop = useCallback(() => {
    cancelledRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  useEffect(() => {
    cancelledRef.current = false;

    async function start() {
      let faceapi: FaceApiModule;
      try {
        faceapi = await import('@vladmandic/face-api');
        setStatus('Loading face recognition…');
        await ensureModelsLoaded(faceapi);
      } catch {
        if (!cancelledRef.current) setErrorMessage('Could not load face recognition. Check your connection and try again.');
        return;
      }
      if (cancelledRef.current) return;

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 480 }, height: { ideal: 360 } },
        });
      } catch (error) {
        if (!cancelledRef.current) setErrorMessage(cameraErrorMessage(error));
        return;
      }
      if (cancelledRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();

      setStatus('Position your face in frame');

      const tick = async () => {
        if (cancelledRef.current || !videoRef.current) return;

        const result = await faceapi
          .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (cancelledRef.current) return;

        if (!result) {
          setStatus('Position your face in frame');
          timerRef.current = setTimeout(tick, 200);
          return;
        }

        const ear =
          (eyeAspectRatio(result.landmarks.getLeftEye()) + eyeAspectRatio(result.landmarks.getRightEye())) / 2;
        const isClosed = ear < EAR_BLINK_THRESHOLD;

        if (wasClosedRef.current && !isClosed) blinkedRef.current = true;
        wasClosedRef.current = isClosed;

        if (!blinkedRef.current) {
          setStatus('Blink once to continue');
          timerRef.current = setTimeout(tick, 200);
          return;
        }

        if (isClosed) {
          timerRef.current = setTimeout(tick, 200);
          return;
        }

        if (mode === 'login') {
          stop();
          onCapture(Array.from(result.descriptor));
          return;
        }

        const now = Date.now();
        if (now - lastSampleAtRef.current > 700) {
          samplesRef.current.push(result.descriptor);
          lastSampleAtRef.current = now;
        }

        if (samplesRef.current.length >= ENROLL_SAMPLE_COUNT) {
          const averaged = new Array(result.descriptor.length).fill(0) as number[];
          for (const sample of samplesRef.current) {
            for (let i = 0; i < sample.length; i += 1) averaged[i] += sample[i] / samplesRef.current.length;
          }
          stop();
          onCapture(averaged);
          return;
        }

        setStatus(`Captured ${samplesRef.current.length}/${ENROLL_SAMPLE_COUNT} — hold still`);
        timerRef.current = setTimeout(tick, 200);
      };

      timerRef.current = setTimeout(tick, 200);
    }

    start();

    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
