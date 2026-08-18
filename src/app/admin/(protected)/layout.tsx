import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAdminUser } from '@/lib/supabase/server';
import { AdminNav } from './admin-nav';

/**
 * `proxy.ts` already blocks unauthenticated requests to every /admin/* route
 * except /admin/login before they reach the render, and forwards the email
 * of whichever user it verified via a request header — reading that here
 * avoids a second Supabase Auth network round trip on every admin
 * navigation. The direct `getAdminUser()` check only runs as a fallback, for
 * a render path that somehow reached this layout without going through the
 * proxy (the header would be absent), so this stays just as safe as the
 * original always-check version.
 */
export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const headerList = await headers();
  let email = headerList.get('x-admin-email');

  if (!email) {
    const user = await getAdminUser();
    if (!user) redirect('/admin/login');
    email = user.email ?? '';
  }

  return (
    <div className="min-h-screen pb-16 lg:pl-56">
      <AdminNav email={email} />
      <main className="shell max-w-4xl py-6 sm:py-10">{children}</main>
    </div>
  );
}
