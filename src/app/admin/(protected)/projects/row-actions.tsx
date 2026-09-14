'use client';

import { useRouter } from 'next/navigation';
import { useOptimistic, useTransition } from 'react';
import { deleteProject, togglePublish } from './actions';

/**
 * Flips the label the instant it's clicked instead of sitting on "…" for the
 * round trip — `useOptimistic` re-bases to the real `published` prop once
 * `router.refresh()` brings fresh data back, so a failed request reverts
 * automatically rather than lying about the outcome.
 */
export function PublishToggle({ id, published }: { id: string; published: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [optimisticPublished, setOptimisticPublished] = useOptimistic(published);

  const onClick = () => {
    const next = !optimisticPublished;
    startTransition(async () => {
      setOptimisticPublished(next);
      await togglePublish(id, next);
      router.refresh();
    });
  };

  return (
    <button type="button" disabled={pending} onClick={onClick} className="btn py-1 text-[10px]">
      {optimisticPublished ? 'Unpublish' : 'Publish'}
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
