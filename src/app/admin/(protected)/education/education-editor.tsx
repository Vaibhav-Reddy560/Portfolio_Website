'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { createEducation, deleteEducation, updateEducation } from './actions';

export type EducationRow = {
  id: string;
  qualification: string;
  institution: string;
  period: string | null;
  place: string | null;
  is_current: boolean;
  sort_order: number;
};

export function EducationEditor({ rows }: { rows: EducationRow[] }) {
  const [adding, setAdding] = useState(false);

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <Row key={row.id} row={row} />
      ))}

      {adding ? (
        <Row row={null} onDone={() => setAdding(false)} />
      ) : (
        <button type="button" onClick={() => setAdding(true)} className="btn text-[11px]">
          + Add entry
        </button>
      )}
    </div>
  );
}

function Row({ row, onDone }: { row: EducationRow | null; onDone?: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const isNew = row === null;
  const key = row?.id ?? 'new';

  const onSave = () => {
    const fd = new FormData();
    fd.set('qualification', (document.getElementById(`qual-${key}`) as HTMLInputElement)?.value ?? '');
    fd.set('institution', (document.getElementById(`inst-${key}`) as HTMLInputElement)?.value ?? '');
    fd.set('period', (document.getElementById(`period-${key}`) as HTMLInputElement)?.value ?? '');
    fd.set('place', (document.getElementById(`place-${key}`) as HTMLInputElement)?.value ?? '');
    fd.set('is_current', String((document.getElementById(`current-${key}`) as HTMLInputElement)?.checked ?? false));
    fd.set('sort_order', String((document.getElementById(`sort-${key}`) as HTMLInputElement)?.value ?? row?.sort_order ?? 0));

    setError(null);
    startTransition(async () => {
      const result = isNew ? await createEducation(fd) : await updateEducation(row.id, fd);
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
    if (!confirm(`Delete "${row.qualification}"? This can't be undone.`)) return;
    startTransition(async () => {
      await deleteEducation(row.id);
      router.refresh();
    });
  };

  return (
    <div className="panel-inset space-y-3 p-4">
      <Field id={`qual-${key}`} label="Qualification" defaultValue={row?.qualification} />
      <Field id={`inst-${key}`} label="Institution" defaultValue={row?.institution} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id={`period-${key}`} label="Period" defaultValue={row?.period ?? ''} />
        <Field id={`place-${key}`} label="Place" defaultValue={row?.place ?? ''} />
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="w-28">
          <Field id={`sort-${key}`} label="Sort order" defaultValue={String(row?.sort_order ?? 0)} type="number" />
        </div>
        <label className="t-data flex items-center gap-1.5 text-[11px] uppercase text-navy/60">
          <input id={`current-${key}`} type="checkbox" defaultChecked={row?.is_current ?? false} className="h-3.5 w-3.5" />
          Currently studying
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
