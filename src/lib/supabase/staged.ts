import 'server-only';
import { adminClient } from './admin';

/**
 * The server side of a direct browser upload: fetch what was staged, and clear
 * it up afterwards.
 *
 * Reading the file back inside the function is unbounded — Vercel's 4.5MB cap
 * applies to request bodies, not to what a function fetches for itself — so a
 * 35MB original processes exactly as it did when it was posted directly.
 */

/** Pulls a staged upload into memory for processing. */
export async function readStaged(path: string): Promise<Buffer> {
  const { data, error } = await adminClient().storage.from('work').download(path);
  if (error || !data) {
    throw error ?? new Error(`staged upload missing at ${path}`);
  }
  return Buffer.from(await data.arrayBuffer());
}

/**
 * Deletes a staged upload once it has been processed, or abandoned.
 *
 * Never throws: the real work has already succeeded by the time this runs, and
 * a leftover file in staging/ is a tidiness problem, not a failed save.
 */
export async function discardStaged(path: string): Promise<void> {
  try {
    await adminClient().storage.from('work').remove([path]);
  } catch (error) {
    console.error('[upload] could not remove staged file', path, error);
  }
}

/** Guards against a caller passing a path outside the staging area. */
export function isStagedPath(path: string): boolean {
  return /^staging\/[A-Za-z0-9-]+$/.test(path);
}
