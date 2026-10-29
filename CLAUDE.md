# Dimsam Monopoly

Two-player Monopoly web game themed around Dimsam the Pomeranian. Bun + Vite + TanStack Start (SPA mode) + Tailwind v4 + Convex.

## Dev server
- Always-on dev server runs in the background on **http://localhost:3100** (also reachable on the LAN at http://192.168.1.70:3100). Do not start another one; if it is down, restart it with:
  `cd /home/suwicha22/projects/dimsam_monopoly && setsid nohup bun run dev > /tmp/dimsam-dev.log 2>&1 &`
- Logs: `/tmp/dimsam-dev.log`. Port 3000 belongs to a different project, never use it here.
- Local Convex backend (anonymous, no account) also runs in the background on **127.0.0.1:3212**: `CONVEX_AGENT_MODE=anonymous setsid nohup bunx convex dev --typecheck disable --tail-logs disable > /tmp/dimsam-convex.log 2>&1 &`. It watches `convex/` and re-pushes on save. `.env.local` points `VITE_CONVEX_URL` at it during development.
- Cloud deployment (production): https://fine-mammoth-593.ap-southeast-2.convex.cloud. Pushing there needs `bunx convex login` (user's account) then `bunx convex deploy`; the production frontend is built with `VITE_CONVEX_URL=<cloud url> bun run build`.
- Two-player headless playthrough with screenshots: `bun scripts/e2e.ts <turns>` → `/tmp/dimsam_shots/` (resets the local room first).
- GitHub remote has no credentials on this machine; the user pushes.

## Layout
- `convex/defaults.ts` seed data (board tiles, cards, rules) — the in-app settings screen edits the DB copies, not this file.
- `convex/engine.ts` pure rules engine (unit-tested in `convex/engine.test.ts`), `convex/game.ts` mutations/queries.
- `src/art/` all SVG artwork (tiles in `src/art/tiles/`, mascot in `src/art/Dimsam.tsx`, palette in `src/art/palette.ts`).
- `scripts/preview-art.tsx` renders an art module to PNG for visual checks.
- Physical game reference photos and CSVs live in `resource/` (not shipped).

## Conventions
- UI text is Thai. Money is baht, formatted with thousands separators.
- Every rule number must stay editable from the settings screen; never hard-code a value the rules object already has.
