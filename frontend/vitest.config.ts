import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "jsdom",
    globals: false,
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/{unit,integration,security}/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      thresholds: {
        lines: 80,
        branches: 70,
        functions: 80,
        statements: 80,
      },
      include: [
        "src/lib/**/*.{ts,tsx}",
        "src/features/**/*.{ts,tsx}",
        "src/services/**/*.{ts,tsx}",
        "src/components/ui/**/*.{ts,tsx}",
      ],
      exclude: [
        "src/**/index.ts",
        "src/**/__fixtures__/**",
      ],
    },
  },
});
