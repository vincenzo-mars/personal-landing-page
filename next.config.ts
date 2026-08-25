import type { NextConfig } from "next";

// Served from https://vincenzo-mars.github.io/personal-landing-page, so every
// route and asset lives under that prefix, not at the root.
const basePath = "/personal-landing-page";

const nextConfig: NextConfig = {
  reactCompiler: true,
  output: "export",
  basePath,
  assetPrefix: basePath,
  images: { unoptimized: true },
};

export default nextConfig;
