'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';
import type { CaseStudyDraft } from '@/lib/ai';
import { normalizeFeatures } from '@/lib/case-study-shape';
import { slugify } from '@/lib/slug';
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

type FeatureRow = { key: string; name: string; summary: string; points: string[] };

let rowCounter = 0;
function newRowKey(): string {
  rowCounter += 1;
  return `row-${rowCounter}-${Date.now()}`;
}

function featuresToRows(pillars: unknown): FeatureRow[] {
  return normalizeFeatures(pillars).map((f) => ({
    key: newRowKey(),
    name: f.name,
    summary: f.summary,
    points: f.points,
  }));
}

/** Everything in `detail` except `pillars` — round-trips through the Advanced box untouched. */
function restOfDetail(detail: unknown): Record<string, unknown> {
  if (!detail || typeof detail !== 'object') return {};
  const { pillars: _pillars, ...rest } = detail as Record<string, unknown>;
  return rest;
}

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

  const [features, setFeatures] = useState<FeatureRow[]>(() =>
    featuresToRows((initial?.detail as { pillars?: unknown } | undefined)?.pillars),
  );
  const [restDetailText] = useState(() =>
    JSON.stringify(restOfDetail(initial?.detail), null, 2),
  );

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
        setFeatures(featuresToRows(result.draft.pillars));
        setShowForm(true);
      }
    });
  };

  const addFeature = () =>
    setFeatures((prev) => [...prev, { key: newRowKey(), name: '', summary: '', points: [] }]);
  const removeFeature = (key: string) =>
    setFeatures((prev) => prev.filter((f) => f.key !== key));
  const updateFeature = (key: string, patch: Partial<FeatureRow>) =>
    setFeatures((prev) => prev.map((f) => (f.key === key ? { ...f, ...patch } : f)));
  const addPoint = (key: string) =>
    setFeatures((prev) =>
      prev.map((f) => (f.key === key ? { ...f, points: [...f.points, ''] } : f)),
    );
  const updatePoint = (key: string, i: number, value: string) =>
    setFeatures((prev) =>
      prev.map((f) =>
        f.key === key ? { ...f, points: f.points.map((p, pi) => (pi === i ? value : p)) } : f,
      ),
    );
  const removePoint = (key: string, i: number) =>
    setFeatures((prev) =>
      prev.map((f) => (f.key === key ? { ...f, points: f.points.filter((_, pi) => pi !== i) } : f)),
    );

  const val = (id: string) => (document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement)?.value ?? '';

  const onSave = (publish: boolean) => {
    let rest: Record<string, unknown> = {};
    const advancedRaw = val('detail-advanced').trim();
    if (advancedRaw) {
      try {
        rest = JSON.parse(advancedRaw) as Record<string, unknown>;
      } catch {
        setSaveError('The advanced detail field is not valid JSON.');
        return;
      }
    }

    const cleanFeatures = features
      .map((f) => ({
        ...f,
        name: f.name.trim(),
        summary: f.summary.trim(),
        points: f.points.map((p) => p.trim()).filter(Boolean),
      }))
      .filter((f) => f.name);

    const mergedDetail: Record<string, unknown> = { ...rest };
    if (cleanFeatures.length) {
      mergedDetail.pillars = cleanFeatures.map((f) => ({
        id: slugify(f.name) || f.key,
        name: f.name,
        summary: f.summary,
        points: f.points,
      }));
    } else {
      delete mergedDetail.pillars;
    }

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
    fd.set('detail', JSON.stringify(mergedDetail));
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
            <div className="flex items-center justify-between">
              <p className="t-label text-navy/60">Features</p>
              <p className="t-data text-[10px] text-navy/40">
                Shown as feature cards on the public case study.
              </p>
            </div>

            {features.length === 0 ? (
              <p className="t-data text-[11px] text-navy/40">No features yet.</p>
            ) : (
              <div className="space-y-3">
                {features.map((f) => (
                  <div key={f.key} className="border-2 border-navy/20 bg-bone p-3">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 space-y-2">
                        <input
                          value={f.name}
                          onChange={(e) => updateFeature(f.key, { name: e.target.value })}
                          placeholder="Feature name"
                          className="w-full border-2 border-navy/25 bg-bone p-2 text-sm font-semibold"
                        />
                        <textarea
                          value={f.summary}
                          onChange={(e) => updateFeature(f.key, { summary: e.target.value })}
                          placeholder="One or two sentences describing it"
                          rows={2}
                          className="w-full border-2 border-navy/25 bg-bone p-2 text-sm"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFeature(f.key)}
                        aria-label="Remove feature"
                        className="btn shrink-0 py-1.5 text-[10px] text-rust"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="mt-2 space-y-1.5 pl-2">
                      {f.points.map((point, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span aria-hidden className="text-rust">▸</span>
                          <input
                            value={point}
                            onChange={(e) => updatePoint(f.key, i, e.target.value)}
                            placeholder="Bullet point"
                            className="w-full border-2 border-navy/20 bg-bone p-1.5 text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => removePoint(f.key, i)}
                            aria-label="Remove point"
                            className="t-data shrink-0 text-[10px] uppercase text-navy/40 hover:text-rust"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addPoint(f.key)}
                        className="t-data text-[10px] uppercase text-navy/50 underline"
                      >
                        + Add bullet
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button type="button" onClick={addFeature} className="btn text-[11px]">
              + Add feature
            </button>
          </div>

          <details className="panel-inset p-4">
            <summary className="t-label cursor-pointer text-navy/60">
              Advanced sections (JSON — modules / providers / engineering)
            </summary>
            <textarea
              id="detail-advanced"
              rows={10}
              defaultValue={restDetailText}
              spellCheck={false}
              className="mt-3 w-full border-2 border-navy/25 bg-bone p-2 font-mono text-xs"
            />
            <p className="t-data mt-2 text-[10px] text-navy/40">
              Feeds the module matrix / provider orchestration sections. Leave as {'{}'} if this
              project only needs features.
            </p>
          </details>

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
              Featured — gets an expanded case-study section on the homepage
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
