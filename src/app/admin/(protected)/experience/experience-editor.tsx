'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { createExperience, deleteExperience, updateExperience } from './actions';

export type ExperienceRow = {
  id: string;
  title: string;
  org: string;
  sub: string | null;
  start_label: string | null;
  end_label: string | null;
  detail: string | null;
  tags: string[];
  is_additional: boolean;
  published: boolean;
  sort_order: number;
};

export function ExperienceEditor({ rows, isAdditional }: { rows: ExperienceRow[]; isAdditional: boolean }) {
  const [adding, setAdding] = useState(false);

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <Row key={row.id} row={row} isAdditional={isAdditional} />
      ))}

      {adding ? (
        <Row
          row={null}
          isAdditional={isAdditional}
          onDone={() => setAdding(false)}
        />
      ) : (
        <button type="button" onClick={() => setAdding(true)} className="btn text-[11px]">
          + Add {isAdditional ? 'role' : 'entry'}
        </button>
      )}
    </div>
  );
}

function Row({
  row,
  isAdditional,
  onDone,
}: {
  row: ExperienceRow | null;
  isAdditional: boolean;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const isNew = row === null;

  const onSave = () => {
    const fd = new FormData();
    fd.set('title', (document.getElementById(`title-${row?.id ?? 'new'}`) as HTMLInputElement)?.value ?? '');
    fd.set('org', (document.getElementById(`org-${row?.id ?? 'new'}`) as HTMLInputElement)?.value ?? '');
    if (!isAdditional) {
      fd.set('sub', (document.getElementById(`sub-${row?.id ?? 'new'}`) as HTMLInputElement)?.value ?? '');
      fd.set('start_label', (document.getElementById(`start-${row?.id ?? 'new'}`) as HTMLInputElement)?.value ?? '');
      fd.set('end_label', (document.getElementById(`end-${row?.id ?? 'new'}`) as HTMLInputElement)?.value ?? '');
      fd.set('detail', (document.getElementById(`detail-${row?.id ?? 'new'}`) as HTMLTextAreaElement)?.value ?? '');
      fd.set('tags', (document.getElementById(`tags-${row?.id ?? 'new'}`) as HTMLInputElement)?.value ?? '');
    }
    fd.set('sort_order', String((document.getElementById(`sort-${row?.id ?? 'new'}`) as HTMLInputElement)?.value ?? row?.sort_order ?? 0));
    fd.set('published', String((document.getElementById(`published-${row?.id ?? 'new'}`) as HTMLInputElement)?.checked ?? true));
    fd.set('is_additional', String(isAdditional));

    setError(null);
    startTransition(async () => {
      const result = isNew ? await createExperience(fd) : await updateExperience(row.id, fd);
      if (result.error) {
        setError(result.error);
        return;
      }
      onDone?.();
      router.refresh();
    });
  };

  const onDelete = () => {
    if (!row) return;
    if (!confirm(`Delete "${row.title}"? This can't be undone.`)) return;
    startTransition(async () => {
      await deleteExperience(row.id);
      router.refresh();
    });
  };

  const key = row?.id ?? 'new';

  return (
    <div className="panel-inset space-y-3 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id={`title-${key}`} label={isAdditional ? 'Role' : 'Title'} defaultValue={row?.title} />
        <Field id={`org-${key}`} label="Organisation" defaultValue={row?.org} />
      </div>

      {!isAdditional ? (
        <>
          <Field id={`sub-${key}`} label="Sub-line (optional)" defaultValue={row?.sub ?? ''} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id={`start-${key}`} label="Start" defaultValue={row?.start_label ?? ''} />
            <Field id={`end-${key}`} label="End" defaultValue={row?.end_label ?? ''} />
          </div>
          <div>
            <label className="t-label mb-1 block text-navy/60" htmlFor={`detail-${key}`}>
              Detail
            </label>
            <textarea
              id={`detail-${key}`}
              rows={3}
              defaultValue={row?.detail ?? ''}
              className="w-full border-2 border-navy/25 bg-bone p-2 text-sm"
            />
          </div>
          <Field id={`tags-${key}`} label="Tags (comma separated)" defaultValue={row?.tags.join(', ') ?? ''} />
        </>
      ) : null}

      <div className="flex flex-wrap items-center gap-4">
        <div className="w-28">
          <Field id={`sort-${key}`} label="Sort order" defaultValue={String(row?.sort_order ?? 0)} type="number" />
        </div>
        <label className="t-data flex items-center gap-1.5 text-[11px] uppercase text-navy/60">
          <input
            id={`published-${key}`}
            type="checkbox"
            defaultChecked={row?.published ?? true}
            className="h-3.5 w-3.5"
          />
          Published
        </label>
      </div>

      {error ? (
        <p className="t-data text-[11px] uppercase text-rust" role="alert">
          ⚠ {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2 pt-1">
        <button type="button" disabled={pending} onClick={onSave} className="btn py-1 text-[11px]">
          {pending ? '…' : isNew ? 'Add' : 'Save'}
        </button>
        {isNew ? (
          <button type="button" onClick={onDone} className="btn py-1 text-[11px]">
            Cancel
          </button>
        ) : (
          <button type="button" disabled={pending} onClick={onDelete} className="btn py-1 text-[11px] text-rust">
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  defaultValue,
  type = 'text',
}: {
  id: string;
  label: string;
  defaultValue?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="t-label mb-1 block text-navy/60" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type={type}
        defaultValue={defaultValue}
        className="w-full border-2 border-navy/25 bg-bone p-2 text-sm"
      />
    </div>
  );
}
