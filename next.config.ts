import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["sharp", "canvas", "pdfjs-dist"],
};

export default nextConfig;
