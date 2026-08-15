export const skillGroups = [
  {
    id: 'design',
    label: 'Design & Multimedia',
    discipline: 'design' as const,
    items: ['Figma', 'Photoshop', 'Illustrator', 'Canva', 'UI/UX', 'Branding'],
  },
  {
    id: 'technical',
    label: 'Technical',
    discipline: 'build' as const,
    items: ['AI & ML', 'Next.js', 'React', 'Product Design', 'Vibe Coding'],
  },
  {
    id: 'leadership',
    label: 'Leadership',
    discipline: 'lead' as const,
    items: [
      'Event Planning',
      'Team Management',
      'Marketing',
      'Community Building',
    ],
  },
];

export const education = [
  {
    qualification: 'B.E. — AI & Machine Learning',
    institution: 'B.M.S. College of Engineering',
    period: '2024 — Expected 2028',
    place: 'Bengaluru',
    current: true,
  },
  {
    qualification: 'Pre-University — Science',
    institution: 'BASE PU College',
    period: 'Completed 2024',
    place: 'Bengaluru',
    current: false,
  },
  {
    qualification: 'Secondary School — CBSE',
    institution: 'GEAR Innovative International School',
    period: 'Completed 2022',
    place: 'Bengaluru',
    current: false,
  },
];
