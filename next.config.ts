import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["sharp"],
  experimental: {
    // Sharp tarvitsee tämän Vercelissä
  },
};

export default nextConfig;
