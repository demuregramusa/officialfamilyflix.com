import type { NextConfig } from "next";

const devOrigins = [
  "*",
  "**.replit.dev",
  "**.replit.app",
  "**.janeway.replit.dev",
  "127.0.0.1",
  "0.0.0.0",
  "localhost",
  "**.localhost",
  "e2b.local",
  "**.e2b.local",
  "**.e2b.app",
  "**.e2b.dev",
  "**.ideavo.ai",
  "**.ideavo.dev",
  "*.*",
  "*.*.*",
  "*.*.*.*",
  "*.*.*.*.*",
  "*.*.*.*.*.*",
  "*.*.*.*.*.*.*",
  "*.*.*.*.*.*.*.*",
];

const nextConfig: NextConfig = {
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
  reactCompiler: true,
  poweredByHeader: false,
  cacheComponents:false,
  images: {
    unoptimized: process.env.NODE_ENV === 'development',
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },
  allowedDevOrigins: devOrigins,
  eslint: {
    ignoreDuringBuilds: true,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
} as NextConfig;

export default nextConfig;
