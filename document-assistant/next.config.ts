import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfjs-dist relies on Node.js-relative worker resolution that breaks when bundled
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
};

export default nextConfig;
