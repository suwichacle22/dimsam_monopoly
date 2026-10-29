// Builds public/mockups/buy-options.html: the real board rendered statically,
// with four alternative placements for the "buy this land?" decision.
//   bun scripts/mock-buy.tsx
import { renderToStaticMarkup } from "react-dom/server";
import { createElement as h } from "react";
import { writeFileSync } from "node:fs";
import { Board } from "../src/components/Board";
import { Dimsam } from "../src/art/Dimsam";
import { TILE_ART } from "../src/art/tiles";
import { DEFAULT_RULES, DEFAULT_TILES } from "../convex/defaults";
import type { GameView } from "../src/lib/game";

const LANDED = 18; // ผจญภัยโจรสลัด
const tile = DEFAULT_TILES.find((t) => t.index === LANDED)!;

const view = {
  me: 1,
  game: {
    _id: "g" as never,
    status: "playing",
    turn: 1,
    phase: "buy",
    dice: [4, 4],
    doublesCount: 1,
    lastRollDouble: true,
    builtThisTurn: 0,
    pending: { kind: "buy", tileIndex: LANDED },
    treasureDeck: undefined as never,
    specialDeck: undefined as never,
    treasureCount: 16,
    specialCount: 16,
    moves: [],
    actionAt: 0,
    createdAt: 0,
  },
  players: [
    { seat: 0, name: "ปอ", variant: "blue", cash: 24050, position: 12, inJail: false, jailTurns: 0, skipTurns: 0, bankrupt: false, online: true },
    { seat: 1, name: "แพร", variant: "pink", cash: 27750, position: LANDED, inJail: false, jailTurns: 0, skipTurns: 0, bankrupt: false, online: true },
  ],
  props: [
    { tileIndex: 12, ownerSeat: 0, houses: 0, landmark: false },
    { tileIndex: 21, ownerSeat: 0, houses: 1, landmark: false },
    { tileIndex: 1, ownerSeat: 1, houses: 0, landmark: false },
  ],
  tiles: DEFAULT_TILES,
  rules: DEFAULT_RULES,
  events: [],
} as unknown as GameView;

const board = renderToStaticMarkup(
  h(Board, { view, displayPos: [12, LANDED], hop: 0, mood: "think", dice: [4, 4], rolling: false, animate: true, onTileClick: () => {} }),
);
const deedArt = renderToStaticMarkup(h(TILE_ART[LANDED], { animate: true }));
const dogThink = renderToStaticMarkup(h(Dimsam, { mood: "think", variant: "pink" }));
const dogHappy = renderToStaticMarkup(h(Dimsam, { mood: "happy", variant: "pink" }));
const css = await (await fetch("http://localhost:3100/src/styles.css?direct")).text();

const rentRows = ["ที่ดินเปล่า", "บ้าน 1", "บ้าน 2", "บ้าน 3", "บ้าน 4", "แลนด์มาร์ก ★"]
  .map((l, i) => `<tr><td>${l}</td><td>${tile.rent![i].toLocaleString()}</td></tr>`)
  .join("");
const price = tile.price!.toLocaleString();
const withHouse = (tile.price! + tile.housePrice!).toLocaleString();

const buttons = (compact = false) => `
  <div class="mk-btns ${compact ? "compact" : ""}">
    <button class="mk-b primary">ซื้อที่ดิน <span>${price} ฿</span></button>
    <button class="mk-b green">ที่ดิน + บ้าน 1 หลัง <span>${withHouse} ฿</span></button>
    <button class="mk-b ghost">ไม่ซื้อ</button>
  </div>`;

const deed = `
  <div class="mk-deed">
    <div class="mk-band"></div>
    <div class="mk-deed-top">
      <div class="mk-art">${deedArt}</div>
      <div>
        <div class="mk-kicker">ยังไม่มีเจ้าของ · เมือง</div>
        <div class="mk-title">${tile.name}</div>
        <div class="mk-sub">${tile.blurb}</div>
        <div class="mk-price">ราคา <b>${price} ฿</b> · บ้านหลังละ ${tile.housePrice!.toLocaleString()} ฿</div>
      </div>
    </div>
    <table class="mk-rent">${rentRows}</table>
    ${buttons()}
  </div>`;

