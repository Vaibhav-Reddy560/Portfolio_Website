export type Discipline = 'build' | 'design';

export type DesignPiece = {
  slug: string;
  title: string;
  /** What it was made for — the client, in effect. */
  context: string;
  kind: string;
  year: string;
  /** width / height, from the real file. Sizes the slot so the masonry never shifts. */
  ratio: number;
  /**
   * A committed file under `public/work/designs/`, served straight from the
   * deployment. Optional only so a newly added piece can hold its slot for the
   * one commit before its artwork lands.
   */
  src?: string;
  alt?: string;
};

/**
 * The gallery's floor, and the reason it cannot go blank.
 *
 * The live site prefers the `designs` table, where pieces are managed through
 * the admin and served from Supabase Storage. When that is unreachable — an
 * outage, a suspended project, a rotated key — this list is what renders, so
 * every entry carries a real `src` pointing at a webp committed to the repo.
 * These 22 are the originals rendered by scripts/build-assets.mjs; they used to
 * sit unused in `public/work/extracted/` while the fallback showed empty slots,
 * which is exactly how the gallery once came up with no artwork at all.
 *
 * Adding a piece: put the file at `public/work/designs/<slug>.webp`, add the
 * entry here with its true ratio, then upload through the admin. Both layers
 * then hold it, and neither one alone is a single point of failure.
 */
