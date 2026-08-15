export type Discipline = 'build' | 'design';

export type DesignPiece = {
  slug: string;
  title: string;
  /** What it was made for — the client, in effect. */
  context: string;
  kind: string;
  year: string;
  /** width / height. Drives the placeholder slot so the gallery keeps its rhythm. */
  ratio: number;
  /**
   * Absent until an image is dropped in. Add
   * `src: '/work/designs/<slug>.webp'` once the file exists and the slot
   * becomes a real image with no other change.
   */
  src?: string;
  alt?: string;
};

/**
 * Slots, not images. Every entry keeps its identity so the gallery reads as a
 * planned set while the artwork is being supplied — drop a file at
 * `public/work/designs/<slug>.webp` and add `src` to light it up.
 *
 * The 22 originally extracted posters are archived at `public/work/extracted/`.
 */
export const designs: DesignPiece[] = [
  { slug: 'utsav-inauguration-lineup', title: 'Inauguration & Artist Lineup', context: 'UTSAV 2026', kind: 'Poster series', year: '2026', ratio: 0.8 },
  { slug: 'utsav-dj-night', title: 'DJ Night', context: 'UTSAV 2026', kind: 'Event poster', year: '2026', ratio: 0.8 },
  { slug: 'utsav-flashmob', title: 'Flashmob', context: 'UTSAV 2026', kind: 'Event poster', year: '2026', ratio: 0.8 },
  { slug: 'utsav-moto-show', title: 'Moto Show', context: 'UTSAV 2026', kind: 'Event poster', year: '2026', ratio: 0.8 },
  { slug: 'utsav-vc-meet', title: 'VC Meet', context: 'UTSAV 2026', kind: 'Event poster', year: '2026', ratio: 0.8 },
  { slug: 'facultys-got-talent', title: "Faculty's Got Talent", context: 'UTSAV 2026', kind: 'Event poster', year: '2026', ratio: 0.8 },
  { slug: 'trial-by-combat', title: 'Trial by Combat', context: 'Code IO × UTSAV 2026', kind: 'Event poster', year: '2026', ratio: 0.8 },
  { slug: 'utsav-certificate', title: 'Certificate of Appreciation', context: 'UTSAV 2026', kind: 'Certificate', year: '2026', ratio: 1.414 },
  { slug: 'easy-club-launch', title: 'Easy Club Launch', context: 'Easy Club', kind: 'Product poster', year: '2025', ratio: 0.8 },
  { slug: 'agentic-ai-unpacked', title: 'Agentic AI Unpacked', context: 'BMSCE IEEE CS × GitHub', kind: 'Speaker session', year: '2025', ratio: 0.803 },
  { slug: 'repogenesis', title: 'RepoGenesis', context: 'Open Source Week', kind: 'Hackathon poster', year: '2025', ratio: 0.799 },
  { slug: 'open-source-week-lockup', title: 'Open Source Week', context: 'BMSCE IEEE CS', kind: 'Type lockup', year: '2025', ratio: 3.944 },
  { slug: 'data-heist', title: 'Data Heist', context: 'Phase Shift 2025', kind: 'Event poster', year: '2025', ratio: 0.998 },
  { slug: 'holoverse-360', title: 'Holoverse 360', context: 'BMSCE IEEE CS', kind: 'Workshop poster', year: '2025', ratio: 0.999 },
  { slug: 'wattweb', title: 'WattWeb', context: 'PES Day 2025', kind: 'Event poster', year: '2025', ratio: 1.0 },
  { slug: 'ieee-cs-2026-identity', title: 'Chapter Identity 2026', context: 'BMSCE IEEE CS', kind: 'Identity graphic', year: '2026', ratio: 0.925 },
  { slug: 'ieee-cs-bc-student-chairs-meetup', title: 'Student Chairs Meet Up', context: 'IEEE CS Bangalore Chapter', kind: 'Event poster', year: '2026', ratio: 0.8 },
  { slug: 'tech-for-good-summit', title: 'Tech for Good Summit', context: 'BMSCE IEEE CS × WIE', kind: 'Teaser poster', year: '2026', ratio: 0.8 },
  { slug: 'out-campus-campaigning', title: 'Out Campus Campaigning', context: 'Phase Shift', kind: 'Event poster', year: '2025', ratio: 0.8 },
  { slug: 'hackaphasia-volunteer-badge', title: 'Volunteer Badge', context: 'Hackaphasia', kind: 'Badge system', year: '2025', ratio: 0.848 },
  { slug: 'hardware-hackathon-exec-badge', title: 'Executive Committee Badge', context: 'Hardware Hackathon III', kind: 'Badge system', year: '2025', ratio: 0.749 },
  { slug: 'phaseshift-meridian-core-badge', title: 'Meridian Core Badge', context: 'Phase Shift 2025', kind: 'Badge system', year: '2025', ratio: 0.749 },
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
    title: 'This Terminal',
    tagline: 'A portfolio you operate',
    year: '2026',
    stack: ['Next.js 16', 'TypeScript', 'Tailwind CSS', 'Motion'],
    summary:
      'Built as a machine rather than a page: every section is a window you can drag, minimise and close, with a live diagnostic readout reporting real telemetry from the DOM.',
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
