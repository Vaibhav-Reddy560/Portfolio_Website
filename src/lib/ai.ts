/**
 * Gemini-backed drafting, with OpenAI behind it. Every call uses generateObject
 * with a Zod schema, so output is typed and validated rather than free text this
 * app has to parse.
 *
 * These functions only ever produce a draft. Nothing here writes to the
 * database — the caller always lands the result in an editable form, and
 * publishing is a separate, explicit step the admin takes.
 */
import { google } from '@ai-sdk/google';
import { openai } from '@ai-sdk/openai';
import { generateObject, type LanguageModel, type ModelMessage } from 'ai';
import sharp from 'sharp';
import { z } from 'zod';

/**
 * Chosen for latency, not for being the newest.
 *
 * 3.7 Flash was picked here as "fast and current", but it is a thinking model
 * (the API reports `thinking: true`) and spends that budget by default. On a
 * poster — a job that is really just reading text off an image — the same call
 * measured 169 seconds, which is what left "Draft with AI" spinning. It also
 * refuses `thinkingLevel: 'minimal'`, so the latency cannot be turned down.
 *
 * 3.5 Flash does accept it, and reads the same poster correctly in ~3s.
 */
const MODEL = 'gemini-3.5-flash';

/**
 * Minimal deliberation. Both drafting jobs are extraction, not reasoning: read
 * what is on the artwork, or restructure notes the operator already wrote.
 */
const THINKING = { google: { thinkingConfig: { thinkingLevel: 'minimal' as const } } };

/**
 * The standby, used only when Gemini will not answer — out of quota, rate
 * limited, or down. Mini rather than full: this is extraction, and the fallback
 * should be quick and cheap, not clever.
 *
 * `reasoningEffort: 'none'` is the GPT-5-family equivalent of minimal thinking;
 * 'minimal' is rejected by this model, 'none' and 'low' are accepted.
 */
const FALLBACK_MODEL = 'gpt-5.4-mini';
const FALLBACK_EFFORT = { openai: { reasoningEffort: 'none' as const } };

/** Absent on a deployment with no OpenAI key — Gemini then has no standby. */
const fallbackConfigured = Boolean(process.env.OPENAI_API_KEY);

/**
 * A draft is a convenience, never the only way to fill the form — so each
 * attempt is given a bounded slice of time and then gives up, rather than
 * holding the UI while the operator waits for an answer they can type
 * themselves. Two attempts at 25s keep the pair inside a 60s function.
 */
const DRAFT_TIMEOUT_MS = 25_000;

/**
 * Whether a failed Gemini call is worth retrying on the other provider.
 *
 * Only for "Gemini cannot answer right now": quota exhaustion, rate limiting,
 * an outage, or a timeout. A malformed request or a schema the model could not
 * satisfy would fail identically on OpenAI, so those propagate immediately
 * rather than costing a second call and another 25 seconds.
 */
function worthRetryingElsewhere(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (error.name === 'TimeoutError' || error.name === 'AbortError') return true;

  const status = (error as { statusCode?: number }).statusCode;
  if (typeof status === 'number' && (status === 429 || status === 403 || status >= 500)) return true;

  const message = error.message.toLowerCase();
  return [
    'quota',
    'rate limit',
    'resource_exhausted',
    'exhausted',
    'overloaded',
    'unavailable',
    'too many requests',
  ].some((pattern) => message.includes(pattern));
}

/**
 * Runs a drafting request on Gemini, and on OpenAI if Gemini cannot take it.
 *
 * The fallback's own failure is reported as the fallback's, with the original
 * Gemini error logged beside it — otherwise a quota problem on one provider
 * reads as a mystery on the other.
 */
async function draftObject<Schema extends z.ZodType>(
  schema: Schema,
  request: { messages: ModelMessage[] } | { prompt: string },
): Promise<z.infer<Schema>> {
  // generateObject's overloads resolve its return type from a *concrete*
  // schema; behind a generic one they collapse to unknown, and the prompt /
  // messages union defeats them again. The shape passed in is exactly what the
  // call sites used to pass inline, so it is asserted once here rather than
  // forcing every caller to repeat the provider wiring.
  const attempt = async (model: LanguageModel, providerOptions: unknown) => {
    const { object } = await generateObject({
      model,
      schema,
      ...request,
      providerOptions,
      abortSignal: AbortSignal.timeout(DRAFT_TIMEOUT_MS),
    } as Parameters<typeof generateObject>[0]);
    return object as z.infer<Schema>;
  };

  try {
    return await attempt(google(MODEL), THINKING);
  } catch (error) {
    if (!fallbackConfigured || !worthRetryingElsewhere(error)) throw error;

    console.warn('[ai] Gemini could not answer, falling back to OpenAI:', error);
    return attempt(openai(FALLBACK_MODEL), FALLBACK_EFFORT);
  }
}

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
  // This copy is only ever read by the model, never stored or served — the
  // saved design keeps the full, uncompressed original untouched. Sending
  // that original as-is here was the actual cause of "Draft with AI" being
  // slow: a 35MB source measured at 47s round trip, almost entirely upload
  // and vision-processing time on an image far larger than any model needs
  // to read text and logos off a poster. 1600px is comfortably above what
  // Gemini downsamples to internally anyway.
  const forModel = await sharp(image)
    .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 82 })
    .toBuffer();

  const object = await draftObject(designDraftSchema, {
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
          { type: 'file', data: forModel, mediaType: 'image/jpeg' },
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
  return draftObject(caseStudyDraftSchema, {
    prompt: [
      'Turn these rough notes about a software project into a structured case study',
      'for a portfolio site. Group related features into 2-5 pillars, each with a short',
      'name, a one-sentence summary, and 3-6 concrete bullet points pulled from the notes',
      '— do not invent features that are not mentioned.\n\nNotes:\n',
      notes,
    ].join(' '),
  });
}
