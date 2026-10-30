# Dimsam Monopoly

เกมเศรษฐีสองคนสำหรับเล่นกันบนมือถือ ธีมน้องติ่มซำ (ปอมเมอเรเนียน) 🐶

- กติกา/แผนที่/การ์ดทุกอย่างแก้ได้จากหน้า **ตั้งค่า** ในแอป (ไม่ต้องแก้โค้ด)
- เซิร์ฟเวอร์เป็นคนทอยเต๋าและคิดเงินทั้งหมด (Convex) มือถือแค่ส่งว่า "กดอะไร"
- หน้าจอของอีกคนอัปเดตทันทีแบบเรียลไทม์

## Stack
Bun · Vite · TanStack Start (SPA mode) · React 19 · Tailwind v4 · Convex

## Develop
```bash
bun install
CONVEX_AGENT_MODE=anonymous bunx convex dev   # local Convex backend on :3212 (no account needed)
bun run dev                                   # http://localhost:3100
bun run test                                  # rules engine tests
bun scripts/e2e.ts 4                          # two-player headless playthrough + screenshots in /tmp/dimsam_shots
```

## Deploy (once)
Free setup: **Convex** (backend, free tier) + **Cloudflare Pages** (frontend, free, no sleeping).

1. **Convex (backend)** — the CLI on this PC is not logged in, so use a deploy key instead of `convex login`
   (it also leaves the local `.env.local` untouched):
   - Convex dashboard → project `dimsam_monopoly` → **Settings → Deploy Keys → Generate production deploy key**.
   - In a terminal (never paste the key anywhere else):
     ```bash
     CONVEX_DEPLOY_KEY='prod:...' bunx convex deploy
     ```
   - **Settings → Environment Variables** → add `ROOM_PASSWORD` = รหัสห้องของเรา. If it is not set the password is `dimsam`.
   The board, cards and rules are seeded automatically the first time someone opens the room.
2. **Frontend on Cloudflare Pages** — push this repo to GitHub, then in the Cloudflare dashboard:
   **Workers & Pages → Create → Pages → Connect to Git** → pick `dimsam_monopoly` and set
   | Setting | Value |
   |---|---|
   | Build command | `bun install && bun run build` |
   | Build output directory | `dist/client` |
   | Environment variable | `VITE_CONVEX_URL` = `https://third-wren-155.ap-southeast-2.convex.cloud` |

   Every `git push` to `main` redeploys. The `_redirects` file in `dist/client` makes `/game` and `/settings` load directly.

   Without GitHub (upload from this PC instead):
   ```bash
   VITE_CONVEX_URL=https://third-wren-155.ap-southeast-2.convex.cloud bun run build
   bunx wrangler login
   bunx wrangler pages deploy dist/client --project-name dimsam-monopoly
   ```
   Vercel also works: output directory `dist/client` (`vercel.json` already rewrites to the SPA shell).

## Layout
- `convex/defaults.ts` — board tiles, cards, rules (seed data, copied into the DB on first run)
- `convex/engine.ts` — pure rules engine, tested in `convex/engine.test.ts`
- `convex/game.ts` / `convex/admin.ts` — player actions / settings API
- `src/art/` — all artwork as animated inline SVG (tiles, mascot, palette)
- `src/routes/` — `/` join + lobby, `/game` board, `/settings` editor