export const designs: DesignPiece[] = [
  { slug: 'utsav-inauguration-lineup', title: 'Inauguration & Artist Lineup', context: 'UTSAV 2026', kind: 'Poster series', year: '2026', ratio: 0.8, src: '/work/designs/utsav-inauguration-lineup.webp' },
  { slug: 'utsav-dj-night', title: 'DJ Night', context: 'UTSAV 2026', kind: 'Event poster', year: '2026', ratio: 0.798, src: '/work/designs/utsav-dj-night.webp' },
  { slug: 'utsav-flashmob', title: 'Flashmob', context: 'UTSAV 2026', kind: 'Event poster', year: '2026', ratio: 0.799, src: '/work/designs/utsav-flashmob.webp' },
  { slug: 'utsav-moto-show', title: 'Moto Show', context: 'UTSAV 2026', kind: 'Event poster', year: '2026', ratio: 0.8, src: '/work/designs/utsav-moto-show.webp' },
  { slug: 'utsav-vc-meet', title: 'VC Meet', context: 'UTSAV 2026', kind: 'Event poster', year: '2026', ratio: 0.8, src: '/work/designs/utsav-vc-meet.webp' },
  { slug: 'facultys-got-talent', title: "Faculty's Got Talent", context: 'UTSAV 2026', kind: 'Event poster', year: '2026', ratio: 0.8, src: '/work/designs/facultys-got-talent.webp' },
  { slug: 'trial-by-combat', title: 'Trial by Combat', context: 'Code IO × UTSAV 2026', kind: 'Event poster', year: '2026', ratio: 0.8, src: '/work/designs/trial-by-combat.webp' },
  { slug: 'utsav-certificate', title: 'Certificate of Appreciation', context: 'UTSAV 2026', kind: 'Certificate', year: '2026', ratio: 1.414, src: '/work/designs/utsav-certificate.webp' },
  { slug: 'easy-club-launch', title: 'Easy Club Launch', context: 'Easy Club', kind: 'Product poster', year: '2025', ratio: 0.8, src: '/work/designs/easy-club-launch.webp' },
  { slug: 'agentic-ai-unpacked', title: 'Agentic AI Unpacked', context: 'BMSCE IEEE CS × GitHub', kind: 'Speaker session', year: '2025', ratio: 0.803, src: '/work/designs/agentic-ai-unpacked.webp' },
  { slug: 'repogenesis', title: 'RepoGenesis', context: 'Open Source Week', kind: 'Hackathon poster', year: '2025', ratio: 0.799, src: '/work/designs/repogenesis.webp' },
  { slug: 'open-source-week-lockup', title: 'Open Source Week', context: 'BMSCE IEEE CS', kind: 'Type lockup', year: '2025', ratio: 3.944, src: '/work/designs/open-source-week-lockup.webp' },
  { slug: 'data-heist', title: 'Data Heist', context: 'Phase Shift 2025', kind: 'Event poster', year: '2025', ratio: 0.998, src: '/work/designs/data-heist.webp' },
  { slug: 'holoverse-360', title: 'Holoverse 360', context: 'BMSCE IEEE CS', kind: 'Workshop poster', year: '2025', ratio: 0.999, src: '/work/designs/holoverse-360.webp' },
  { slug: 'wattweb', title: 'WattWeb', context: 'PES Day 2025', kind: 'Event poster', year: '2025', ratio: 1.0, src: '/work/designs/wattweb.webp' },
  { slug: 'ieee-cs-2026-identity', title: 'Chapter Identity 2026', context: 'BMSCE IEEE CS', kind: 'Identity graphic', year: '2026', ratio: 0.925, src: '/work/designs/ieee-cs-2026-identity.webp' },
  { slug: 'ieee-cs-bc-student-chairs-meetup', title: 'Student Chairs Meet Up', context: 'IEEE CS Bangalore Chapter', kind: 'Event poster', year: '2026', ratio: 0.8, src: '/work/designs/ieee-cs-bc-student-chairs-meetup.webp' },
  { slug: 'tech-for-good-summit', title: 'Tech for Good Summit', context: 'BMSCE IEEE CS × WIE', kind: 'Teaser poster', year: '2026', ratio: 0.8, src: '/work/designs/tech-for-good-summit.webp' },
  { slug: 'out-campus-campaigning', title: 'Out Campus Campaigning', context: 'Phase Shift', kind: 'Event poster', year: '2025', ratio: 0.8, src: '/work/designs/out-campus-campaigning.webp' },
  { slug: 'hackaphasia-volunteer-badge', title: 'Volunteer Badge', context: 'Hackaphasia', kind: 'Badge system', year: '2025', ratio: 0.848, src: '/work/designs/hackaphasia-volunteer-badge.webp' },
  { slug: 'hardware-hackathon-exec-badge', title: 'Executive Committee Badge', context: 'Hardware Hackathon III', kind: 'Badge system', year: '2025', ratio: 0.749, src: '/work/designs/hardware-hackathon-exec-badge.webp' },
  { slug: 'phaseshift-meridian-core-badge', title: 'Meridian Core Badge', context: 'Phase Shift 2025', kind: 'Badge system', year: '2025', ratio: 0.749, src: '/work/designs/phaseshift-meridian-core-badge.webp' },
  // Added through the admin, mirrored back here. Three carry the drafting
  // placeholder they were saved with — fix them in the admin and copy the real
  // context across, in both places.
  { slug: 'registrations-opening-soon', title: 'Registrations Opening Soon', context: 'TBD — please review', kind: 'Announcement poster', year: '2026', ratio: 0.8, src: '/work/designs/registrations-opening-soon.webp' },
  { slug: 'merch', title: 'Merch', context: 'TBD — please review', kind: 'Merchandise design', year: '2026', ratio: 0.707, src: '/work/designs/merch.webp' },
  { slug: 'plenary-talks', title: 'PLenary Talks', context: 'BTC 2026', kind: 'Speaker session', year: '2026', ratio: 0.8, src: '/work/designs/plenary-talks.webp' },
  { slug: 'round-3', title: 'Round 3', context: 'TBD — please review', kind: 'Event poster', year: '2026', ratio: 1.414, src: '/work/designs/round-3.webp' },
];

export type BuildProject = {
  slug: string;
  title: string;
  tagline: string;
  year: string;
  href?: string;
  hrefLabel?: string;
  stack: string[];
  summary: string;
};

/**
 * Mirrors the published rows of the `projects` table, which is what the site
 * actually renders — this list is only reached when Supabase is unreachable.
 * Nothing syncs it automatically, so a project added or edited through the
 * admin has to be copied here by hand, or it vanishes on the day it matters.
 */
