import path from "node:path";
import type { NextConfig } from "next";

const workspaceRoot = path.resolve(__dirname, "..");

const nextConfig: NextConfig = {
  reactCompiler: true,
  turbopack: {
    root: workspaceRoot,
  },
  outputFileTracingRoot: workspaceRoot,
  transpilePackages: ["@tirai/api"],
};

export default nextConfig;
