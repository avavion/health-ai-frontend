import type { NextConfig } from 'next';

const config: NextConfig = {
  output: 'standalone', // нужно для Docker-образа
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: { typedRoutes: true },
};

export default config;
