import { Rivets } from '@/components/hardware';
import { LoginForm } from './login-form';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="panel relative">
          <Rivets />
          <header className="flex items-stretch justify-between border-b-2 border-navy bg-bone-dk">
            {/* Same nested-flex construction as the main site's window title
                bars: this inner row centers the badge/title vertically, while
                the outer header stays `items-stretch` so the hazard filler
                beside it can size to the full bar height. */}
            <div className="flex min-w-0 items-center gap-2 px-3 py-2">
              <span className="t-data shrink-0 border-2 border-navy bg-navy px-1.5 py-0.5 text-[10px] text-amber">
                ADM
              </span>
              <h1 className="t-head truncate text-sm uppercase tracking-wide sm:text-base">
                Operator Login
              </h1>
            </div>
            <div className="hidden flex-1 items-center px-2 py-2 sm:flex">
              <div className="hazard-thin h-full flex-1 opacity-70" />
            </div>
          </header>

          <div className="crt p-6">
            {/* relative + z-index above .crt's scanline/bloom pseudo-elements
                (::after is z-index:auto, ::before is z-index:1) keeps this on
                the CRT screen but painted above the overlay rather than under
                it — same fix already applied to the Sign In button below. */}
            <p className="t-data crt-text relative z-10 mb-5 text-[10px] uppercase tracking-[0.18em] text-phosphor/70">
              Authorised access only
            </p>
            <LoginForm next={next ?? '/admin'} />
          </div>
        </div>

        <p className="t-data mt-4 text-center text-[10px] uppercase tracking-[0.14em] text-bone/40">
          <a href="/" className="hover:text-bone/70">
            ← back to the site
          </a>
        </p>
      </div>
    </div>
  );
}
