/**
 * Daily touch on the database, so Supabase's free plan never pauses it.
 *
 * A free project is paused after 7 consecutive days with no activity, and this
 * site only talks to Supabase when somebody loads a page — so a quiet week is
 * enough to put the whole backend to sleep, taking the admin, login and
 * anything not committed to the repo with it. That is what happened in October
 * 2026. One scheduled read a day is all it takes to prevent, and it costs a
 * single row.
 *
 * Doubles as a health check: a non-200 from this route means the database is
 * genuinely unreachable, which is exactly what an uptime monitor should page
 * on. The schedule lives in vercel.json.
 */
import { NextResponse } from 'next/server';
import { isBackendUnreachable } from '@/lib/supabase/reachability';
import { readClient, supabaseConfigured } from '@/lib/supabase/server';

/** Never prerendered or cached — a cached hit would touch nothing. */
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // Vercel signs scheduled invocations with this when CRON_SECRET is set. It is
  // optional so the route keeps working (and stays hand-checkable) without it.
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  if (!supabaseConfigured) {
    return NextResponse.json({ database: 'unconfigured' }, { status: 503 });
  }

  try {
    const { error } = await readClient().from('designs').select('slug').limit(1);
    if (error) throw error;
    return NextResponse.json({ database: 'awake', checkedAt: new Date().toISOString() });
  } catch (error) {
    console.error('[keep-alive] database unreachable:', error);
    return NextResponse.json(
      {
        database: isBackendUnreachable(error as { message?: string }) ? 'unreachable' : 'erroring',
        checkedAt: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
