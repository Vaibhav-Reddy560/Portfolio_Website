/**
 * Browser-side downscaling, so a full-resolution poster never has to travel to
 * a Server Action.
 *
 * Vercel rejects any request body over 4.5MB at the platform edge, with a 413
 * the Action never sees — the function does not run, so no try/catch inside it
 * can report anything. The design originals here are 10–35MB, which is why
 * "Draft with AI" failed on the deployed admin while working locally, where no
 * such limit exists.
 *
 * Nothing is lost by shrinking: src/lib/ai.ts already resizes to 1600px before
 * sending anything to Gemini, and the saved artwork still comes from the
 * untouched original the operator picked. This copy exists only to be read by
 * the model.
 */

/** Matches the server-side resize in src/lib/ai.ts — above this, detail is wasted on the model. */
const MAX_EDGE = 1600;
const QUALITY = 0.82;

/**
 * Returns a JPEG copy bounded to MAX_EDGE, or the original file when it is
 * already small and in a format the model reads directly.
 *
 * Throws only if the browser cannot decode the image at all, which the caller
 * reports rather than letting a 413 surface as an unexplained failure.
 */
export async function downscaleForDrafting(file: File): Promise<File> {
  // Small files cost nothing to send as-is, and keeping the original bytes
  // avoids a needless re-encode of something already compact.
  if (file.size <= 1_500_000) return file;

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) {
    bitmap.close();
    throw new Error('Canvas 2D context unavailable');
  }
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', QUALITY),
  );
  if (!blob) throw new Error('Could not encode the resized image');

  return new File([blob], `${file.name.replace(/\.[^.]+$/, '')}-preview.jpg`, {
    type: 'image/jpeg',
    lastModified: file.lastModified,
  });
}
