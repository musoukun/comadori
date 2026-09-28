import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 親フォルダの package-lock.json を誤ってルート扱いしないようにする
  turbopack: { root: __dirname },
};

export default nextConfig;
