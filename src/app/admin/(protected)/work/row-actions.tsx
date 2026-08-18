'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';
import { attachImage, deleteDesign, togglePublish, updateDesignMeta } from './actions';

export type DesignMeta = {
  id: string;
  title: string;
  context: string;
  kind: string;
  year: string;
};

export function EditableMeta({ design }: { design: DesignMeta }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!editing) {
    return (
      <div className="min-w-0">
        <p className="t-head truncate text-sm uppercase leading-tight">{design.title}</p>
        <p className="t-data mt-1 truncate text-[10px] uppercase tracking-[0.1em] text-navy/55">
          {design.context} · {design.kind} · {design.year}
        </p>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="t-data mt-1 text-[9px] uppercase text-navy/45 underline"
        >
          Edit details
        </button>
      </div>
    );
  }

  const field = (name: string) =>
    (document.getElementById(`edit-${name}-${design.id}`) as HTMLInputElement)?.value ?? '';

  const onSave = () => {
    const fd = new FormData();
    fd.set('title', field('title'));
    fd.set('context', field('context'));
    fd.set('kind', field('kind'));
    fd.set('year', field('year'));

    setError(null);
    startTransition(async () => {
      const result = await updateDesignMeta(design.id, fd);
      if (result.error) {
        setError(result.error);
        return;
      }
      setEditing(false);
      router.refresh();
    });
  };

  return (
    <div className="space-y-1.5">
      <input
        id={`edit-title-${design.id}`}
        defaultValue={design.title}
        placeholder="Title"
        className="w-full border-2 border-navy/25 bg-bone p-1 text-xs"
      />
      <input
        id={`edit-context-${design.id}`}
        defaultValue={design.context}
        placeholder="Context"
        className="w-full border-2 border-navy/25 bg-bone p-1 text-xs"
      />
      <div className="grid grid-cols-2 gap-1.5">
        <input
          id={`edit-kind-${design.id}`}
          defaultValue={design.kind}
          placeholder="Kind"
          className="border-2 border-navy/25 bg-bone p-1 text-xs"
        />
        <input
          id={`edit-year-${design.id}`}
          defaultValue={design.year}
          placeholder="Year"
          className="border-2 border-navy/25 bg-bone p-1 text-xs"
        />
      </div>

      {error ? (
        <p className="t-data text-[9px] uppercase text-rust" role="alert">
          ⚠ {error}
        </p>
      ) : null}

      <div className="flex gap-1.5">
        <button type="button" disabled={pending} onClick={onSave} className="btn py-1 text-[9px]">
          {pending ? '…' : 'Save'}
        </button>
        <button type="button" onClick={() => setEditing(false)} className="btn py-1 text-[9px]">
          Cancel
        </button>
      </div>
    </div>
  );
}

export function AttachImageButton({ id, hasImage }: { id: string; hasImage: boolean }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onChange = () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set('image', file);
      const result = await attachImage(id, fd);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <span className="inline-flex flex-col gap-1">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={onChange}
        className="hidden"
      />
      <button
        type="button"
        disabled={pending}
        onClick={() => fileRef.current?.click()}
        className="btn py-1 text-[10px]"
      >
        {pending ? 'Uploading…' : hasImage ? 'Replace image' : 'Add image'}
      </button>
      {error ? (
        <span className="t-data text-[9px] uppercase text-rust" role="alert">
          ⚠ {error}
        </span>
      ) : null}
    </span>
  );
}

export function PublishToggle({ id, published }: { id: string; published: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await togglePublish(id, !published);
          router.refresh();
        })
      }
      className="btn py-1 text-[10px]"
    >
      {pending ? '…' : published ? 'Unpublish' : 'Publish'}
    </button>
  );
}

export function DeleteButton({
  id,
  imagePath,
  thumbPath,
  title,
}: {
  id: string;
  imagePath: string | null;
  thumbPath?: string | null;
  title: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm(`Delete "${title}"? This can't be undone.`)) return;
        startTransition(async () => {
          await deleteDesign(id, imagePath, thumbPath);
          router.refresh();
        });
      }}
      className="btn py-1 text-[10px] text-rust"
    >
      {pending ? '…' : 'Delete'}
    </button>
  );
}
