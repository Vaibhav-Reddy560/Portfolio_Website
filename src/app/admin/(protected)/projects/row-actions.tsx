'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { deleteProject, togglePublish } from './actions';

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

export function DeleteButton({ id, imagePath, name }: { id: string; imagePath: string | null; name: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm(`Delete "${name}"? This can't be undone.`)) return;
        startTransition(async () => {
          await deleteProject(id, imagePath);
          router.refresh();
        });
      }}
      className="btn py-1 text-[10px] text-rust"
    >
      {pending ? '…' : 'Delete'}
    </button>
  );
}
