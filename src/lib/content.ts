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
 * A project's variable case-study payload. Genuinely different per project —
 * Easy Club ships `pillars`, Opacitys ships `modules`/`providers`/`engineering`,
 * a project drafted through the admin can ship any mix of all four — so every
 * key is optional and `CaseStudy` (src/components/case-study.tsx) normalises
 * whichever shapes are actually present rather than assuming one layout.
 */
export type ProjectDetail = {
  pillars?: unknown[];
  modules?: unknown[];
  providers?: unknown;
  engineering?: unknown;
};

export type CaseStudyProject = {
  slug: string;
  name: string;
  tagline?: string;
  year?: string;
  href?: string;
  hrefLabel?: string;
  thesis?: string;
  stack: string[];
  note?: string;
  image?: string;
  blurDataURL?: string;
  alt?: string;
  detail: ProjectDetail;
};

/** Static fallback, reshaped to the same generic structure the DB loader returns. */
const STATIC_CASE_STUDIES: CaseStudyProject[] = [
  {
    slug: 'easy-club',
    name: staticEasyClub.name,
    tagline: staticEasyClub.tagline,
    year: staticEasyClub.year,
    href: staticEasyClub.href,
    hrefLabel: staticEasyClub.hrefLabel,
    thesis: staticEasyClub.thesis,
    stack: [...staticEasyClub.stack],
    note: staticEasyClub.note,
    image: '/work/easy-club/product.png',
    detail: { pillars: staticEasyClub.pillars },
  },
  {
    slug: 'opacitys',
    name: staticOpacitys.name,
    tagline: staticOpacitys.tagline,
    year: staticOpacitys.year,
    href: staticOpacitys.href,
    hrefLabel: staticOpacitys.hrefLabel,
    thesis: staticOpacitys.thesis,
    stack: [...staticOpacitys.stack],
    note: staticOpacitys.note,
    image: '/work/opacitys/product.png',
    detail: {
      modules: staticOpacitys.modules,
      providers: staticOpacitys.providers,
      engineering: staticOpacitys.engineering,
    },
  },
];

/**
 * Every featured, published project with its full case-study payload — not
 * just the two originals. `featured` gates which projects get an expanded
 * section on the homepage (as opposed to just the compact grid from
 * `getBuilds`); everything else about a row (image, stack, detail) comes
 * through untouched, so a project published with an image and a full
 * `detail` object surfaces immediately, no code change required.
 */
export const getCaseStudies = unstable_cache(
  async (): Promise<CaseStudyProject[]> =>
    withFallback<CaseStudyProject>(
      'case-studies',
      async () => {
        const { data, error } = await readClient()
          .from('projects')
          .select('*')
          .eq('published', true)
          .eq('featured', true)
          .order('sort_order', { ascending: true });
        if (error) throw error;
        return (data ?? []).map((row) => ({
          slug: row.slug,
          name: row.name,
          tagline: row.tagline ?? undefined,
          year: row.year ?? undefined,
          href: row.href ?? undefined,
          hrefLabel: row.href_label ?? undefined,
          thesis: row.thesis ?? undefined,
          stack: row.stack ?? [],
          note: row.note ?? undefined,
          image: imageUrl(row.image_path),
          blurDataURL: row.blur_data_url ?? undefined,
          alt: row.alt ?? undefined,
          detail: (row.detail ?? {}) as ProjectDetail,
        }));
      },
      STATIC_CASE_STUDIES,
    ),
  ['case-studies'],
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
