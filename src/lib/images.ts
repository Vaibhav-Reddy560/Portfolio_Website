/**
 * Shared image pipeline.
 *
 * Both the CLI scripts (scripts/*.mjs) and the admin upload action use these,
 * so an image published through the portal gets byte-identical treatment to one
 * processed by hand — same trim, same encoder settings, same halftone screen.
 * Any tuning happens here once rather than drifting between two copies.
 */
import sharp from 'sharp';

export type ProcessedImage = {
  data: Buffer;
  width: number;
  height: number;
  /** width / height — drives the gallery slot so layout never shifts. */
  ratio: number;
  /** Tiny inline WebP for the blur-up placeholder. */
  blurDataURL: string;
  bytes: number;
};

/**
 * Standard artwork treatment: encode losslessly to PNG. No resize, no lossy
 * re-encode, no trim by default — the uploaded pixels reach the gallery
 * completely unchanged, at full resolution and full frame.
 *
 * `trim` is opt-in, off by default. It exists for scans and PDF exports that
 * arrive letterboxed inside a blank page, but the same threshold heuristic
 * will happily eat into a real design that has a large flat-colour area near
 * an edge — which is exactly what it did to real uploads before this default
 * flipped. Only pass `trim: true` for a source you've confirmed is padded.
 */
export async function processArtwork(
  input: Buffer,
  { trim = false } = {},
): Promise<ProcessedImage> {
  let pipeline = sharp(input);

  if (trim) {
    // Fall back to the untrimmed image: trim throws when the whole frame is one
    // colour, and a hard failure here would block an otherwise fine upload.
    const trimmed = await sharp(input)
      .trim({ threshold: 12 })
      .toBuffer()
      .catch(() => null);
    if (trimmed) pipeline = sharp(trimmed);
  }

  const { data, info } = await pipeline
    .png()
    .toBuffer({ resolveWithObject: true });

  const blur = await sharp(data)
    .resize(16, null, { fit: 'inside' })
    .webp({ quality: 40 })
    .toBuffer();

  return {
    data,
    width: info.width,
    height: info.height,
    ratio: Number((info.width / info.height).toFixed(3)),
    blurDataURL: `data:image/webp;base64,${blur.toString('base64')}`,
    bytes: data.length,
  };
}

/** Phosphor colour of the halftone dots. Background stays transparent. */
const AMBER = [0xf0, 0xa0, 0x30] as const;
const SCREEN_ANGLE = Math.PI / 4;
const CELL = 4;

/**
 * Amber-phosphor halftone plate, for the operator portrait.
 *
 * Reduces the source to luminance and re-screens it as a rotated dot field in a
 * single amber. Any colour cast in the original (the green foliage in the
 * current photo) stops existing by construction rather than being masked, and
 * because the output is two colours it compresses losslessly to ~30 KB.
 */
export async function processPortrait(
  input: Buffer,
  { width = 620, crop = true } = {},
): Promise<ProcessedImage> {
  const meta = await sharp(input).metadata();
  let pipeline = sharp(input);

  // Crop to head-and-shoulders. A full-frame photo usually has a brighter
  // background than the subject, which then wins the composition once dithered.
  if (crop && meta.width && meta.height) {
    pipeline = pipeline.extract({
      left: Math.round((meta.width - Math.round(meta.width * 0.62)) / 2),
      top: Math.round(meta.height * 0.02),
      width: Math.round(meta.width * 0.62),
      height: Math.round(meta.height * 0.6),
    });
  }

  const { data: luma, info } = await pipeline
    .flatten({ background: '#0a0d08' })
    .resize({ width, withoutEnlargement: true })
    .grayscale()
    .normalise()
    // Lifts a shadowed face back out before it gets quantised to dots.
    .gamma(1.9)
    .linear(1.05, 4)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const rgba = Buffer.alloc(info.width * info.height * 4);
  const maxRadius = CELL * 0.5 * Math.SQRT2;
  const cos = Math.cos(SCREEN_ANGLE);
  const sin = Math.sin(SCREEN_ANGLE);

  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const lightness = luma[(y * info.width + x) * info.channels] / 255;

      // Rotate into screen space, then find the offset within this dot's cell.
      const u = x * cos + y * sin;
      const v = -x * sin + y * cos;
      const du = (((u % CELL) + CELL) % CELL) - CELL / 2;
      const dv = (((v % CELL) + CELL) % CELL) - CELL / 2;

      // Brighter source => larger dot.
      if (Math.hypot(du, dv) < lightness ** 0.85 * maxRadius) {
        const o = (y * info.width + x) * 4;
        rgba[o] = AMBER[0];
        rgba[o + 1] = AMBER[1];
        rgba[o + 2] = AMBER[2];
        rgba[o + 3] = 255;
      }
      // else: left transparent, so the card's CRT ground shows through.
    }
  }

  // Lossless: the image is two colours, so it stays small, and lossy WebP's
  // chroma subsampling would reintroduce colour fringing on the dot edges.
  const { data, info: out } = await sharp(rgba, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .webp({ lossless: true, effort: 6 })
    .toBuffer({ resolveWithObject: true });

  const blur = await sharp(data)
    .resize(16, null, { fit: 'inside' })
    .webp({ quality: 40 })
    .toBuffer();

  return {
    data,
    width: out.width,
    height: out.height,
    ratio: Number((out.width / out.height).toFixed(3)),
    blurDataURL: `data:image/webp;base64,${blur.toString('base64')}`,
    bytes: data.length,
  };
}

/** URL-safe slug from a title, used for storage paths and lookups. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}
