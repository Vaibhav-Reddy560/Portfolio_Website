import type { Metadata } from 'next';

/**
 * Shared shell for everything under /admin. Kept intentionally thin: the
 * two route groups below it — (auth) for the public login page and
 * (protected) for the authenticated dashboard — each carry their own layout,
 * so this one has nothing to guard and cannot create a redirect loop between
 * "no session → redirect to login" and "login page itself requires a session".
 */
export const metadata: Metadata = {
  title: { default: 'Portal', template: '%s — Portal' },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
