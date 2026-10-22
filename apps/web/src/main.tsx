import { RegistryProvider } from "@effect/atom-react";
import { configureApiBaseUrl } from "@team-republic/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { LocaleProvider } from "./lib/locale.tsx";
import { RuntimeMount } from "./lib/runtime-mount.tsx";
import { routeTree } from "./routeTree.gen";
import "./styles.css";

configureApiBaseUrl(import.meta.env.VITE_API_URL ?? "http://localhost:4000");

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("Root element #root not found");
}

createRoot(rootEl).render(
  <StrictMode>
    <RegistryProvider>
      <RuntimeMount />
      <LocaleProvider>
        <RouterProvider router={router} />
      </LocaleProvider>
    </RegistryProvider>
  </StrictMode>,
);
