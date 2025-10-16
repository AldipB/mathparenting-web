// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },
  experimental: {
    // (leave empty unless you need specific flags)
  },
};

export default nextConfig;
