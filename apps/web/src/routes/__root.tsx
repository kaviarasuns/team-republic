import { createRootRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { AppShell } from "../components/app-shell.tsx";

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  return (
    <AppShell fullWidth={pathname === "/map"}>
      <Outlet />
    </AppShell>
  );
}
