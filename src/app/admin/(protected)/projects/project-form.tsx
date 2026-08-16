'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';
import type { CaseStudyDraft } from '@/lib/ai';
import { draftProject, saveProject } from './actions';

export type ProjectInitial = {
  id: string;
  name: string;
  tagline: string;
  year: string;
  href: string;
  hrefLabel: string;
  summary: string;
  thesis: string;
  stack: string[];
  note: string;
  detail: unknown;
  published: boolean;
  featured: boolean;
  imageUrl: string | null;
};

/**
 * One form, two entry points. New projects start on a notes → AI draft step
 * (same pattern as the work uploader); editing an existing project skips
 * straight to the fields since there's nothing to draft.
 */
export function ProjectForm({ initial }: { initial?: ProjectInitial }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const [draft, setDraft] = useState<CaseStudyDraft | null>(null);
  const [showForm, setShowForm] = useState(!!initial);
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
    const notes = (document.getElementById('notes') as HTMLTextAreaElement)?.value ?? '';
    if (!notes.trim()) {
      setDraftError('Add a few notes first.');
      return;
    }
    setDraftError(null);

    startTransition(async () => {
      const fd = new FormData();
      fd.set('notes', notes);
      const result = await draftProject({}, fd);
      if (result.error) setDraftError(result.error);
      if (result.draft) {
        setDraft(result.draft);
        setShowForm(true);
      }
    });
  };

  const val = (id: string) => (document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement)?.value ?? '';

  const onSave = (publish: boolean) => {
    const fd = new FormData();
    if (initial) fd.set('id', initial.id);
    fd.set('name', val('name'));
    fd.set('tagline', val('tagline'));
    fd.set('year', val('year'));
    fd.set('href', val('href'));
    fd.set('hrefLabel', val('hrefLabel'));
    fd.set('summary', val('summary'));
    fd.set('thesis', val('thesis'));
    fd.set('stack', val('stack'));
    fd.set('note', val('note'));
    fd.set('detail', val('detail'));
    fd.set('published', String(publish));
    fd.set('featured', String((document.getElementById('featured') as HTMLInputElement)?.checked ?? false));

    const file = fileRef.current?.files?.[0];
    if (file) fd.set('image', file);

    setSaveError(null);
    startTransition(async () => {
      const result = await saveProject({}, fd);
      if (result.error) {
        setSaveError(result.error);
        return;
      }
      router.push('/admin/projects');
      router.refresh();
    });
  };

  const detailJson = initial ? JSON.stringify(initial.detail ?? {}, null, 2) : draftPillarsToDetail(draft);

  return (
    <div className="space-y-5">
      {!showForm ? (
        <div className="panel-inset space-y-4 p-4">
          <label className="t-label mb-1 block text-navy/60" htmlFor="notes">
            Notes about the project
          </label>
          <textarea
            id="notes"
            rows={8}
            placeholder="What it is, who it's for, the stack, the standout features — write it however it comes out, the AI will structure it."
            className="w-full border-2 border-navy/25 bg-bone p-2 text-sm"
          />

          {draftError ? (
            <p className="t-data text-[11px] uppercase text-rust" role="alert">
              ⚠ {draftError}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={pending} onClick={onDraft} className="btn btn-primary">
              {pending ? 'Reading the notes…' : 'Draft with AI →'}
            </button>
            <button type="button" onClick={() => setShowForm(true)} className="btn">
              Skip — fill in by hand
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="panel-inset space-y-3 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field id="name" label="Name" defaultValue={initial?.name ?? draft?.name} />
              <Field id="tagline" label="Tagline" defaultValue={initial?.tagline ?? draft?.tagline} />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field id="year" label="Year" defaultValue={initial?.year} />
              <Field id="href" label="Link URL" defaultValue={initial?.href} />
              <Field id="hrefLabel" label="Link label" defaultValue={initial?.hrefLabel} />
            </div>
            <Field id="stack" label="Stack (comma separated)" defaultValue={(initial?.stack ?? draft?.stack ?? []).join(', ')} />
            <TextArea id="summary" label="Summary" rows={3} defaultValue={initial?.summary} />
            <TextArea id="thesis" label="Thesis" rows={3} defaultValue={initial?.thesis ?? draft?.thesis} />
            <Field id="note" label="Standout note (optional)" defaultValue={initial?.note ?? draft?.note} />
          </div>

          <div className="panel-inset space-y-3 p-4">
            <label className="t-label mb-1 block text-navy/60" htmlFor="detail">
              Case study detail (JSON — pillars / modules / providers / engineering)
            </label>
            <textarea
              id="detail"
              rows={12}
              defaultValue={detailJson}
              spellCheck={false}
              className="w-full border-2 border-navy/25 bg-bone p-2 font-mono text-xs"
            />
            <p className="t-data text-[10px] text-navy/40">
              Feeds the expanded case-study view for projects that have one. Leave as {'{}'} for a plain project card.
            </p>
          </div>

          <div className="panel-inset space-y-3 p-4">
            <label className="t-label mb-1 block text-navy/60" htmlFor="image">
              Product image (optional)
            </label>
            <input
              ref={fileRef}
              id="image"
              type="file"
              accept="image/*"
              onChange={onFileChange}
              className="t-data block w-full text-xs file:mr-3 file:border-2 file:border-navy file:bg-bone file:px-3 file:py-1.5 file:text-[11px] file:uppercase"
            />
            {(preview ?? initial?.imageUrl) ? (
              <div className="crt relative mt-2 flex max-h-64 items-center justify-center overflow-hidden border-2 border-navy">
                <Image
                  src={preview ?? initial?.imageUrl ?? ''}
                  alt=""
                  width={400}
                  height={300}
                  unoptimized
                  className="max-h-64 w-auto object-contain"
                />
              </div>
            ) : null}

            <label className="t-data flex items-center gap-1.5 text-[11px] uppercase text-navy/60">
              <input id="featured" type="checkbox" defaultChecked={initial?.featured ?? false} className="h-3.5 w-3.5" />
              Featured
            </label>
          </div>

          {saveError ? (
            <p className="t-data text-[11px] uppercase text-rust" role="alert">
              ⚠ {saveError}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={pending} onClick={() => onSave(true)} className="btn btn-primary">
              {pending ? 'Saving…' : initial?.published ? 'Save (published)' : 'Publish now'}
            </button>
            <button type="button" disabled={pending} onClick={() => onSave(false)} className="btn">
              Save as draft
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function draftPillarsToDetail(draft: CaseStudyDraft | null): string {
  if (!draft) return '{}';
  return JSON.stringify({ pillars: draft.pillars }, null, 2);
}

function Field({ id, label, defaultValue }: { id: string; label: string; defaultValue?: string }) {
  return (
    <div>
      <label className="t-label mb-1 block text-navy/60" htmlFor={id}>
        {label}
      </label>
      <input id={id} type="text" defaultValue={defaultValue} className="w-full border-2 border-navy/25 bg-bone p-2 text-sm" />
    </div>
  );
}

function TextArea({ id, label, rows, defaultValue }: { id: string; label: string; rows: number; defaultValue?: string }) {
  return (
    <div>
      <label className="t-label mb-1 block text-navy/60" htmlFor={id}>
        {label}
      </label>
      <textarea id={id} rows={rows} defaultValue={defaultValue} className="w-full border-2 border-navy/25 bg-bone p-2 text-sm" />
    </div>
  );
}
