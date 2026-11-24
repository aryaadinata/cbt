import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    agentUpgrade: "security",
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    dangerouslyAllowLocalIP: true,
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "5005",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "5005",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "5000",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "5000",
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/api/cbt-backend/:path*",
        destination: "http://127.0.0.1:5005/:path*",
      },
      {
        source: "/api/siak-backend/:path*",
        destination: "http://127.0.0.1:5000/:path*",
      },
      {
        source: "/static/uploads/:path*",
        destination: "http://127.0.0.1:5005/static/uploads/:path*",
      },
    ];
  },
};

export default nextConfig;
