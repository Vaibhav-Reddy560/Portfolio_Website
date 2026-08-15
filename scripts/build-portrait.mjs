/**
 * Turns the source portrait into an amber-phosphor halftone plate.
 *
 * The source photo has heavy green palm foliage behind the subject, which fights
 * the bone/blueprint/amber palette. Rather than masking it, the image is reduced
 * to luminance and re-screened as a rotated halftone dot field in a single amber
 * — the green stops existing by construction, and the result reads as a portrait
 * on a CRT rather than a photo pasted onto one.
 *
 * Baking the halftone (instead of overlaying dots in CSS) also collapses the
 * image to two colours, so lossless WebP lands around 30 KB — roughly a fifth of
 * what a lossy continuous-tone version cost, with no colour-fringing artifacts.
 *
 * Usage: node scripts/build-portrait.mjs [source] [outName]
 */
import path from 'node:path';
import sharp from 'sharp';

const SRC = process.argv[2] ?? path.join(process.cwd(), 'public', 'image-1.png');
const OUT = path.join(process.cwd(), 'public', process.argv[3] ?? 'portrait-amber.webp');

/** Phosphor colour of the dots. Background stays transparent. */
const AMBER = [0xf0, 0xa0, 0x30];

/** Screen angle and cell size, in the tradition of a real halftone screen. */
const ANGLE = Math.PI / 4;
const CELL = 4;

const meta = await sharp(SRC).metadata();

// Crop to head-and-shoulders. Uncropped, the sunlit foliage is brighter than the
// subject and wins the composition; this makes the face the subject it should be.
const cropW = Math.round(meta.width * 0.62);
const cropX = Math.round((meta.width - cropW) / 2);
const cropY = Math.round(meta.height * 0.02);
const cropH = Math.round(meta.height * 0.6);

const { data: luma, info } = await sharp(SRC)
  .extract({ left: cropX, top: cropY, width: cropW, height: cropH })
  .flatten({ background: '#0a0d08' })
  .resize({ width: 620, withoutEnlargement: true })
  .grayscale()
  .normalise()
  // The face sits in shadow relative to the background; this lifts it back out
  // so it still reads once quantised to dots.
  .gamma(1.9)
  .linear(1.05, 4)
  .raw()
  .toBuffer({ resolveWithObject: true });

const { width, height, channels } = info;
const rgba = Buffer.alloc(width * height * 4);
const maxRadius = CELL * 0.5 * Math.SQRT2;
const cos = Math.cos(ANGLE);
const sin = Math.sin(ANGLE);

for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const lightness = luma[(y * width + x) * channels] / 255;

    // Rotate into screen space, then find this pixel's offset within its cell.
    const u = x * cos + y * sin;
    const v = -x * sin + y * cos;
    const du = (((u % CELL) + CELL) % CELL) - CELL / 2;
    const dv = (((v % CELL) + CELL) % CELL) - CELL / 2;

    // Brighter source => larger dot.
    if (Math.hypot(du, dv) < lightness ** 0.85 * maxRadius) {
      const o = (y * width + x) * 4;
      rgba[o] = AMBER[0];
      rgba[o + 1] = AMBER[1];
      rgba[o + 2] = AMBER[2];
      rgba[o + 3] = 255;
    }
    // else: left transparent, so the card's own CRT ground shows through.
  }
}

const out = await sharp(rgba, { raw: { width, height, channels: 4 } })
  .webp({ lossless: true, effort: 6 })
  .toFile(OUT);

console.log(`source   ${meta.width}x${meta.height}`);
console.log(`cropped  ${cropW}x${cropH} at ${cropX},${cropY}`);
console.log(`written  ${path.relative(process.cwd(), OUT)}`);
console.log(`         ${out.width}x${out.height}  ${(out.size / 1024).toFixed(1)} KB`);
