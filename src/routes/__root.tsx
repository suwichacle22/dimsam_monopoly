import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { useEffect } from "react";
import appCss from "../styles.css?url";
import { applyTheme, getTheme, THEME_BOOT_SCRIPT } from "~/lib/theme";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "Dimsam Monopoly" },
      { name: "theme-color", content: "#1a1210" },
    ],
    scripts: [{ children: THEME_BOOT_SCRIPT }],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Mitr:wght@400;500;600;700&display=swap" },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
    ],
  }),
  component: RootComponent,
  pendingComponent: () => <div className="p-8 text-center">กำลังโหลด…</div>,
});

function RootComponent() {
  // The inline head script already applied the theme before paint; re-apply after hydration in case it was stripped.
  useEffect(() => applyTheme(getTheme()), []);
  return (
    <html lang="th" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <Outlet />
        <Scripts />
      </body>
    </html>
  );
}
