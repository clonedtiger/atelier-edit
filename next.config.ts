import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // HTML pages are served through Firebase Hosting's CDN. Without this, the prerendered
  // home page is cached for a year and visitors keep getting the previous release after a
  // deploy. Hashed JS/CSS under /_next/static keep their long-lived immutable caching.
  async headers() {
    return [
      { source: "/", headers: [{ key: "Cache-Control", value: "no-cache, must-revalidate" }] },
      { source: "/admin", headers: [{ key: "Cache-Control", value: "no-cache, must-revalidate" }] },
    ];
  },
  images: {
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
};

export default nextConfig;
