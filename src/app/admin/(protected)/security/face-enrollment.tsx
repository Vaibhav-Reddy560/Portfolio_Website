'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { FaceCamera, prewarmFaceRecognition, type FaceSample } from '@/components/face-camera';
import { isCameraSupported } from '@/lib/face/support';
import { enrollFace, removeFace } from './actions';

export function FaceEnrollment({
  enrolled,
  enrolledAt,
  viewCount,
}: {
  enrolled: boolean;
  enrolledAt: string | null;
  viewCount: number;
}) {
  const router = useRouter();
  const [capturing, setCapturing] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // Client-only feature detection — see login-form.tsx for why this can't be
  // read directly during render (the server has no navigator.mediaDevices).
  const [cameraSupported, setCameraSupported] = useState<boolean | null>(null);
  useEffect(() => setCameraSupported(isCameraSupported()), []);

  const onCapture = (samples: FaceSample[]) => {
    setCapturing(false);
    startTransition(async () => {
      const result = await enrollFace(samples);
      if (result.error) {
        setError(result.error);
        return;
      }
      setError(null);
      router.refresh();
    });
  };

  const onRemove = () => {
    startTransition(async () => {
      const result = await removeFace();
      setConfirmingRemove(false);
      if (result.error) {
        setError(result.error);
        return;
      }
      setError(null);
      router.refresh();
    });
  };

  if (capturing) {
    return (
      <div className="max-w-sm border border-navy/20 bg-bone-dk p-4">
        <FaceCamera mode="enroll" onCapture={onCapture} onCancel={() => setCapturing(false)} />
      </div>
    );
  }

  return (
    <div className="max-w-sm space-y-3 border border-navy/20 bg-bone-dk p-4">
      <div>
        <p className="t-label text-navy/50">Face ID</p>
        <p className="t-head mt-1 text-lg uppercase">{enrolled ? 'Enabled' : 'Not set up'}</p>
        {enrolled && enrolledAt ? (
          <p className="t-data mt-1 text-[11px] text-navy/50">
            {viewCount} view{viewCount === 1 ? '' : 's'} · scanned{' '}
            {new Date(enrolledAt).toLocaleString()}
          </p>
        ) : null}
      </div>

      {cameraSupported === null ? null : !cameraSupported ? (
        <p className="t-data text-[11px] text-navy/50">
          This device or browser doesn&apos;t expose a camera to the site.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending}
            onPointerEnter={prewarmFaceRecognition}
            onFocus={prewarmFaceRecognition}
            onClick={() => setCapturing(true)}
            className="btn py-1.5 text-[11px]"
          >
            {enrolled ? 'Re-scan my face' : 'Set up Face ID'}
          </button>
          {enrolled && !confirmingRemove ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => setConfirmingRemove(true)}
              className="btn py-1.5 text-[11px]"
            >
              Remove Face ID
            </button>
          ) : null}
          {confirmingRemove ? (
            <>
              <button
                type="button"
                disabled={pending}
                onClick={onRemove}
                className="btn py-1.5 text-[11px] text-rust"
              >
                Confirm remove
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => setConfirmingRemove(false)}
                className="btn py-1.5 text-[11px]"
              >
                Cancel
              </button>
            </>
          ) : null}
        </div>
      )}

      {error ? (
        <p role="alert" className="t-data text-[11px] uppercase tracking-[0.1em] text-rust">
          ⚠ {error}
        </p>
      ) : null}
    </div>
  );
}
