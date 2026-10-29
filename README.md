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
1. **Convex (backend)** — log in on this PC and push the functions to the cloud deployment:
   ```bash
   bunx convex login
   bunx convex deploy            # pushes convex/ to the production deployment
   bunx convex env set ROOM_PASSWORD <รหัสห้องของเรา> --prod
   ```
   If `ROOM_PASSWORD` is not set the room password is `dimsam`.
2. **Frontend** — build with the cloud URL and host the `dist/client` folder on any static host
   (Cloudflare Pages or Vercel Hobby are free):
   ```bash
   VITE_CONVEX_URL=https://fine-mammoth-593.ap-southeast-2.convex.cloud bun run build
   ```
   - Cloudflare Pages: output directory `dist/client` (the `_redirects` file is already there).
   - Vercel: output directory `dist/client` (`vercel.json` already rewrites to the SPA shell).

## Layout
- `convex/defaults.ts` — board tiles, cards, rules (seed data, copied into the DB on first run)
- `convex/engine.ts` — pure rules engine, tested in `convex/engine.test.ts`
- `convex/game.ts` / `convex/admin.ts` — player actions / settings API
- `src/art/` — all artwork as animated inline SVG (tiles, mascot, palette)
- `src/routes/` — `/` join + lobby, `/game` board, `/settings` editor
