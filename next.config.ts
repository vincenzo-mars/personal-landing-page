import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Static export for GitHub Pages. The repository is the user site, so the
  // whole thing is served from the root: no basePath, no asset prefix.
  output: "export",
  images: { unoptimized: true },
};

export default nextConfig;
