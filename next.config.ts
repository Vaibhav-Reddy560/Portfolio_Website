import type { NextConfig } from "next";

// Supabase Storage host for the `work` bucket, e.g.
// https://hpwejcvzyvixpnbepjyf.supabase.co — derived from the same env var
// the rest of the app uses, so there's one source of truth for it.
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

const nextConfig: NextConfig = {
  reactCompiler: true,
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
