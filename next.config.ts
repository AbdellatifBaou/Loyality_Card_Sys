import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/:slug/manifest.json',
        destination: '/api/manifest/:slug?type=scanner',
      },
      {
        source: '/dashboard/:slug/manifest.json',
        destination: '/api/manifest/:slug?type=dashboard',
      },
    ];
  },
};

export default nextConfig;
