import type { NextConfig } from "next";

// Supabase Storage host for the `work` bucket, e.g.
// https://hpwejcvzyvixpnbepjyf.supabase.co — derived from the same env var
// the rest of the app uses, so there's one source of truth for it.
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

const nextConfig: NextConfig = {
  reactCompiler: true,
  experimental: {
    serverActions: {
      // Default is 1MB. Design uploads are full-resolution, uncompressed
      // originals (deliberately — see src/lib/images.ts) and routinely run
      // 10-35MB, so the default silently rejected every upload action before
      // it reached the handler. Comfortable headroom above the largest
      // source seen so far.
      bodySizeLimit: '50mb',
    },
    // proxy.ts runs on every /admin/* request (including these uploads) and
    // separately buffers the body with its own 10MB default — independent
    // of serverActions.bodySizeLimit above, and the one actually responsible
    // for silently truncating uploads and producing "Unexpected end of form"
    // downstream. The runtime's own warning message still points at the
    // deprecated `middlewareClientMaxBodySize` name; the build rejects
    // setting both, and confirms this is the current one.
    proxyClientMaxBodySize: '50mb',
  },
  images: {
    remotePatterns: supabaseHost
      ? [
          {
            protocol: 'https',
            hostname: supabaseHost,
            pathname: '/storage/v1/object/public/**',
          },
        ]
      : [],
  },
};

export default nextConfig;
