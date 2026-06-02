import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  output: "standalone",
  reactStrictMode: true,
  transpilePackages: ["@loi-vao/assets", "@loi-vao/db"],
};

export default nextConfig;
