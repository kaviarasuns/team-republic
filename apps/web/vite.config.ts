import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite-plus";

// The browser calls the API on the page's own origin, so dev needs no CORS and auth cookies stay first-party.
const apiTarget = "http://localhost:4000";

export default defineConfig({
  plugins: [tanstackRouter({ target: "react", autoCodeSplitting: true }), react(), tailwindcss()],
  server: {
    strictPort: true,
    proxy: {
      "^/rpc$": apiTarget,
      "^/api/": apiTarget,
      "^/health$": apiTarget,
    },
  },
});
