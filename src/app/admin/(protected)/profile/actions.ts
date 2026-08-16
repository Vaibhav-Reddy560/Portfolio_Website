'use server';

import { revalidatePath } from 'next/cache';
import { processPortrait } from '@/lib/images';
import { authClient } from '@/lib/supabase/server';

function csv(value: FormDataEntryValue | null): string[] {
  return String(value ?? '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

function lines(value: FormDataEntryValue | null): string[] {
  return String(value ?? '')
    .split('\n')
    .map((t) => t.trim())
    .filter(Boolean);
}

/** Parses "Label: Value" per line into the facts jsonb shape. */
function parseFacts(value: FormDataEntryValue | null): { label: string; value: string }[] {
  return lines(value)
    .map((line) => {
      const idx = line.indexOf(':');
      if (idx === -1) return null;
      const label = line.slice(0, idx).trim();
      const val = line.slice(idx + 1).trim();
      if (!label || !val) return null;
      return { label, value: val };
    })
    .filter((f): f is { label: string; value: string } => f !== null);
}

export async function updateProfile(_prev: { error?: string }, formData: FormData): Promise<{ error?: string }> {
  const supabase = await authClient();

  const first = String(formData.get('first') ?? '').trim();
  const last = String(formData.get('last') ?? '').trim();
  if (!first || !last) return { error: 'First and last name are required.' };

  const row: Record<string, unknown> = {
    id: true,
    first,
    last,
    eyebrow: csv(formData.get('eyebrow')),
    role: String(formData.get('role') ?? '').trim() || null,
    location: String(formData.get('location') ?? '').trim() || null,
    status: String(formData.get('status') ?? '').trim() || null,
    lede: String(formData.get('lede') ?? '').trim() || null,
    about: lines(formData.get('about')),
    facts: parseFacts(formData.get('facts')),
    interests: csv(formData.get('interests')),
    contact: {
      email: String(formData.get('email') ?? '').trim(),
      phoneParts: [String(formData.get('phone') ?? '').trim()],
      linkedin: String(formData.get('linkedin') ?? '').trim(),
      linkedinLabel: String(formData.get('linkedinLabel') ?? '').trim(),
      easyclub: String(formData.get('easyclub') ?? '').trim(),
      resume: String(formData.get('resume') ?? '').trim(),
    },
  };

  const portrait = formData.get('portrait');
  if (portrait instanceof File && portrait.size > 0) {
    try {
      const bytes = Buffer.from(await portrait.arrayBuffer());
      const processed = await processPortrait(bytes);
      const path = 'profile/portrait.webp';
      const { error: uploadError } = await supabase.storage
        .from('work')
        .upload(path, processed.data, { contentType: 'image/webp', upsert: true });
      if (uploadError) throw uploadError;
      row.portrait_path = path;
      row.portrait_blur = processed.blurDataURL;
    } catch (error) {
      console.error('[profile] portrait processing failed:', error);
      return { error: 'Could not process the portrait image — the rest of the profile was not saved either, try again.' };
    }
  }

  const { error } = await supabase.from('profile').upsert(row, { onConflict: 'id' });
  if (error) return { error: error.message };

  revalidatePath('/');
  revalidatePath('/admin/profile');
  return {};
}
