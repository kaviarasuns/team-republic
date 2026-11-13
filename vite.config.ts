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
      "apps/web/public/maps/**",
      "pnpm-lock.yaml",
      "*.md",
    ],
  },
});
