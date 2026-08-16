import { redirect } from 'next/navigation';
import { getAdminUser } from '@/lib/supabase/server';
import { AdminNav } from './admin-nav';

/**
 * `proxy.ts` already blocks unauthenticated requests to every /admin/* route
 * except /admin/login before they reach the render — this is the second,
 * independent check inside the render itself. Living in the (protected)
 * route group (login sits in a separate (auth) group) means this redirect
 * can never loop back into a page this same layout also guards.
 */
export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const user = await getAdminUser();
  if (!user) redirect('/admin/login');

  return (
    <div className="min-h-screen pb-16 lg:pl-56">
      <AdminNav email={user.email ?? ''} />
      <main className="shell max-w-4xl py-6 sm:py-10">{children}</main>
    </div>
  );
}
