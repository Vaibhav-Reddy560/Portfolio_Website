export const profile = {
  first: 'VAIBHAV',
  last: 'REDDY',
  eyebrow: ['AI', 'Design', 'Leadership'],
  role: 'Designer & AI/ML engineer',
  location: 'Bengaluru, India',
  status: 'Open to opportunities',

  /** Hero thesis. Two sentences, no filler. */
  lede: 'I design the thing and then I build it. Posters and event identities for IEEE and BMSCE by day, AI-powered web products the rest of the time.',

  /**
   * About section — expanded from the resume summary. `**text**` marks a
   * segment for bold emphasis; PersonnelFile parses and renders it in Jura's
   * own DemiBold weight rather than literal Unicode "mathematical bold"
   * characters, which Jura has no glyphs for and which silently fall back to
   * a mismatched system serif.
   */
  about: [
    'I’m a third-year **Artificial Intelligence and Machine Learning** student at **B.M.S. College of Engineering** with a passion for design, technology, and building impactful digital experiences.',
    'As a **graphic designer** and **vibe coder**, I enjoy transforming ideas into visually compelling designs and functional digital products. My interests span branding, UI/UX design, web development, AI-driven applications, and rapid prototyping. I love exploring the space where creativity meets technology and turning concepts into tangible solutions.',
    'Beyond academics, I actively contribute to the student tech community as a **Student Activities Committee Coordinator** at the **IEEE Bangalore Section** and the **IEEE Computer Society Bangalore Chapter**. Through these roles, I work on organizing initiatives, events, and opportunities that help students connect, learn, and grow within the technology ecosystem.',
    'Throughout my journey, I’ve been involved in organisational management, event execution, design projects, and product-building initiatives, developing a strong foundation in leadership, collaboration, and problem-solving.',
    'Currently, I’m focused on deepening my knowledge in AI/ML, design, and product development while continuously building projects that create meaningful impact.',
    'Designing. Building. Learning. Growing.',
  ],

  facts: [
    { label: 'Degree', value: 'B.E. AI & Machine Learning' },
    { label: 'Institution', value: 'BMS College of Engineering' },
    { label: 'Graduating', value: '2028' },
    { label: 'Based in', value: 'Bengaluru, India' },
  ],

  contact: {
    email: 'vaibhav.reddy560@gmail.com',
    // Split so the raw string never appears in the served HTML.
    phoneParts: ['+91 ', '94811', ' ', '49729'],
    linkedin: 'https://www.linkedin.com/in/vaibhav-reddy-982b0a25b/',
    linkedinLabel: 'linkedin.com/in/vaibhav-reddy',
    easyclub: 'https://easyclub.in',
    resume: '/Vaibhav_Reddy_Resume.pdf',
  },

  interests: [
    'Product Design',
    'AI Applications',
    'Branding & Identity',
    'Rapid Prototyping',
    'Student Tech Communities',
    'Open Source',
  ],
} as const;

export const tools = [
  'Figma',
  'Photoshop',
  'Illustrator',
  'Canva',
  'Next.js',
  'React',
  'Tailwind CSS',
  'AI / ML',
  'UI/UX',
] as const;
