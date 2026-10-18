/**
 * Tells "the backend is not there" apart from "the backend said no".
 *
 * Both arrive as an `error` object from supabase-js, and conflating them is
 * what turned a suspended project into "Incorrect email or password" on the
 * login screen and "Face ID isn't set up yet" on the camera path — two
 * confident, wrong answers that sent the operator looking for a typo and an
 * enrollment that were both fine.
 *
 * Auth failures carry an HTTP status from the auth API (400/401/422 for a real
 * rejection); a transport failure carries none, or a 5xx, or arrives as
 * AuthRetryableFetchError. PostgREST does not throw on a dead host either — it
 * returns an error whose message is the underlying fetch failure, so the
 * message patterns below cover DNS, refused connections and TLS failures.
 */
export type SupabaseErrorLike = {
  name?: string;
  status?: number;
  code?: string;
  message?: string;
} | null;

const TRANSPORT_PATTERNS = [
  'fetch failed',
  'failed to fetch',
  'network',
  'getaddrinfo',
  'enotfound',
  'econnrefused',
  'econnreset',
  'etimedout',
  'socket hang up',
  'timeout',
];

export function isBackendUnreachable(error: SupabaseErrorLike): boolean {
  if (!error) return false;

  // supabase-js wraps transport failures in this before any status exists.
  if (error.name === 'AuthRetryableFetchError') return true;

  // 0 is "never got a response"; 5xx is the service failing rather than
  // rejecting. A 4xx is a genuine answer and must not land here.
  if (typeof error.status === 'number' && (error.status === 0 || error.status >= 500)) return true;

  const message = (error.message ?? '').toLowerCase();
  return TRANSPORT_PATTERNS.some((pattern) => message.includes(pattern));
}
