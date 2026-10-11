import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  async rewrites() {
    return [
      {
        source: '/api/v1/v1/:path*',
        destination: '/api/v1/:path*',
      },
      {
        source: '/v1/:path*',
        destination: '/api/v1/:path*',
      },
    ];
  },
  async redirects() {
    return [
      // Typo redirect → correct spelling
      {
        source: '/regestrierung',
        destination: '/registrierung',
        permanent: false,
      },
      // Short alias
      {
        source: '/admin',
        destination: '/registrierung',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
