/**
 * Deep content for the two shipped products. Kept out of components so the copy
 * can be edited without touching layout.
 */

export type Pillar = {
  id: string;
  name: string;
  summary: string;
  points: string[];
};

export const easyClub = {
  name: 'Easy Club',
  href: 'https://easyclub.in',
  hrefLabel: 'easyclub.in',
  year: '2025 — Present',
  tagline: 'Club operations made easy',
  thesis:
    'A centralised command centre for student organisations, technical chapters and university clubs — replacing scattered spreadsheets and disconnected group chats with one operational workspace.',
  stack: ['Next.js 15', 'Tailwind CSS', 'Framer Motion', 'Firebase'],
  note: 'Premium, distraction-free dark mode throughout.',

  pillars: [
    {
      id: 'command',
      name: 'Event Command Center',
      summary:
        'The hub for orchestrating hackathons, tech summits and club events end to end.',
      points: [
        'Tracks upcoming, postponed and completed events in one board',
        'Logs meeting minutes against each event',
        'Domain-scoped task assignment — Management, Design, Content, Social — with live completion metrics',
        'Intelligent Workspaces automate registration by syncing directly with Google Forms',
        'Built-in QR scanner for real-time check-in at the door',
        'Semantic search so members find events and clubs in natural language',
      ],
    },
    {
      id: 'ai',
      name: 'AI Ideation & Design Studio',
      summary:
        'Native generative AI across OpenAI, Gemini and HuggingFace, aimed at the parts of the work that stall.',
      points: [
        'Event ideation engine brainstorms trending concepts and drafts pitches, titles and preliminary operational reports',
        'Native Design Studio with an “AI Vibe Director” suggesting colour palettes and typography',
        'Generates and exports social assets, A3 posters, standees and certificates in-app',
        'Invitation Engine drafts outreach emails, social captions, WhatsApp templates and volunteer briefings',
      ],
    },
    {
      id: 'crm',
      name: 'CRM, Recruitment & Access',
      summary:
        'The governance layer that lets an organisation scale without losing control.',
      points: [
        'Role-based access across System Administrator, Senior Core, Junior Core and General Member',
        'Watchtower dashboard monitors permissions and activity',
        'Recruitment pipeline with applicant tracking, a “Talent Matrix” skill evaluation and internal core committee voting',
        'Sponsorship CRM — a Kanban board tracking prospects through to close, funding tiers and deliverable fulfilment',
        'Collaboration Hub for secure inter-club comms and MOU drafting',
      ],
    },
  ] satisfies Pillar[],
};

export const opacitys = {
  name: 'Opacitys',
  href: 'https://opacitys.vercel.app',
  hrefLabel: 'opacitys.vercel.app',
  year: '2026',
  tagline: 'An AI creative workspace for designers',
  thesis:
    'Replace subjective design feedback with something measured or sourced. Every module either takes a real measurement or cites a real page — nothing is a confident guess dressed up as an answer.',
  stack: ['Next.js 16', 'React 19', 'TypeScript', 'PostgreSQL', 'Drizzle ORM', 'Vercel'],
  note: 'Built solo.',

  /** The ten modules, rendered as a systems-console matrix. */
  modules: [
    {
      id: 'critique',
      name: 'Critique',
      line: 'Measures nine design dimensions at pixel level — contrast ratios, type scale, alignment, spacing rhythm — then narrates what each number means.',
      detail: 'Every finding is pinned to its exact location on the image, not described in the abstract.',
    },
    {
      id: 'rebuild',
      name: 'Rebuild',
      line: 'Detects a design’s real element structure via vision grounding, then edits any element from a plain-language description.',
      detail: 'Edits are scoped — cropped, edited, composited back at full resolution — and verified by pixel-diffing the before/after rather than trusting the model’s claim.',
    },
    {
      id: 'identify',
      name: 'Identify',
      line: 'Classifies a design against a curated 100+ item style taxonomy.',
      detail: 'Returns a percentage blend — 60% Swiss, 30% brutalist, 10% editorial — rather than one guessed label.',
    },
    {
      id: 'currents',
      name: 'Currents',
      line: 'Live-web-grounded trend research: Tavily search feeding a Groq synthesis pass.',
      detail: 'Returns named, dated trends with execution steps and citations validated against the pages actually retrieved.',
    },
    {
      id: 'route',
      name: 'Route',
      line: 'Turns a client brief plus your tools and skill level into an ordered, tool-by-tool execution plan.',
      detail: 'Multi-turn follow-ups can revise the plan itself when something in it turns out to be wrong.',
    },
    {
      id: 'instruments',
      name: 'Instruments',
      line: 'Answers “where is that control” from an attached screenshot, or by searching live docs and changelogs.',
      detail: 'Avoids stale stored knowledge about UI that has since moved.',
    },
    {
      id: 'correspondence',
      name: 'Correspondence',
      line: 'Logs a client relationship — every message, channel, iteration and price.',
      detail: 'Interprets any entry back into concrete next moves and a draft reply.',
    },
    {
      id: 'originality',
      name: 'Originality',
      line: 'Checks how crowded a proposed direction already is against documented movements and prior work.',
      detail: 'Names the closest neighbours and suggests concrete moves to widen the gap.',
    },
    {
      id: 'fingerprint',
      name: 'Fingerprint',
      line: 'Aggregates every Critique, Identify and Originality run into one longitudinal style profile.',
      detail: 'Explicitly says when a dimension lacks enough signal instead of faking a zero score.',
    },
    {
      id: 'clearance',
      name: 'Clearance',
      line: 'Answers licensing and public-domain questions with durable, jurisdiction-general principles.',
      detail: 'Plus a country-aware read on a specific asset — always flagged as guidance, never legal advice.',
    },
  ],

  providers: ['Groq', 'Google Gemini', 'Tavily', 'Cloudflare Workers AI', 'Pollinations.ai'],

  engineering: [
    'Five AI/search providers orchestrated with rate-limit-aware budget tracking and automatic fallback',
    'Deliberately engineered to stay on genuinely free tiers — no credit card required anywhere',
    'Deterministic text replacement using opentype.js glyph outlines instead of generative inpainting, so text edits are exact',
    'Daily-refreshing trend digest generated server-side with database-level concurrency guards instead of cron infrastructure',
    'Unified “Your Work” library with cross-feature filtering, and Google OAuth via Firebase',
    'One ordered colour spectrum maps the nine measured dimensions consistently across every screen',
  ],
};
