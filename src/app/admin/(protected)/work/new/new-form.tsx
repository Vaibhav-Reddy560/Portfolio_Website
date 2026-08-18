'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';
import type { DesignDraft } from '@/lib/ai';
import { draftDesign, saveDesign } from '../actions';

const KNOWN_KINDS = [
  'Event poster',
  'Poster series',
  'Certificate',
  'Badge system',
  'Identity graphic',
  'Type lockup',
  'Product poster',
  'Speaker session',
  'Teaser poster',
  'Workshop poster',
  'Hackathon poster',
];

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
  const [showForm, setShowForm] = useState(false);
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
      if (result.error) {
        setDraftError(result.error);
        return;
      }
      if (result.draft) setDraft(result.draft);
      setShowForm(true);
    });
  };

  const onSkip = () => {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setDraftError('Choose an image first.');
      return;
    }
    setDraftError(null);
    setShowForm(true);
  };

  const onSave = (publish: boolean) => {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setSaveError("The image is missing — go back and choose it again.");
      return;
    }

    const title = (document.getElementById('title') as HTMLInputElement)?.value ?? '';
    const context = (document.getElementById('context') as HTMLInputElement)?.value ?? '';
    if (!title.trim() || !context.trim()) {
      setSaveError('Title and context are required.');
      return;
    }
    setSaveError(null);

    startTransition(async () => {
      const fd = new FormData();
      fd.set('image', file);
      fd.set('title', title);
      fd.set('context', context);
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

  const thisYear = new Date().getFullYear();

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
            showForm ? 'pointer-events-none opacity-60' : ''
          }`}
        />

        {preview ? (
          <div className="relative mt-3 flex max-h-80 items-center justify-center overflow-hidden border-2 border-navy bg-crt">
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

      {!showForm ? (
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

          <div className="flex flex-wrap gap-2 pt-1">
            <button type="button" disabled={pending} onClick={onDraft} className="btn btn-primary">
              {pending ? 'Reading the artwork…' : 'Draft with AI →'}
            </button>
            <button type="button" disabled={pending} onClick={onSkip} className="btn">
              Skip — fill in by hand
            </button>
          </div>
          <p className="t-data mt-2 text-[10px] text-navy/40">
            AI drafting is optional — reads the image and proposes the fields below. Nothing is
            saved until you publish or save as draft.
          </p>
        </div>
      ) : (
        <div className="panel-inset space-y-4 p-4">
          <p className="t-label text-navy/60">Review — nothing is saved until you choose below</p>

          <Field label="Title" name="title" defaultValue={draft?.title} />
          <Field label="Context (event / client)" name="context" defaultValue={draft?.context} />
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="t-label mb-1 block text-navy/60" htmlFor="kind">
                Kind
              </label>
              <input
                id="kind"
                name="kind"
                type="text"
                list="kind-options"
                defaultValue={draft?.kind}
                placeholder="e.g. Event poster"
                className="w-full border-2 border-navy/25 bg-bone p-2 text-sm"
              />
              <datalist id="kind-options">
                {KNOWN_KINDS.map((k) => (
                  <option key={k} value={k} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="t-label mb-1 block text-navy/60" htmlFor="year">
                Year
              </label>
              <input
                id="year"
                name="year"
                type="number"
                inputMode="numeric"
                min={2000}
                max={2100}
                step={1}
                defaultValue={draft?.year ?? String(thisYear)}
                className="w-full border-2 border-navy/25 bg-bone p-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="t-label mb-1 block text-navy/60" htmlFor="alt">
              Alt text
            </label>
            <textarea
              id="alt"
              name="alt"
              rows={2}
              defaultValue={draft?.alt}
              placeholder="Describe the artwork for screen readers."
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
