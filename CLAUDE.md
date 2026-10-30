# Dimsam Monopoly

Two-player Monopoly web game themed around Dimsam the Pomeranian. Bun + Vite + TanStack Start (SPA mode) + Tailwind v4 + Convex.

## Dev server
- Always-on dev server runs in the background on **http://localhost:3100** (also reachable on the LAN at http://192.168.1.70:3100). Do not start another one; if it is down, restart it with:
  `cd /home/suwicha22/projects/dimsam_monopoly && setsid nohup bun run dev > /tmp/dimsam-dev.log 2>&1 &`
- Logs: `/tmp/dimsam-dev.log`. Port 3000 belongs to a different project, never use it here.
- Local Convex backend also runs in the background on **127.0.0.1:3212**: `setsid nohup bunx convex dev --typecheck disable --tail-logs disable > /tmp/dimsam-convex.log 2>&1 &`. The CLI is logged in to the user's Convex account (since 2026-10-30), so this is the project's local dev deployment `local-suwichacle22_gmail_com-dimsam_monopoly`, no `CONVEX_AGENT_MODE=anonymous` needed. It watches `convex/` and re-pushes on save. `.env.local` points `VITE_CONVEX_URL` at it via the LAN address `http://192.168.1.70:3212` (not 127.0.0.1, so phones/laptops on the Wi-Fi can connect). `convex dev` sometimes rewrites it back to 127.0.0.1; change it again and restart Vite (Vite does not reload `.env.local` on its own).
- Cloud deployment (production): https://third-wren-155.ap-southeast-2.convex.cloud (Convex project `dimsam-monopoly`, team `suwichacle22-gmail-com`; first deployed 2026-10-30). Deploy with `bunx convex deploy -y` (CLI is logged in). The production frontend is built with `VITE_CONVEX_URL=https://third-wren-155.ap-southeast-2.convex.cloud bun run build` and hosted on Cloudflare Pages from `dist/client`. `ROOM_PASSWORD` is set by the user in the Convex dashboard, never printed here.
- Two-player headless playthrough with screenshots: `bun scripts/e2e.ts <turns>` → `/tmp/dimsam_shots/` (resets the local room first).
- `git push` to GitHub works from this machine (user is logged in).

## Layout
- `convex/defaults.ts` seed data (board tiles, cards, rules) — the in-app settings screen edits the DB copies, not this file.
- `convex/engine.ts` pure rules engine (unit-tested in `convex/engine.test.ts`), `convex/game.ts` mutations/queries.
- `src/art/` all SVG artwork (tiles in `src/art/tiles/`, mascot in `src/art/Dimsam.tsx`, palette in `src/art/palette.ts`).
- `scripts/preview-art.tsx` renders an art module to PNG for visual checks.
- Physical game reference photos and CSVs live in `resource/` (not shipped).

## Conventions
- UI text is Thai. Money is baht, formatted with thousands separators.
- Every rule number must stay editable from the settings screen; never hard-code a value the rules object already has.
