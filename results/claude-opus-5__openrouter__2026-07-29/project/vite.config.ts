import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist/web",
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:3000",
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    hookTimeout: 30000,
    testTimeout: 30000,
    pool: "forks",
  },
});
