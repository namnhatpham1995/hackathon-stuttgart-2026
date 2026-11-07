import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The postgres driver is Node-only; keep it out of the bundle.
  serverExternalPackages: ["postgres"],
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL?.trim().replace(/\/$/, "");
    // Unset in local dev and on Railway. Set only on Vercel, to the Railway origin.
    if (!backendUrl) return [];
    // beforeFiles runs before app routes, so Vercel does not serve its own /api routes.
    return {
      beforeFiles: [
        {
          source: "/api/:path*",
          destination: `${backendUrl}/api/:path*`,
        },
      ],
    };
  },
};

export default nextConfig;
