'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';
import type { DesignDraft } from '@/lib/ai';
import { draftDesign, saveDesign } from '../actions';

/**
 * Calls the server actions directly (via startTransition) rather than binding
 * them through <form action={fn}> + useActionState. A single form swapping
 * its `action` prop between two different useActionState dispatchers across
 * the draft → review steps stopped submitting on the second step in testing
 * — the first click worked, the second silently did nothing, no error, no
 * network request. Direct calls are the same pattern already proven reliable
 * for togglePublish/deleteDesign elsewhere in this admin, and sidestep the
 * issue entirely by not depending on that rebinding at all.
 */
export function NewWorkForm() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const [draft, setDraft] = useState<DesignDraft | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onFileChange = () => {
    const file = fileRef.current?.files?.[0];
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : null;
    });
  };

  const onDraft = () => {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setDraftError('Choose an image first.');
      return;
    }
    setDraftError(null);

    startTransition(async () => {
      const fd = new FormData();
      fd.set('image', file);
      fd.set('title', (document.getElementById('pre-title') as HTMLInputElement)?.value ?? '');
      fd.set('notes', (document.getElementById('notes') as HTMLTextAreaElement)?.value ?? '');
      const result = await draftDesign({}, fd);
      if (result.error) setDraftError(result.error);
      if (result.draft) setDraft(result.draft);
    });
  };

  const onSave = (publish: boolean) => {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setSaveError("The image is missing — go back and choose it again.");
      return;
    }
    setSaveError(null);

    startTransition(async () => {
      const fd = new FormData();
      fd.set('image', file);
      fd.set('title', (document.getElementById('title') as HTMLInputElement)?.value ?? '');
      fd.set('context', (document.getElementById('context') as HTMLInputElement)?.value ?? '');
      fd.set('kind', (document.getElementById('kind') as HTMLInputElement)?.value ?? '');
      fd.set('year', (document.getElementById('year') as HTMLInputElement)?.value ?? '');
      fd.set('alt', (document.getElementById('alt') as HTMLTextAreaElement)?.value ?? '');
      fd.set('publish', String(publish));

      const result = await saveDesign({}, fd);
      if (result.error) {
        setSaveError(result.error);
        return;
      }
      router.push('/admin/work');
      router.refresh();
    });
  };

  return (
    <div className="space-y-5">
      <div className="panel-inset p-4">
        <label className="t-label mb-2 block text-navy/60" htmlFor="image">
          Artwork
        </label>
        <input
          ref={fileRef}
          id="image"
          name="image"
          type="file"
          accept="image/*"
          onChange={onFileChange}
          className={`t-data block w-full text-xs file:mr-3 file:border-2 file:border-navy file:bg-bone file:px-3 file:py-1.5 file:text-[11px] file:uppercase ${
            draft ? 'pointer-events-none opacity-60' : ''
          }`}
        />

        {preview ? (
          <div className="crt relative mt-3 flex max-h-80 items-center justify-center overflow-hidden border-2 border-navy">
            <Image
              src={preview}
              alt=""
              width={400}
              height={400}
              unoptimized
              className="max-h-80 w-auto object-contain"
            />
          </div>
        ) : null}
      </div>

      {!draft ? (
        <div className="panel-inset space-y-4 p-4">
          <div>
            <label className="t-label mb-2 block text-navy/60" htmlFor="pre-title">
              Title (optional)
            </label>
            <input
              id="pre-title"
              name="pre-title"
              type="text"
              placeholder="Leave blank and the AI will propose one from the artwork."
              className="w-full border-2 border-navy/25 bg-bone p-2 text-sm"
            />
          </div>

          <label className="t-label mb-2 block text-navy/60" htmlFor="notes">
            Notes (optional)
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            placeholder="Anything the AI should know — the event, what it's for, a detail it might not read off the image."
            className="w-full border-2 border-navy/25 bg-bone p-2 text-sm"
          />

          {draftError ? (
            <p className="t-data mt-3 text-[11px] uppercase text-rust" role="alert">
              ⚠ {draftError}
            </p>
          ) : null}

          <button type="button" disabled={pending} onClick={onDraft} className="btn btn-primary mt-4">
            {pending ? 'Reading the artwork…' : 'Draft with AI →'}
          </button>
          <p className="t-data mt-2 text-[10px] text-navy/40">
            Reads the image and proposes the fields below. Nothing is saved yet.
          </p>
        </div>
      ) : (
        <div className="panel-inset space-y-4 p-4">
          <p className="t-label text-navy/60">Review — nothing is saved until you choose below</p>

          <Field label="Title" name="title" defaultValue={draft.title} />
          <Field label="Context (event / client)" name="context" defaultValue={draft.context} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Kind" name="kind" defaultValue={draft.kind} />
            <Field label="Year" name="year" defaultValue={draft.year} />
          </div>
          <div>
            <label className="t-label mb-1 block text-navy/60" htmlFor="alt">
              Alt text
            </label>
            <textarea
              id="alt"
              name="alt"
              rows={2}
              defaultValue={draft.alt}
              className="w-full border-2 border-navy/25 bg-bone p-2 text-sm"
            />
          </div>

          {saveError ? (
            <p className="t-data text-[11px] uppercase text-rust" role="alert">
              ⚠ {saveError}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              disabled={pending}
              onClick={() => onSave(true)}
              className="btn btn-primary"
            >
              {pending ? 'Saving…' : 'Publish now'}
            </button>
            <button type="button" disabled={pending} onClick={() => onSave(false)} className="btn">
              Save as draft
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue?: string;
}) {
  return (
    <div>
      <label className="t-label mb-1 block text-navy/60" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        type="text"
        defaultValue={defaultValue}
        className="w-full border-2 border-navy/25 bg-bone p-2 text-sm"
      />
    </div>
  );
}
