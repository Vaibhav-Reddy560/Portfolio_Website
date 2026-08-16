/**
 * Content loaders.
 *
 * Every loader is `database result ?? static fallback`. The static files in
 * src/content/*.ts remain the shipped source of truth for resilience: if
 * Supabase is unreachable, misconfigured, slow, or simply returns nothing, the
 * public site renders exactly as it did before the database existed.
 *
 * Freshness: each loader carries a 5-second `revalidate`, and the admin's
 * write actions call `revalidatePath('/')` to force prompt regeneration on
 * top of that. Per the Next.js 16 docs, neither `revalidateTag` nor
 * `updateTag` reach these entries — both only recognise tags assigned via
 * `cacheTag()` inside a `'use cache'` function, not `unstable_cache`'s own
 * `tags` option, which Next 16 has fully deprecated in favour of `'use
 * cache'`. The short TTL is what actually bounds staleness here; the `tags`
 * array below is otherwise inert until this file migrates to `'use cache'`
 * + `cacheTag()`.
 */
import { unstable_cache } from 'next/cache';
import { easyClub as staticEasyClub, opacitys as staticOpacitys } from '@/content/case-studies';
import { additionalRoles as staticAdditional, experience as staticExperience, type Role } from '@/content/experience';
import { profile as staticProfile, tools } from '@/content/profile';
import { education as staticEducation, skillGroups as staticSkillGroups } from '@/content/skills';
import { builds as staticBuilds, designs as staticDesigns, type BuildProject, type DesignPiece } from '@/content/work';
import { readClient, supabaseConfigured, SUPABASE_URL } from './supabase/server';

export const CONTENT_TAG = 'content';

/** Storage paths are stored bare; absolute and legacy /public paths pass through. */
export function imageUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('http') || path.startsWith('/')) return path;
  return `${SUPABASE_URL}/storage/v1/object/public/work/${path}`;
}

/**
 * Runs a query, returning the fallback on any failure or empty result.
 * Errors are logged, never thrown — a content query must not take the site down.
 */
async function withFallback<T>(
  label: string,
  query: () => Promise<T[] | null>,
  fallback: T[],
): Promise<T[]> {
  if (!supabaseConfigured) return fallback;
  try {
    const rows = await query();
    if (!rows || rows.length === 0) return fallback;
    return rows;
  } catch (error) {
    console.error(`[content] ${label} failed, using static fallback:`, error);
    return fallback;
  }
}

/* ------------------------------------------------------------------ work -- */

export const getDesigns = unstable_cache(
  async (): Promise<DesignPiece[]> =>
    withFallback<DesignPiece>(
      'designs',
      async () => {
        const { data, error } = await readClient()
          .from('designs')
          .select('slug,title,context,kind,year,ratio,image_path,blur_data_url,alt')
          .eq('published', true)
          .order('sort_order', { ascending: true });
        if (error) throw error;
        return (data ?? []).map((row) => ({
          slug: row.slug,
          title: row.title,
          context: row.context,
          kind: row.kind,
          year: row.year,
          ratio: Number(row.ratio),
          src: imageUrl(row.image_path),
          alt: row.alt ?? undefined,
        }));
      },
      staticDesigns,
    ),
  ['designs'],
  { tags: [CONTENT_TAG], revalidate: 5 },
);

export const getBuilds = unstable_cache(
  async (): Promise<BuildProject[]> =>
    withFallback<BuildProject>(
      'projects',
      async () => {
        const { data, error } = await readClient()
          .from('projects')
          .select('slug,name,tagline,year,href,href_label,summary,stack')
          .eq('published', true)
          .order('sort_order', { ascending: true });
        if (error) throw error;
        return (data ?? []).map((row) => ({
          slug: row.slug,
          title: row.name,
          tagline: row.tagline ?? '',
          year: row.year ?? '',
          href: row.href ?? undefined,
          hrefLabel: row.href_label ?? undefined,
          stack: row.stack ?? [],
          summary: row.summary ?? '',
        }));
      },
      staticBuilds,
    ),
  ['projects'],
  { tags: [CONTENT_TAG], revalidate: 5 },
);

/**
 * Full case study, merged with its `detail` JSON.
 *
 * Typed per project rather than by a shared slug parameter: the two studies have
 * genuinely different shapes (pillars vs modules/providers/engineering), and a
 * union return type would force every consumer to narrow it at the call site.
 */
async function loadCaseStudy<T extends object>(slug: string, fallback: T): Promise<T & { image?: string }> {
  if (!supabaseConfigured) return fallback;
  try {
    const { data, error } = await readClient()
      .from('projects')
      .select('*')
      .eq('slug', slug)
      .eq('published', true)
      .maybeSingle();
    if (error || !data) return fallback;

    const detail = (data.detail ?? {}) as Partial<T>;
    return {
      ...fallback,
      name: data.name,
      href: data.href ?? undefined,
      hrefLabel: data.href_label ?? undefined,
      year: data.year ?? undefined,
      tagline: data.tagline ?? undefined,
      thesis: data.thesis ?? undefined,
      stack: data.stack?.length ? data.stack : undefined,
      note: data.note ?? undefined,
      image: imageUrl(data.image_path),
      // Drop keys the row left null so the static fallback value survives.
      ...Object.fromEntries(
        Object.entries(detail).filter(([, v]) => v !== null && v !== undefined),
      ),
    } as T & { image?: string };
  } catch (error) {
    console.error(`[content] case study ${slug} failed, using fallback:`, error);
    return fallback;
  }
}

