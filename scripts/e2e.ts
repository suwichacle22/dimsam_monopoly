// Drives two players through a game in headless Chromium and saves screenshots.
//   bun scripts/e2e.ts [turns=6] [outDir=/tmp/dimsam_shots]
import { chromium, type Page } from "playwright-core";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:3100";
const CHROME = "/home/suwicha22/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome";
const turns = Number(process.argv[2] ?? 6);
const out = process.argv[3] ?? "/tmp/dimsam_shots";
mkdirSync(out, { recursive: true });

// start from an empty room
const CONVEX = process.env.CONVEX_URL ?? "http://127.0.0.1:3212";
await fetch(`${CONVEX}/api/mutation`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ path: "admin:wipeGames", args: { password: "dimsam" } }),
});

const browser = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] });
const ctxA = await browser.newContext({ viewport: { width: 1280, height: 860 } });
const ctxB = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
const A = await ctxA.newPage();
const B = await ctxB.newPage();
for (const p of [A, B]) p.on("pageerror", (e) => console.log("PAGE ERROR", e.message));
for (const p of [A, B]) p.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE", m.text().slice(0, 300)); });

async function login(p: Page, name: string, seat: number, variant: "blue" | "pink") {
  await p.goto(BASE + "/");
  await p.getByPlaceholder("••••••").fill("dimsam");
  await p.getByRole("button", { name: "เข้าห้อง" }).click();
  await p.getByPlaceholder("เช่น ปอ").waitFor();
  await p.getByPlaceholder("เช่น ปอ").fill(name);
  await p.getByText(variant === "blue" ? "ปลอกคอฟ้า" : "โบว์ชมพู").click();
  const seats = p.getByRole("button", { name: "นั่งตรงนี้" });
  await seats.nth(seat === 0 ? 0 : (await seats.count()) - 1).click();
  await p.getByText("ลุกออก").waitFor();
}

await login(A, "ปอ", 0, "blue");
await A.screenshot({ path: `${out}/lobby_a.png` });
await login(B, "แพร", 1, "pink");
await B.screenshot({ path: `${out}/lobby_b.png` });
await A.getByRole("button", { name: "เริ่มเกม!" }).click();
await A.waitForURL("**/game");
await B.waitForURL("**/game", { timeout: 15000 });
await A.waitForTimeout(1500);
await A.screenshot({ path: `${out}/game_desktop_start.png` });
await B.screenshot({ path: `${out}/game_phone_start.png`, fullPage: true });

const pages = [A, B];
let shot = 0;
async function step(p: Page, label: string) {
  // pick whichever action button is available
  const buttons = ["ทอยลูกเต๋า", "ทอยหาเบิ้ล", "ซื้อเลย", "ไม่ซื้อ", "อยู่ตรงนี้", "ทอยอีกครั้ง", "จบตา", "ยอมแพ้"];
  for (let tries = 0; tries < 40; tries++) {
    // dismiss card toast
    const close = p.getByText("แตะเพื่อปิด");
    if (await close.isVisible().catch(() => false)) await close.click();
    for (const b of buttons) {
      const btn = p.getByRole("button", { name: b, exact: false }).first();
      if ((await btn.isVisible().catch(() => false)) && (await btn.isEnabled().catch(() => false))) {
        if (b === "ซื้อเลย" || b === "ทอยลูกเต๋า" || b === "ทอยหาเบิ้ล") {
          await btn.click();
          await p.waitForTimeout(3500);
          await p.screenshot({ path: `${out}/t${String(++shot).padStart(2, "0")}_${label}_${b === "ซื้อเลย" ? "buy" : "roll"}.png` });
          return true;
        }
        if (b === "ยอมแพ้") return false;
        await btn.click();
        await p.waitForTimeout(600);
        if (b === "จบตา") return true;
        return true;
      }
    }
    await p.waitForTimeout(400);
  }
  return false;
}

for (let t = 0; t < turns; t++) {
  for (const p of pages) {
    // keep acting while this page has buttons
    for (let i = 0; i < 6; i++) {
      const acted = await step(p, p === A ? "A" : "B");
      if (!acted) break;
      const waiting = await p.getByText(/^รอ /).isVisible().catch(() => false);
      if (waiting) break;
    }
  }
}
await A.waitForTimeout(800);
await A.screenshot({ path: `${out}/final_desktop.png` });
await B.screenshot({ path: `${out}/final_phone.png`, fullPage: true });
// tile sheet + settings on phone
await B.locator("button[style*='grid-row']").nth(3).click();
await B.waitForTimeout(500);
await B.screenshot({ path: `${out}/tile_sheet_phone.png` });
await B.getByRole("button", { name: "ปิด" }).click();
await A.goto(BASE + "/settings");
await A.waitForTimeout(1500);
await A.screenshot({ path: `${out}/settings_rules.png`, fullPage: true });
await A.getByRole("button", { name: "แผนที่ (40 ช่อง)" }).click();
await A.getByRole("button", { name: "แก้ไข" }).nth(1).click();
await A.waitForTimeout(400);
await A.screenshot({ path: `${out}/settings_tiles.png` });
await A.getByRole("button", { name: "การ์ด" }).click();
await A.getByRole("button", { name: "ผล" }).first().click();
await A.waitForTimeout(400);
await A.screenshot({ path: `${out}/settings_cards.png` });
await browser.close();
console.log("done, screenshots in", out);
