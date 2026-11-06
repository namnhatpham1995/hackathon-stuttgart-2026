import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The postgres driver is Node-only; keep it out of the bundle.
  serverExternalPackages: ["postgres"],
};

export default nextConfig;
