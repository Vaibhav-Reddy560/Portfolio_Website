import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Refreshes the Supabase auth session cookie on every request and blocks
 * unauthenticated access to /admin. Named `proxy.ts` per the Next.js 16
 * rename of `middleware.ts` — same mechanism, new file/export name.
 *
 * This is the actual gate: a client-side check alone would ship the admin UI
 * to anyone who requested it and only hide it visually.
 */
export async function proxy(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Unconfigured environment (e.g. a preview build before secrets are set):
  // fail closed on /admin rather than either crashing or leaving it open.
  if (!supabaseUrl || !supabaseKey) {
    if (request.nextUrl.pathname.startsWith('/admin')) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
    return NextResponse.next({ request });
  }

  const cookiesToSet: { name: string; value: string; options: Parameters<NextResponse['cookies']['set']>[2] }[] =
    [];

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        for (const { name, value } of toSet) {
          request.cookies.set(name, value);
        }
        cookiesToSet.push(...toSet);
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isLoginRoute = pathname === '/admin/login';
  const isAdminRoute = pathname.startsWith('/admin');

  const applyCookies = (res: NextResponse) => {
    for (const { name, value, options } of cookiesToSet) res.cookies.set(name, value, options);
    return res;
  };

  if (isAdminRoute && !isLoginRoute && !user) {
    const redirectUrl = new URL('/admin/login', request.url);
    redirectUrl.searchParams.set('next', pathname);
    return applyCookies(NextResponse.redirect(redirectUrl));
  }

  if (isLoginRoute && user) {
    return applyCookies(NextResponse.redirect(new URL('/admin', request.url)));
  }

  // Verified once here — forward the result via a request header so the
  // (protected) layout can trust it instead of paying for a second Supabase
  // Auth round trip on every single admin navigation. The layout still
  // falls back to a real check if this header is ever absent.
  const headers = new Headers(request.headers);
  if (user) headers.set('x-admin-email', user.email ?? '');
  return applyCookies(NextResponse.next({ request: { headers } }));
}

export const proxyConfig = {
  matcher: ['/admin/:path*'],
};
