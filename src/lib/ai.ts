/**
 * Gemini-backed drafting. Every call uses generateObject with a Zod schema, so
 * output is typed and validated rather than free text this app has to parse.
 *
 * These functions only ever produce a draft. Nothing here writes to the
 * database — the caller always lands the result in an editable form, and
 * publishing is a separate, explicit step the admin takes.
 */
import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';

// Fast and current as of this build (verified directly against the Gemini API's
// live model list) — noticeably quicker than 2.5 Flash on the same vision task
// with no loss of accuracy on these images.
const MODEL = 'gemini-3.7-flash';

const designDraftSchema = z.object({
  title: z.string().describe('Short piece name, e.g. "DJ Night"'),
  context: z.string().describe('The event or client it was made for, e.g. "UTSAV 2026"'),
  kind: z.string().describe('e.g. Event poster, Badge system, Certificate, Type lockup'),
  year: z.string().describe('4-digit year, read from the artwork if visible'),
  alt: z.string().describe('One sentence of alt text describing the artwork for screen readers'),
});

export type DesignDraft = z.infer<typeof designDraftSchema>;

/** Reads a poster/badge/certificate image and drafts its gallery metadata. */
export async function draftDesignFromImage(
  image: Buffer,
  notes?: string,
  title?: string,
): Promise<DesignDraft> {
  const { object } = await generateObject({
    model: google(MODEL),
    schema: designDraftSchema,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: [
              'This is a graphic design piece from a student designer\'s portfolio.',
              'Read any text visible in the artwork (event name, date, organiser) and',
              'use it to fill out the fields accurately rather than guessing.',
              notes ? `The designer's own notes: ${notes}` : '',
              title
                ? `The designer has already titled this piece "${title}" — use that exact title verbatim and draft the remaining fields around it.`
                : '',
            ]
              .filter(Boolean)
              .join(' '),
          },
          { type: 'image', image },
        ],
      },
    ],
  });
  // Belt and suspenders: the model is instructed to keep the given title
  // verbatim, but only overwriting it here *guarantees* it — no risk of the
  // model paraphrasing a title the designer already chose deliberately.
  if (title) object.title = title;
  return object;
}

const pillarSchema = z.object({
  id: z.string().describe('kebab-case identifier'),
  name: z.string(),
  summary: z.string().describe('One sentence overview'),
  points: z.array(z.string()).describe('3-6 concrete feature bullets'),
});

const caseStudyDraftSchema = z.object({
  name: z.string(),
  tagline: z.string().describe('Short one-line positioning statement'),
  thesis: z.string().describe('2-3 sentence summary of what the product does and why'),
  stack: z.array(z.string()).describe('Technology stack, e.g. ["Next.js", "PostgreSQL"]'),
  note: z.string().optional().describe('One short standout fact, if any'),
  pillars: z
    .array(pillarSchema)
    .describe('2-5 major feature groups, derived from the notes'),
});

export type CaseStudyDraft = z.infer<typeof caseStudyDraftSchema>;

/** Turns unstructured prose about a project into a structured case study. */
export async function draftCaseStudyFromNotes(notes: string): Promise<CaseStudyDraft> {
  const { object } = await generateObject({
    model: google(MODEL),
    schema: caseStudyDraftSchema,
    prompt: [
      'Turn these rough notes about a software project into a structured case study',
      'for a portfolio site. Group related features into 2-5 pillars, each with a short',
      'name, a one-sentence summary, and 3-6 concrete bullet points pulled from the notes',
      '— do not invent features that are not mentioned.\n\nNotes:\n',
      notes,
    ].join(' '),
  });
  return object;
}
