// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/api/chat",
        headers: [{ key: "Cache-Control", value: "no-store, no-transform" }],
      },
    ];
  },
};

export default nextConfig;
