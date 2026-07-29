import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Allows production builds to successfully complete even if project has type errors
    ignoreBuildErrors: true,
  },
  eslint: {
    // Allows production builds to successfully complete even if project has ESLint errors
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