const html = `<!doctype html>
<html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Mock-up: ตำแหน่งปุ่มซื้อที่ดิน</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Mitr:wght@400;500;600;700&display=swap">
<style>${css}</style>
<style>
  body { padding: 16px; max-width: 1100px; margin: 0 auto; }
  h1 { font-size: 22px; font-weight: 700; color: #6b4a2b; }
  .intro { color: #6b4a2b; opacity: .8; font-size: 14px; margin: 4px 0 12px; }
  .tabs { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
  .tab { border: 2px solid rgba(107,74,43,.2); background: #fff; border-radius: 999px; padding: 8px 14px; font-weight: 600; color: #6b4a2b; cursor: pointer; }
  .tab.on { background: #fdebc8; border-color: #e0a458; }
  .desc { background: #fff; border: 2px solid rgba(107,74,43,.15); border-radius: 16px; padding: 12px 14px; font-size: 14px; color: #4a3119; margin-bottom: 12px; }
  .desc b { color: #6b4a2b; }
  .frames { display: flex; gap: 20px; align-items: flex-start; flex-wrap: wrap; }
  .frame { position: relative; background: #fff6e5; border: 10px solid #2f2118; border-radius: 34px; overflow: hidden; flex: none; }
  .frame.phone { width: 390px; height: 760px; }
  .frame.desk { width: 640px; height: 640px; border-radius: 14px; border-width: 6px; }
  .frame .inner { position: absolute; inset: 0; overflow: hidden; }
  .frame.phone .inner { padding: 8px; }
  .frame.desk .inner { padding: 10px; }
  .label { font-size: 12px; color: #6b4a2b; opacity: .7; margin-top: 6px; text-align: center; }
  .opt { display: none; } .opt.on { display: block; }
  .mk-overlay { position: absolute; inset: 0; pointer-events: none; }
  .mk-overlay > * { pointer-events: auto; }
  .mk-deed { background: #fff; border: 2px solid rgba(107,74,43,.25); border-radius: 20px; box-shadow: 0 10px 0 rgba(107,74,43,.15), 0 20px 40px rgba(74,49,25,.25); overflow: hidden; font-family: Mitr, sans-serif; color: #4a3119; }
  .mk-band { height: 10px; background: ${"#f08a2b"}; }
  .mk-deed-top { display: flex; gap: 10px; padding: 10px 12px 4px; }
  .mk-art { width: 72px; height: 72px; flex: none; border-radius: 14px; overflow: hidden; border: 1px solid rgba(107,74,43,.2); }
  .mk-art svg { width: 100%; height: 100%; display: block; }
  .mk-kicker { font-size: 10px; color: rgba(107,74,43,.6); }
  .mk-title { font-size: 18px; font-weight: 700; color: #6b4a2b; line-height: 1.1; }
  .mk-sub { font-size: 11px; color: rgba(107,74,43,.7); }
  .mk-price { font-size: 12px; margin-top: 2px; }
  .mk-rent { width: calc(100% - 24px); margin: 2px 12px; font-size: 11px; border-collapse: collapse; }
  .mk-rent td { padding: 1px 0; } .mk-rent td:last-child { text-align: right; font-variant-numeric: tabular-nums; }
  .mk-btns { display: flex; flex-direction: column; gap: 6px; padding: 8px 12px 12px; }
  .mk-btns.compact { flex-direction: row; flex-wrap: wrap; }
  .mk-b { border: 0; border-radius: 14px; padding: 10px 12px; font-family: Mitr, sans-serif; font-weight: 600; font-size: 14px; display: flex; justify-content: space-between; gap: 8px; cursor: pointer; }
  .mk-b span { opacity: .85; font-weight: 500; }
  .mk-b.primary { background: #e0a458; color: #fff; box-shadow: 0 4px 0 #b9803a; }
  .mk-b.green { background: #5cb85c; color: #fff; box-shadow: 0 4px 0 #3f8f3f; }
  .mk-b.ghost { background: #fff; color: #6b4a2b; border: 2px solid rgba(107,74,43,.2); box-shadow: 0 3px 0 rgba(107,74,43,.2); }
  .mk-btns.compact .mk-b { flex: 1 1 45%; font-size: 12px; padding: 8px 10px; }
  .mk-dog { position: absolute; width: 24%; aspect-ratio: 1; }
  .mk-dog svg { width: 100%; height: 100%; }
  /* A: deed replaces the mascot in the centre */
  .optA .mk-deed { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: 62%; max-width: 360px; }
  .optA .mk-dog { left: 13%; top: 60%; width: 16%; }
  /* B: speech bubble anchored to the tile */
  .optB .mk-bubble { position: absolute; background: #fff; border: 2px solid rgba(107,74,43,.3); border-radius: 18px; box-shadow: 0 8px 0 rgba(107,74,43,.15), 0 16px 30px rgba(74,49,25,.25); width: 58%; max-width: 330px; }
  .optB .mk-bubble:before { content: ""; position: absolute; left: -16px; top: 40px; border: 9px solid transparent; border-right-color: #fff; filter: drop-shadow(-2px 0 0 rgba(107,74,43,.3)); }
  .optB .mk-bubble .mk-deed { border: 0; box-shadow: none; border-radius: 16px; }
  .optB .mk-bubble .mk-rent { display: none; }
  .optB .mk-glow { position: absolute; border-radius: 10px; box-shadow: 0 0 0 4px #e0a458, 0 0 24px 8px rgba(224,164,88,.8); animation: glow-turn 1.4s infinite; }
  .optB .mk-dog { left: 50%; top: 54%; transform: translate(-50%, -50%); width: 30%; }
  /* C: bottom sheet */
  .optC .mk-sheet { position: absolute; left: 0; right: 0; bottom: 0; background: #fff; border-radius: 24px 24px 0 0; border-top: 2px solid rgba(107,74,43,.2); box-shadow: 0 -12px 40px rgba(74,49,25,.3); }
  .optC .mk-sheet .mk-deed { border: 0; box-shadow: none; border-radius: 0; }
  .optC .mk-sheet .mk-band { display: none; }
  .optC .mk-handle { width: 44px; height: 5px; border-radius: 3px; background: rgba(107,74,43,.25); margin: 8px auto 0; }
  .optC .mk-dim { position: absolute; inset: 0; background: rgba(74,49,25,.25); }
  /* D: Dimsam asks, buttons under the mascot in the centre, tap tile for details */
  .optD .mk-ask { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -52%); width: 68%; max-width: 380px; display: flex; flex-direction: column; align-items: center; gap: 6px; }
  .optD .mk-ask .mk-dog { position: static; width: 44%; }
  .optD .mk-say { background: #fff; border: 2px solid rgba(107,74,43,.3); border-radius: 18px; padding: 10px 14px; font-family: Mitr, sans-serif; color: #4a3119; text-align: center; position: relative; box-shadow: 0 6px 0 rgba(107,74,43,.12); width: 100%; }
  .optD .mk-say:after { content: ""; position: absolute; left: 50%; top: -12px; margin-left: -8px; border: 8px solid transparent; border-bottom-color: #fff; border-top: 0; }
  .optD .mk-say .mk-title { font-size: 17px; }
  .optD .mk-say .mk-btns { padding: 8px 0 0; }
  .optD .mk-say .mk-btns .mk-b { font-size: 13px; padding: 9px 10px; }
  .optD .mk-link { font-size: 11px; color: rgba(107,74,43,.7); text-decoration: underline; }
  .optD .mk-glow { position: absolute; border-radius: 10px; box-shadow: 0 0 0 3px #e0a458, 0 0 20px 6px rgba(224,164,88,.7); animation: glow-turn 1.4s infinite; }
  .frame.phone .optA .mk-rent, .frame.phone.optA .mk-rent { display: none; }
  .frame.phone.optA .mk-deed { width: 82% !important; }
  .frame.phone.optA .mk-deed-top { padding-bottom: 0; }
  .frame.phone.optD .mk-ask { transform: translate(-50%, -58%); }
  .frame.phone.optD .mk-ask .mk-dog { width: 36%; }
  .note { margin-top: 20px; font-size: 13px; color: #6b4a2b; opacity: .85; }
</style></head>
<body>
<h1>ปุ่มซื้อที่ดิน ควรอยู่ตรงไหน?</h1>
<p class="intro">ตอนนี้ปุ่มอยู่ในแผงด้านข้าง (มือถือต้องเลื่อนลงไปกด) ลองดู 4 แบบนี้ แล้วบอกว่าชอบแบบไหน แตะแท็บเพื่อสลับ ทุกแบบใช้กระดานจริง</p>
<div class="tabs">
  <button class="tab on" data-o="A">A · โฉนดกลางกระดาน</button>
  <button class="tab" data-o="B">B · บอลลูนชี้ที่ช่อง</button>
  <button class="tab" data-o="C">C · แผ่นเลื่อนจากล่าง</button>
  <button class="tab" data-o="D">D · ติ่มซำถาม</button>
</div>
<div class="desc" id="desc"></div>
<div class="frames" id="frames"></div>
<p class="note">หมายเหตุ: แบบ A กับ D ไม่บังกระดานเลย แบบ B บังช่องข้างเคียงนิดหน่อย แบบ C บังครึ่งล่างชั่วคราวแต่กดง่ายที่สุดด้วยนิ้วโป้ง ทุกแบบมีปุ่ม "ดูค่าเช่า" เปิดรายละเอียดเต็มได้เหมือนเดิม</p>
<script>
const board = ${JSON.stringify(board)};
const deed = ${JSON.stringify(deed)};
const dogThink = ${JSON.stringify(dogThink)};
const dogHappy = ${JSON.stringify(dogHappy)};
const btnsCompact = ${JSON.stringify(buttons(true))};
const descs = {
  A: "<b>โฉนดกลางกระดาน</b> — พอเดินถึงที่ดินว่าง โฉนดของช่องนั้นเด้งขึ้นมาแทนที่ติ่มซำตรงกลาง มีรูป ราคา ตารางค่าเช่าย่อ และปุ่ม 3 ปุ่ม ติ่มซำตัวเล็กโผล่ข้างๆ ไม่บังช่องใดเลย กดง่ายทั้งมือถือและคอม",
  B: "<b>บอลลูนชี้ที่ช่อง</b> — ช่องที่ตกส่องแสง แล้วมีบอลลูนคำพูดโผล่จากช่องนั้น เห็นชัดว่ากำลังพูดถึงช่องไหน ติ่มซำยังอยู่กลางกระดาน ข้อเสีย: บอลลูนบังช่องข้างๆ และบนมือถือค่อนข้างแน่น",
  C: "<b>แผ่นเลื่อนจากล่าง</b> — แบบแอปมือถือ แผ่นเลื่อนขึ้นมาจากขอบล่างของจอ ปุ่มใหญ่อยู่ใต้นิ้วโป้งพอดี บนคอมจะเป็นกล่องกลางจอแทน ข้อเสีย: บังกระดานครึ่งล่างตอนตัดสินใจ",
  D: "<b>ติ่มซำถาม</b> — ติ่มซำกลางกระดานทำหน้าครุ่นคิดแล้วถามว่า \\"ซื้อไหม?\\" ปุ่มอยู่ใต้บอลลูนคำพูด ช่องที่ตกส่องแสง อยากดูค่าเช่าเต็มๆ ก็แตะช่องหรือลิงก์ สั้นที่สุด น่ารักที่สุด แต่เห็นข้อมูลน้อยกว่าแบบ A",
};
function tileRect(frame, idx) {
  const grid = frame.querySelector(".grid");
  const tiles = grid.querySelectorAll(":scope > button");
  const t = tiles[idx].getBoundingClientRect();
  const f = frame.getBoundingClientRect();
  return { left: t.left - f.left, top: t.top - f.top, width: t.width, height: t.height };
}
function build(opt) {
  document.querySelectorAll(".tab").forEach(b => b.classList.toggle("on", b.dataset.o === opt));
  document.getElementById("desc").innerHTML = descs[opt];
  const frames = document.getElementById("frames");
  frames.innerHTML = "";
  for (const kind of ["phone", "desk"]) {
    const wrap = document.createElement("div");
    const frame = document.createElement("div");
    frame.className = "frame " + kind + " opt" + opt;
    frame.innerHTML = '<div class="inner">' + board + '</div><div class="mk-overlay"></div>';
    wrap.appendChild(frame);
    const lab = document.createElement("div"); lab.className = "label"; lab.textContent = kind === "phone" ? "มือถือ (390px)" : "คอม / แท็บเล็ต"; wrap.appendChild(lab);
    frames.appendChild(wrap);
    const ov = frame.querySelector(".mk-overlay");
    const inner = frame.querySelector(".inner");
    if (kind === "phone") {
      // on phones the real page has the action panel under the board; show a faded hint strip
      const strip = document.createElement("div");
      strip.style.cssText = "position:absolute;left:8px;right:8px;top:calc(390px - 8px + 8px);height:70px;border-radius:18px;background:rgba(255,255,255,.5);border:2px solid rgba(107,74,43,.1);display:flex;align-items:center;justify-content:center;color:rgba(107,74,43,.5);font-size:12px";
      strip.textContent = opt === "C" ? "" : "(แผงด้านข้างเดิมเหลือแค่ข้อมูลผู้เล่นกับ log)";
      inner.appendChild(strip);
    }
    requestAnimationFrame(() => {
      const r = tileRect(frame, ${LANDED});
      const bw = frame.querySelector(".grid").getBoundingClientRect();
      const fr = frame.getBoundingClientRect();
      const centre = { left: bw.left - fr.left, top: bw.top - fr.top, width: bw.width, height: bw.height };
      if (opt === "A") {
        ov.innerHTML = '<div style="position:absolute;left:' + centre.left + 'px;top:' + centre.top + 'px;width:' + centre.width + 'px;height:' + centre.height + 'px">' + deed + '<div class="mk-dog">' + dogThink + '</div></div>';
        if (kind === "phone") ov.querySelector(".mk-deed").style.width = "70%";
      } else if (opt === "B") {
        const glow = '<div class="mk-glow" style="left:' + r.left + 'px;top:' + r.top + 'px;width:' + r.width + 'px;height:' + r.height + 'px"></div>';
        const left = r.left + r.width + 14; const top = Math.max(centre.top + 6, Math.min(r.top - 10, centre.top + centre.height - 300));
        ov.innerHTML = glow + '<div style="position:absolute;left:' + centre.left + 'px;top:' + centre.top + 'px;width:' + centre.width + 'px;height:' + centre.height + 'px"><div class="mk-dog" style="left:auto;right:4%;top:6%;transform:none;width:22%">' + dogThink + '</div></div>' +
          '<div class="mk-bubble" style="left:' + left + 'px;top:' + top + 'px">' + deed.replace('<div class="mk-btns">', '<div class="mk-btns compact">') + '</div>';
      } else if (opt === "C") {
        ov.innerHTML = '<div class="mk-dim"></div><div class="mk-sheet"><div class="mk-handle"></div>' + deed + '</div>';
        if (kind === "desk") { const s = ov.querySelector(".mk-sheet"); s.style.cssText = "left:50%;top:50%;bottom:auto;transform:translate(-50%,-50%);width:380px;border-radius:24px"; }
      } else {
        const glow = '<div class="mk-glow" style="left:' + r.left + 'px;top:' + r.top + 'px;width:' + r.width + 'px;height:' + r.height + 'px"></div>';
        ov.innerHTML = glow + '<div style="position:absolute;left:' + centre.left + 'px;top:' + centre.top + 'px;width:' + centre.width + 'px;height:' + centre.height + 'px"><div class="mk-ask"><div class="mk-dog">' + dogThink + '</div>' +
          '<div class="mk-say"><div class="mk-kicker">ตกช่องที่ดินว่าง</div><div class="mk-title">ซื้อ ${tile.name} ไหม?</div><div class="mk-price">ราคา <b>${price} ฿</b> · ค่าเช่าเริ่ม ${tile.rent![0]} ฿</div>' + btnsCompact + '<a class="mk-link">ดูค่าเช่าทั้งหมด</a></div></div></div>';
      }
      // hide the real mascot + dice row behind the overlay for A and D so it doesn't double up
      if (opt !== "C") { const m = inner.querySelector('.grid > div:last-child > div[class*="aspect-square"]'); if (m) m.style.visibility = "hidden"; }
      if (opt !== "C") { const t = inner.querySelector('.grid > div:last-child > div.text-center'); if (t) t.style.visibility = "hidden"; }
    });
  }
}
document.querySelectorAll(".tab").forEach(b => b.addEventListener("click", () => build(b.dataset.o)));
build("A");
</script>
</body></html>`;
writeFileSync("public/mockups/buy-options.html", html);
console.log("wrote public/mockups/buy-options.html", (html.length / 1024).toFixed(0), "KB");
