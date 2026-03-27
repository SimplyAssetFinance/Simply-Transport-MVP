import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['react-grid-layout', 'react-resizable'],
  serverExternalPackages: ['pdf-parse'],
};

export default nextConfig;
