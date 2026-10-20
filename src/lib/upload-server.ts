import 'server-only';
import { discardStaged, isStagedPath, readStaged } from './supabase/staged';

export type UploadSource = {
  bytes: Buffer;
  /** Clears the staging copy once the real artwork has been written. */
  cleanup: () => Promise<void>;
};

/**
 * Resolves whichever way the image arrived into bytes to process.
 *
 * Normally that is `stagedPath`: the browser has already pushed the original
 * straight into Storage, so only the path travelled through the Action and no
 * size limit was involved. A posted File is still accepted — it keeps small
 * uploads working if the direct upload is unavailable — but anything over
 * 4.5MB never reaches here that way, which is the whole reason staging exists.
 */
export async function readUploadedImage(
  formData: FormData,
): Promise<UploadSource | { error: string }> {
  const staged = String(formData.get('stagedPath') ?? '').trim();

  if (staged) {
    // The path comes from the client, so it is checked rather than trusted:
    // only the staging area, and only the shape createUploadTicket mints.
    if (!isStagedPath(staged)) {
      return { error: 'That upload could not be verified — choose the file again.' };
    }
    try {
      return { bytes: await readStaged(staged), cleanup: () => discardStaged(staged) };
    } catch (error) {
      console.error('[upload] could not read staged upload:', error);
      return { error: 'The uploaded file could not be read — try uploading it again.' };
    }
  }

  const file = formData.get('image');
  if (file instanceof File && file.size > 0) {
    return { bytes: Buffer.from(await file.arrayBuffer()), cleanup: async () => {} };
  }

  return { error: 'Choose an image first.' };
}
