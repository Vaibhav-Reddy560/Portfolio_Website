/**
 * URL-safe slug from a title, used for storage paths and lookups.
 *
 * Kept dependency-free and in its own module deliberately: src/lib/images.ts
 * imports `sharp` at the top level, so anything that imports *anything* from
 * that file — including just `slugify` — pulls the whole native image
 * pipeline into the bundle. That's fine for server actions, but breaks any
 * client component that needs a slug (e.g. the admin's project features
 * editor), since `sharp` can't be bundled for the browser at all.
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}
