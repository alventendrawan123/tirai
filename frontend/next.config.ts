import path from "node:path";
import type { NextConfig } from "next";

const workspaceRoot = path.resolve(__dirname, "..");

const nextConfig: NextConfig = {
  reactCompiler: true,
  turbopack: {
    root: workspaceRoot,
    resolveAlias: {
      buffer: "buffer/",
      "node:buffer": "buffer/",
      "next/dist/compiled/buffer": "buffer/",
      process: "process/browser",
      "node:process": "process/browser",
    },
  },
  outputFileTracingRoot: workspaceRoot,
  transpilePackages: ["@tirai/api"],
};

export default nextConfig;
