'use server';

import { revalidatePath } from 'next/cache';
import { draftDesignFromImage, type DesignDraft } from '@/lib/ai';
import { processArtwork, processThumbnail } from '@/lib/images';
import { authClient } from '@/lib/supabase/server';

export type DraftState = { draft?: DesignDraft; error?: string };

/**
 * Step 1: reads the image and asks Gemini to propose the gallery fields.
 * Nothing is written anywhere — the result only ever lands in the edit form,
 * which is what actually decides whether it gets saved.
 */
export async function draftDesign(_prev: DraftState, formData: FormData): Promise<DraftState> {
  const file = formData.get('image');
  if (!(file instanceof File) || file.size === 0) {
    return { error: 'Choose an image first.' };
  }

  const notes = String(formData.get('notes') ?? '').trim();
  const title = String(formData.get('title') ?? '').trim();

  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const draft = await draftDesignFromImage(bytes, notes || undefined, title || undefined);
    return { draft };
  } catch (error) {
    console.error('[work] AI drafting failed:', error);
    return { error: 'Could not draft this one automatically — fill the fields in by hand below.' };
  }
}

export type SaveState = { error?: string; slug?: string };

/**
 * Step 2: the admin's own edited fields, plus the same image, become a real
 * row. This is the only place a design actually gets written.
 */
export async function saveDesign(_prev: SaveState, formData: FormData): Promise<SaveState> {
  const supabase = await authClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Session expired — sign in again.' };

  const file = formData.get('image');
  if (!(file instanceof File) || file.size === 0) {
    return { error: 'The image is missing — go back and choose it again.' };
  }

  const title = String(formData.get('title') ?? '').trim();
  const context = String(formData.get('context') ?? '').trim();
  const kind = String(formData.get('kind') ?? '').trim();
  const year = String(formData.get('year') ?? '').trim();
  const alt = String(formData.get('alt') ?? '').trim();
  const publish = formData.get('publish') === 'true';

  if (!title || !context) {
    return { error: 'Title and context are required.' };
  }

  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const [processed, thumb] = await Promise.all([processArtwork(bytes), processThumbnail(bytes)]);

    const baseSlug = slugify(title);
    const slug = await uniqueSlug(baseSlug);
    const path = `designs/${slug}.png`;
    const thumbPath = `designs/${slug}-thumb.webp`;

    const { error: uploadError } = await supabase.storage
      .from('work')
      .upload(path, processed.data, { contentType: 'image/png', upsert: true });
    if (uploadError) throw uploadError;

    const { error: thumbError } = await supabase.storage
      .from('work')
      .upload(thumbPath, thumb, { contentType: 'image/webp', upsert: true });
    if (thumbError) throw thumbError;

    const { count } = await supabase
      .from('designs')
      .select('*', { count: 'exact', head: true });

    const { error: insertError } = await supabase.from('designs').insert({
      slug,
      title,
      context,
      kind: kind || 'Design',
      year: year || String(new Date().getFullYear()),
      ratio: processed.ratio,
      image_path: path,
      thumb_path: thumbPath,
      blur_data_url: processed.blurDataURL,
      alt: alt || `${title} — ${kind || 'design'} for ${context}`,
      published: publish,
      sort_order: count ?? 0,
    });
    if (insertError) throw insertError;

    revalidatePath('/');
    return { slug };
  } catch (error) {
    console.error('[work] save failed:', error);
    return { error: 'Something went wrong saving this — try again.' };
  }
}

export type AttachImageState = { error?: string };

/**
 * Fills (or replaces) the artwork on an existing row — the seeded slots ship
 * with real title/context/kind/year already, so unlike `saveDesign` this
 * never touches metadata, just the image.
 */
export async function attachImage(id: string, formData: FormData): Promise<AttachImageState> {
  const supabase = await authClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Session expired — sign in again.' };

  const file = formData.get('image');
  if (!(file instanceof File) || file.size === 0) {
    return { error: 'Choose an image first.' };
  }

  const { data: row, error: fetchError } = await supabase
    .from('designs')
    .select('slug, image_path, thumb_path')
    .eq('id', id)
    .maybeSingle();
  if (fetchError || !row) return { error: 'Could not find that design.' };

  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const [processed, thumb] = await Promise.all([processArtwork(bytes), processThumbnail(bytes)]);
    const path = `designs/${row.slug}.png`;
    const thumbPath = `designs/${row.slug}-thumb.webp`;

    const { error: uploadError } = await supabase.storage
      .from('work')
      .upload(path, processed.data, { contentType: 'image/png', upsert: true });
    if (uploadError) throw uploadError;

    const { error: thumbError } = await supabase.storage
      .from('work')
      .upload(thumbPath, thumb, { contentType: 'image/webp', upsert: true });
    if (thumbError) throw thumbError;

    // Upsert-by-slug can leave a stale file behind if the old image had a
    // different extension (e.g. an old .webp from before the PNG switch).
    if (row.image_path && row.image_path !== path) {
      await supabase.storage.from('work').remove([row.image_path]).catch(() => {});
    }
    if (row.thumb_path && row.thumb_path !== thumbPath) {
      await supabase.storage.from('work').remove([row.thumb_path]).catch(() => {});
    }

    const { error: updateError } = await supabase
      .from('designs')
      .update({
        image_path: path,
        thumb_path: thumbPath,
        blur_data_url: processed.blurDataURL,
        ratio: processed.ratio,
      })
      .eq('id', id);
    if (updateError) throw updateError;

    revalidatePath('/');
    return {};
  } catch (error) {
    console.error('[work] attach image failed:', error);
    return { error: 'Something went wrong uploading this — try again.' };
  }
}

export type UpdateMetaState = { error?: string };

/** Edits title/context/kind/year on an existing row — never touches the image. */
export async function updateDesignMeta(id: string, formData: FormData): Promise<UpdateMetaState> {
  const supabase = await authClient();

  const title = String(formData.get('title') ?? '').trim();
  const context = String(formData.get('context') ?? '').trim();
  const kind = String(formData.get('kind') ?? '').trim();
  const year = String(formData.get('year') ?? '').trim();

  if (!title || !context) {
    return { error: 'Title and context are required.' };
  }

  const { error } = await supabase
    .from('designs')
    .update({ title, context, kind, year })
    .eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/');
  return {};
}

/** Flips published without touching anything else. */
export async function togglePublish(id: string, next: boolean) {
  const supabase = await authClient();
  const { error } = await supabase.from('designs').update({ published: next }).eq('id', id);
  if (error) throw error;
  revalidatePath('/');
}

/** Removes the row and, best-effort, its stored image and thumbnail. */
export async function deleteDesign(id: string, imagePath: string | null, thumbPath?: string | null) {
  const supabase = await authClient();

  const paths = [imagePath, thumbPath].filter((p): p is string => Boolean(p));
  if (paths.length) {
    // Best-effort: a storage miss shouldn't block removing the row itself.
    await supabase.storage.from('work').remove(paths).catch(() => {});
  }

  const { error } = await supabase.from('designs').delete().eq('id', id);
  if (error) throw error;
  revalidatePath('/');
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/** Appends -2, -3, … until the slug is free, so titles can repeat safely. */
async function uniqueSlug(base: string): Promise<string> {
  const supabase = await authClient();
  let candidate = base || 'untitled';
  let n = 2;
  for (;;) {
    const { data } = await supabase
      .from('designs')
      .select('slug')
      .eq('slug', candidate)
      .maybeSingle();
    if (!data) return candidate;
    candidate = `${base}-${n++}`;
  }
}
