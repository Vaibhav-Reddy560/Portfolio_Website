export type Role = {
  title: string;
  org: string;
  sub?: string;
  start: string;
  end: string;
  /** Sort key — most recent first. */
  order: number;
  detail: string;
  tags: string[];
};

export const experience: Role[] = [
  {
    title: 'SAC Coordinator — Design',
    org: 'IEEE Bangalore Section',
    sub: 'and IEEE CS Bangalore Chapter',
    start: 'Feb 2026',
    end: 'Present',
    order: 10,
    detail:
      'Selected by the IEEE Bangalore Section as Student Activities Committee Coordinator for Design, owning the visual direction for section-level student programming. Also serving the IEEE CS Bangalore Chapter in the same capacity since March 2026.',
    tags: ['Design direction', 'Section level'],
  },
  {
    title: 'Design JC',
    org: 'BMSCE UTSAV',
    sub: 'Annual cultural fest',
    start: 'Feb 2026',
    end: 'Present',
    order: 9,
    detail:
      'Designing the visual assets for the college cultural fest across Photoshop and Illustrator — event posters, artist lineups, certificates and campaign collateral for a fest that runs the length of a week.',
    tags: ['Photoshop', 'Illustrator', 'Campaign'],
  },
  {
    title: 'Central Event Coordinator — Hackaphasia 3.0',
    org: 'BMSCE Phase Shift',
    sub: 'with BMSCE IEEE Computer Society',
    start: 'Sep 2025',
    end: 'Mar 2026',
    order: 8,
    detail:
      'Coordinated BMSCE’s largest hackathon — 350+ participants across a 24-hour cycle — owning logistics and crisis management end to end, from venue and scheduling through to on-the-night problem solving.',
    tags: ['350+ participants', '24-hour', 'Logistics'],
  },
  {
    title: 'SAC Coordinator',
    org: 'BMSCE IEEE Computer Society',
    start: 'Jul 2025',
    end: 'Nov 2025',
    order: 7,
    detail:
      'Led the CS Juniors and CS Reach mentoring initiatives, and coordinated cross-functional teams across the chapter’s major events.',
    tags: ['Mentoring', 'Team coordination'],
  },
  {
    title: 'Multimedia Team Member',
    org: 'BMSCE IEEE Computer Society',
    start: 'Jan 2025',
    end: 'Jul 2025',
    order: 6,
    detail:
      'Designed posters, brochures, banners and story sets across Canva, Figma and Photoshop — the bulk of the chapter’s event collateral for the term.',
    tags: ['Canva', 'Figma', 'Photoshop'],
  },
  {
    title: 'Event Designer & Organizer',
    org: 'BMSCE IEEE PES and Sensors Council',
    start: 'Dec 2024',
    end: 'Present',
    order: 5,
    detail:
      'Led the design and execution of “Quest to Eldoria”, the treasure hunt for PES Day 2025, coordinating six event leads through build and run.',
    tags: ['Event design', '6 leads'],
  },
  {
    title: 'Representing Ambassador — IEEE DataPort',
    org: 'ICWITE Conference at BGSCET',
    sub: 'IEEE Bangalore Section',
    start: '2024',
    end: '2024',
    order: 4,
    detail:
      'Represented IEEE DataPort’s technical resources at a section-level conference, presenting to an audience in the hundreds.',
    tags: ['Conference', 'Section level'],
  },
];

export const additionalRoles = [
  { role: 'Design Team', org: 'Phase Shift 2025, annual tech fest' },
  { role: 'Social Media Team', org: 'BMSCE Pentagram (2024–25) — reels for Race Blitz & Enigma Hunt' },
  { role: 'Member', org: 'Rotaract Club of BMSCE — community service' },
  { role: 'Conference Volunteer', org: 'IEEE INDICON, IEEE Bangalore Section' },
  { role: 'Hackathon Volunteer', org: 'College-level technical competitions' },
];
