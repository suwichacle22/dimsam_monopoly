import { createRouter } from "@tanstack/react-router";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { routeTree } from "./routeTree.gen";

let convex: ConvexReactClient | null = null;
function getConvex() {
  if (typeof window === "undefined") return null;
  if (!convex) {
    const url = import.meta.env.VITE_CONVEX_URL as string | undefined;
    convex = new ConvexReactClient(url ?? "https://placeholder.convex.cloud", {
      skipConvexDeploymentUrlCheck: true,
    });
  }
  return convex;
}

export function getRouter() {
  return createRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: "intent",
    Wrap: ({ children }) => {
      const client = getConvex();
      return client ? <ConvexProvider client={client}>{children}</ConvexProvider> : <>{children}</>;
    },
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
