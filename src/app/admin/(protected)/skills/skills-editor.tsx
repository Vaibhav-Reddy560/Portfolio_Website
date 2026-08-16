'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { createSkillGroup, deleteSkillGroup, updateSkillGroup } from './actions';

export type SkillGroupRow = {
  id: string;
  group_key: string;
  label: string;
  discipline: string;
  items: string[];
  sort_order: number;
};

const DISCIPLINES = ['design', 'build', 'lead'] as const;

export function SkillsEditor({ rows }: { rows: SkillGroupRow[] }) {
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
          + Add skill group
        </button>
      )}
    </div>
  );
}

function Row({ row, onDone }: { row: SkillGroupRow | null; onDone?: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const isNew = row === null;
  const key = row?.id ?? 'new';

  const onSave = () => {
    const fd = new FormData();
    fd.set('group_key', (document.getElementById(`key-${key}`) as HTMLInputElement)?.value ?? '');
    fd.set('label', (document.getElementById(`label-${key}`) as HTMLInputElement)?.value ?? '');
    fd.set('discipline', (document.getElementById(`discipline-${key}`) as HTMLSelectElement)?.value ?? 'lead');
    fd.set('items', (document.getElementById(`items-${key}`) as HTMLInputElement)?.value ?? '');
    fd.set('sort_order', String((document.getElementById(`sort-${key}`) as HTMLInputElement)?.value ?? row?.sort_order ?? 0));

    setError(null);
    startTransition(async () => {
      const result = isNew ? await createSkillGroup(fd) : await updateSkillGroup(row.id, fd);
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
    if (!confirm(`Delete "${row.label}"? This can't be undone.`)) return;
    startTransition(async () => {
      await deleteSkillGroup(row.id);
      router.refresh();
    });
  };

  return (
    <div className="panel-inset space-y-3 p-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field id={`key-${key}`} label="Key (e.g. design)" defaultValue={row?.group_key} />
        <Field id={`label-${key}`} label="Label" defaultValue={row?.label} />
        <div>
          <label className="t-label mb-1 block text-navy/60" htmlFor={`discipline-${key}`}>
            Discipline
          </label>
          <select
            id={`discipline-${key}`}
            defaultValue={row?.discipline ?? 'lead'}
            className="w-full border-2 border-navy/25 bg-bone p-2 text-sm"
          >
            {DISCIPLINES.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Field id={`items-${key}`} label="Items (comma separated)" defaultValue={row?.items.join(', ') ?? ''} />

      <div className="w-28">
        <Field id={`sort-${key}`} label="Sort order" defaultValue={String(row?.sort_order ?? 0)} type="number" />
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
