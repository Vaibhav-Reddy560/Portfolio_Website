/**
 * The two values both sides need. Kept apart from server.ts so a client module
 * can read them without pulling in next/headers, which only exists on the
 * server and would break the build if it crossed over.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

/** True only when the environment is wired up; loaders fall back when false. */
export const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
