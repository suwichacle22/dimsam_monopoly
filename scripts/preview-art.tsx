// Dev helper: render every exported art component of a module into a static
// HTML grid, then screenshot it with headless Chromium.
//   bun scripts/preview-art.tsx src/art/tiles/setA.tsx /tmp/setA.png [cols] [cellPx]
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const [modPath, outPng = "/tmp/art-preview.png", colsArg = "5", cellArg = "180"] = process.argv.slice(2);
if (!modPath) throw new Error("usage: bun scripts/preview-art.tsx <module.tsx> [out.png] [cols] [cellPx]");
const mod = await import(resolve(modPath));
const cols = Number(colsArg);
const cell = Number(cellArg);
const entries = Object.entries(mod).filter(([, v]) => typeof v === "function");
const cells = entries
  .map(([name, Comp]) => {
    let html = "";
    try {
      html = renderToStaticMarkup(createElement(Comp as any, { animate: true }));
    } catch (e) {
      html = `<pre style="color:red;font-size:10px">${String(e)}</pre>`;
    }
    return `<div class="c"><div class="art">${html}</div><div class="n">${name}</div></div>`;
  })
  .join("");
const page = `<!doctype html><html><head><meta charset="utf-8"><style>
body{margin:0;background:#fff6e5;font-family:sans-serif}
.g{display:grid;grid-template-columns:repeat(${cols},${cell}px);gap:12px;padding:12px}
.c{background:#fff;border:1px solid #e0c9a6;border-radius:8px;overflow:hidden}
.art{width:${cell}px;height:${cell}px}
.art svg{width:100%;height:100%;display:block}
.n{font-size:11px;text-align:center;padding:4px;color:#6b4a2b}
</style></head><body><div class="g">${cells}</div></body></html>`;
const htmlPath = outPng.replace(/\.png$/, ".html");
writeFileSync(htmlPath, page);
const rows = Math.ceil(entries.length / cols);
const w = cols * (cell + 12) + 12;
const h = rows * (cell + 12 + 22) + 12;
const chrome = "/home/suwicha22/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome";
const r = spawnSync(chrome, [
  "--headless=new", "--no-sandbox", "--hide-scrollbars", "--allow-file-access-from-files",
  "--virtual-time-budget=1500", `--window-size=${w},${h}`, `--screenshot=${outPng}`, `file://${htmlPath}`,
], { stdio: "ignore" });
console.log(`rendered ${entries.length} components → ${htmlPath} and ${outPng} (chrome exit ${r.status})`);
