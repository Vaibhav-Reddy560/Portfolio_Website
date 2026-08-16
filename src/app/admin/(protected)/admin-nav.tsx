'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { signOut } from '../(auth)/login/actions';

const LINKS = [
  { href: '/admin', label: 'Dashboard', index: '00' },
  { href: '/admin/work', label: 'Designs', index: '01' },
  { href: '/admin/projects', label: 'Projects', index: '02' },
  { href: '/admin/experience', label: 'Experience', index: '03' },
  { href: '/admin/skills', label: 'Skills', index: '04' },
  { href: '/admin/education', label: 'Education', index: '05' },
  { href: '/admin/profile', label: 'Profile', index: '06' },
] as const;

export function AdminNav({ email }: { email: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const handleSignOut = () => {
    startTransition(async () => {
      await signOut();
      router.push('/admin/login');
      router.refresh();
    });
  };

  return (
    <>
      <nav
        aria-label="Portal sections"
        className="fixed left-0 top-0 z-40 hidden h-full w-56 flex-col border-r-2 border-navy bg-bone lg:flex"
      >
        <div className="hazard-thin h-2" />
        <div className="border-b-2 border-navy px-4 py-4">
          <p className="t-label text-navy/50">Portal</p>
          <p className="t-head mt-1 text-lg uppercase leading-none">Control</p>
        </div>

        <ol className="flex-1 space-y-1 p-3">
          {LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={active ? 'page' : undefined}
                  className={`flex items-center gap-2 px-2 py-2 text-sm transition-colors ${
                    active
                      ? 'bg-navy text-amber'
                      : 'text-navy/70 hover:bg-bone-dk hover:text-navy'
                  }`}
                >
                  <span className="t-data text-[10px] opacity-60">{link.index}</span>
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ol>

        <div className="border-t-2 border-navy p-3">
          <p className="t-data mb-2 truncate text-[10px] text-navy/50" title={email}>
            {email}
          </p>
          <a href="/" className="btn mb-2 w-full py-1.5 text-[11px]">
            View site ↗
          </a>
          <button
            type="button"
            disabled={pending}
            onClick={handleSignOut}
            className="btn w-full py-1.5 text-[11px]"
          >
            {pending ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </nav>

      {/* Mobile top bar */}
      <nav
        aria-label="Portal sections"
        className="fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b-2 border-navy bg-bone px-4 py-2.5 lg:hidden"
      >
        <Link href="/admin" className="t-head text-sm uppercase">
          Control
        </Link>
        <div className="flex items-center gap-3">
          <a href="/" className="t-data text-[10px] uppercase text-navy/60">
            Site ↗
          </a>
          <button
            type="button"
            disabled={pending}
            onClick={handleSignOut}
            className="t-data text-[10px] uppercase text-rust"
          >
            Sign out
          </button>
        </div>
      </nav>
      <div className="h-12 lg:hidden" aria-hidden />

      {/* Mobile section links */}
      <div className="mb-4 flex gap-1.5 overflow-x-auto px-4 pt-2 lg:hidden">
        {LINKS.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`t-data shrink-0 whitespace-nowrap border px-2.5 py-1 text-[10px] uppercase ${
                active ? 'border-navy bg-navy text-amber' : 'border-navy/30 text-navy/60'
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </>
  );
}