export const getEasyClub = unstable_cache(
  () => loadCaseStudy('easy-club', staticEasyClub),
  ['case-study-easy-club'],
  { tags: [CONTENT_TAG], revalidate: 5 },
);

export const getOpacitys = unstable_cache(
  () => loadCaseStudy('opacitys', staticOpacitys),
  ['case-study-opacitys'],
  { tags: [CONTENT_TAG], revalidate: 5 },
);

/* --------------------------------------------------------------- resume -- */

export const getExperience = unstable_cache(
  async () =>
    withFallback<Role>(
      'experience',
      async () => {
        const { data, error } = await readClient()
          .from('experience')
          .select('title,org,sub,start_label,end_label,detail,tags,sort_order')
          .eq('published', true)
          .eq('is_additional', false)
          .order('sort_order', { ascending: false });
        if (error) throw error;
        return (data ?? []).map((row) => ({
          title: row.title,
          org: row.org,
          sub: row.sub ?? undefined,
          start: row.start_label ?? '',
          end: row.end_label ?? '',
          order: row.sort_order,
          detail: row.detail ?? '',
          tags: row.tags ?? [],
        }));
      },
      [...staticExperience],
    ),
  ['experience'],
  { tags: [CONTENT_TAG], revalidate: 5 },
);

export const getAdditionalRoles = unstable_cache(
  async () =>
    withFallback(
      'additional-roles',
      async () => {
        const { data, error } = await readClient()
          .from('experience')
          .select('title,org')
          .eq('published', true)
          .eq('is_additional', true)
          .order('sort_order', { ascending: true });
        if (error) throw error;
        return (data ?? []).map((row) => ({ role: row.title, org: row.org }));
      },
      [...staticAdditional],
    ),
  ['additional-roles'],
  { tags: [CONTENT_TAG], revalidate: 5 },
);

export const getSkillGroups = unstable_cache(
  async () =>
    withFallback(
      'skills',
      async () => {
        const { data, error } = await readClient()
          .from('skill_groups')
          .select('group_key,label,discipline,items')
          .order('sort_order', { ascending: true });
        if (error) throw error;
        return (data ?? []).map((row) => ({
          id: row.group_key,
          label: row.label,
          discipline: row.discipline as 'design' | 'build' | 'lead',
          items: row.items ?? [],
        }));
      },
      [...staticSkillGroups],
    ),
  ['skills'],
  { tags: [CONTENT_TAG], revalidate: 5 },
);

export const getEducation = unstable_cache(
  async () =>
    withFallback(
      'education',
      async () => {
        const { data, error } = await readClient()
          .from('education')
          .select('qualification,institution,period,place,is_current')
          .order('sort_order', { ascending: true });
        if (error) throw error;
        return (data ?? []).map((row) => ({
          qualification: row.qualification,
          institution: row.institution,
          period: row.period ?? '',
          place: row.place ?? '',
          current: row.is_current,
        }));
      },
      [...staticEducation],
    ),
  ['education'],
  { tags: [CONTENT_TAG], revalidate: 5 },
);

export const getProfile = unstable_cache(
  async () => {
    if (!supabaseConfigured) return { ...staticProfile, portrait: '/portrait-amber.webp' };
    try {
      const { data, error } = await readClient()
        .from('profile')
        .select('*')
        .maybeSingle();
      if (error || !data) throw error ?? new Error('no profile row');
      return {
        ...staticProfile,
        first: data.first || staticProfile.first,
        last: data.last || staticProfile.last,
        eyebrow: data.eyebrow?.length ? data.eyebrow : [...staticProfile.eyebrow],
        role: data.role ?? staticProfile.role,
        location: data.location ?? staticProfile.location,
        status: data.status ?? staticProfile.status,
        lede: data.lede ?? staticProfile.lede,
        about: data.about?.length ? data.about : [...staticProfile.about],
        facts: data.facts?.length ? data.facts : [...staticProfile.facts],
        contact: { ...staticProfile.contact, ...(data.contact ?? {}) },
        interests: data.interests?.length ? data.interests : [...staticProfile.interests],
        portrait: imageUrl(data.portrait_path) ?? '/portrait-amber.webp',
      };
    } catch (error) {
      console.error('[content] profile failed, using static fallback:', error);
      return { ...staticProfile, portrait: '/portrait-amber.webp' };
    }
  },
  ['profile'],
  { tags: [CONTENT_TAG], revalidate: 5 },
);

export { tools };