export const builds: BuildProject[] = [
  {
    slug: 'easy-club',
    title: 'Easy Club',
    tagline: 'Club operations made easy',
    year: '2025 — Present',
    href: 'https://easyclub.in',
    hrefLabel: 'easyclub.in',
    stack: ['Next.js 15', 'Tailwind CSS', 'Framer Motion', 'Firebase'],
    summary:
      'A centralised operational command centre for student organisations — event orchestration, generative AI ideation and design, recruitment, sponsorship CRM and role-based access, in one workspace.',
  },
  {
    slug: 'opacitys',
    title: 'Opacitys',
    tagline: 'An AI creative workspace for designers',
    year: '2026',
    href: 'https://opacitys.vercel.app',
    hrefLabel: 'opacitys.vercel.app',
    stack: ['Next.js 16', 'React 19', 'TypeScript', 'PostgreSQL', 'Drizzle'],
    summary:
      'Ten modules that replace subjective design feedback with something measured or sourced — pixel-level critique, verified scoped edits, percentage style blends and live-web-grounded trend research. Built solo.',
  },
  {
    slug: 'portfolio',
    title: 'This Portfolio',
    tagline: 'A portfolio you operate',
    year: '2026',
    stack: [
      'Next.js 16',
      'React 19',
      'TypeScript',
      'Tailwind CSS',
      'Motion',
      'Supabase',
      'TensorFlow.js',
    ],
    summary:
      'Every section is a window you can drag, minimise and close, backed by a live diagnostics HUD reading real DOM telemetry. Content runs through a self-serve admin with row-level-secured Supabase and AI-assisted drafting — including camera-based Face ID sign-in, running entirely client-side.',
  },
  {
    slug: 'satquery-ai',
    title: 'SatQuery AI',
    tagline: 'Conversational satellite intelligence platform.',
    year: '2026',
    href: 'https://satquery-ai-sih.vercel.app/',
    hrefLabel: 'satquery-ai-sih.vercel.app',
    stack: [
      'Python',
      'PyTorch',
      'Hugging Face Transformers',
      'Remote-Sensing VLM',
      'LLM',
      'GeoPandas',
      'Rasterio',
      'GDAL',
      'FastAPI',
      'React',
      'PostGIS',
    ],
    summary:
      'SatQuery AI is an interactive, agentic vision-language assistant that lets users analyze satellite imagery through natural-language queries. It accepts single, optical-SAR, and bi-temporal remote-sensing images, automatically identifies the required analysis task, selects the appropriate AI model or GIS tool, and returns evidence-grounded visual and textual results. It enables VQA, scene understanding, region grounding, change analysis, and multimodal optical-SAR reasoning without requiring users to have specialized GIS or remote-sensing expertise.',
  },
  {
    slug: 'pathos',
    title: 'PathOS',
    tagline: 'The map is the interface',
    year: '2026',
    href: 'https://github.com/Vaibhav-Reddy560/PathOS',
    hrefLabel: 'github.com/Vaibhav-Reddy560/PathOS',
    stack: ['Swift 6', 'SwiftUI', 'MapKit', 'SwiftData', 'CoreLocation', 'FoundationModels'],
    summary:
      "An iPhone app that plans a Bengaluru journey end to end — an auto to the metro, the metro across the city, another auto at the far end — each leg with its own time and fare. Mail and timetables are read by Apple's on-device model, so nothing about the day leaves the phone.",
  },
];

/** The five things Easy Club ships, as listed on the product. */
export const easyClubEngines = [
  { name: 'Design Engine', detail: 'Canvas and brand asset generation for club collateral.' },
  { name: 'Content Engine', detail: 'AI document generation for proposals, reports and posts.' },
  { name: 'Resource Radar', detail: 'Expert scouting to find and reach the right speakers.' },
  { name: 'Sponsorship Manager', detail: 'Tracks outreach, funding conversations and deliverables.' },
  { name: 'QR Check-ins', detail: 'Attendance at the door without a spreadsheet.' },
];
