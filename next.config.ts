import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
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
