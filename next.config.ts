// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // ✅ Do not fail the build because of ESLint or parsing errors
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Optional: uncomment to ignore TS build-time errors in prod
    // ignoreBuildErrors: true,
  },
  images: {
    // Allow external images if needed later
    domains: ["localhost", "vercel.app"],
  },
  reactStrictMode: true,
};

export default nextConfig;
