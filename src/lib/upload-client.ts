/**
 * Browser half of the direct-to-Storage upload.
 *
 * The file never passes through a Server Action, so the deployment's 4.5MB
 * request-body ceiling does not apply to artwork any more — only Supabase's
 * own per-file limit does. The Action is then called with the returned path.
 */
import { createUploadTicket } from '@/app/admin/(protected)/upload-actions';
import { browserClient } from '@/lib/supabase/browser';

/**
 * Uploads the untouched original and returns where it landed.
 *
 * Throws with a readable message on failure — callers surface it rather than
 * letting a dead button be the only sign something went wrong.
 */
export async function uploadOriginal(file: File): Promise<string> {
  const ticket = await createUploadTicket();
  if (ticket.error || !ticket.path || !ticket.token) {
    throw new Error(ticket.error ?? 'Could not start the upload.');
  }

  const { error } = await browserClient()
    .storage.from('work')
    .uploadToSignedUrl(ticket.path, ticket.token, file, {
      contentType: file.type || 'application/octet-stream',
    });

  if (error) {
    // The most likely cause by far is Supabase's per-file size limit, which is
    // worth naming: the message it returns on its own ("Payload too large") does
    // not say what the limit is or which file tripped it.
    throw new Error(
      `Upload failed: ${error.message}. Files over the project's storage limit are rejected here.`,
    );
  }

  return ticket.path;
}
