import { defineConfig } from "vite-plus";

export default defineConfig({
  lint: {
    ignorePatterns: [
      "**/dist/**",
      "**/node_modules/**",
      "**/.expo/**",
      "apps/api/drizzle/**",
      "apps/web/src/routeTree.gen.ts",
    ],
  },
  fmt: {
    ignorePatterns: [
      "**/dist/**",
      "apps/api/drizzle/**",
      "apps/web/src/routeTree.gen.ts",
      "pnpm-lock.yaml",
      "*.md",
    ],
  },
});
