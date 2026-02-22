import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@openauth/providers'],
};

export default nextConfig;
