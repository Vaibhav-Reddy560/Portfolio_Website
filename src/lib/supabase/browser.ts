import { createBrowserClient } from '@supabase/ssr';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './shared';

/**
 * Anonymous browser client, used only to push a file straight into Storage.
 *
 * Deliberately anonymous: an upload here is authorised by a one-shot signed
 * token minted server-side (see createUploadTicket), not by the caller's
 * session, so this client never needs — and never gets — write access of its
 * own. Everything else the admin does still goes through a Server Action.
 */
export function browserClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
