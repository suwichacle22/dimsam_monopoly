import { useState } from "react";
import type { Burst } from "./MoneyBurst";
import type { TileFx } from "./Board";
import type { GameView } from "~/lib/game";
import { play, type Sfx } from "~/lib/sound";

/** Dev/test drawer: trigger any animation on demand (solo mode only). */
export function TestPanel({
  view,
  onBurst,
  onFx,
  onCard,
  onRoll,
}: {
  view: GameView;
  onBurst: (b: Burst) => void;
  onFx: (index: number, kind: TileFx["kind"]) => void;
  onCard: (deck: "treasure" | "special", text: string) => void;
  onRoll: () => void;
}) {
  const [open, setOpen] = useState(false);
  const me = view.players.find((p) => p.seat === view.me)!;
  const other = view.players.find((p) => p.seat !== view.me) ?? me;
  const myPos = me.position;
  const B = ({ label, onClick }: { label: string; onClick: () => void }) => (
    <button className="btn-secondary text-xs px-2 py-1" onClick={onClick}>
      {label}
    </button>
  );
  const sfx: Sfx[] = ["roll", "step", "buy", "cash", "pay", "card", "build", "jail", "win", "lose", "prize", "penalty", "tab"];
  return (
    <div className="card p-3 flex flex-col gap-2 border-dashed">
      <button className="text-left text-sm font-semibold text-cocoa flex justify-between" onClick={() => setOpen(!open)}>
        <span>🧪 ทดสอบแอนิเมชัน</span>
        <span>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <>
          <p className="text-xs text-cocoa/60">กดเพื่อดูเอฟเฟกต์ทันที ไม่กระทบเกมจริง</p>
          <div className="flex flex-wrap gap-1">
            <B label="🎲 ทอยเต๋า" onClick={onRoll} />
            <B label="✨ ตกช่อง" onClick={() => onFx(myPos, "land")} />
            <B label="🏷️ ซื้อที่ดิน" onClick={() => onFx(myPos, "buy")} />
            <B label="🏠 สร้างบ้าน" onClick={() => onFx(myPos, "build")} />
            <B label="🃏 การ์ดหีบขนม" onClick={() => onCard("treasure", "ยักษ์จากตะเกียงวิเศษให้เงิน 5,000 บาท")} />
            <B label="🃏 การ์ดถุงของเล่น" onClick={() => onCard("special", "โดนแมวกวักเรียก ถอยหลังกลับไป 3 ช่อง")} />
          </div>
          <div className="flex flex-wrap gap-1">
            <B label="💰 ได้รางวัล +5,000" onClick={() => { play("prize"); onBurst({ id: Date.now(), amount: 5000, label: `${me.name} ได้รางวัล!`, kicker: "หีบขนม", variant: me.variant }); }} />
            <B label="💸 โดนปรับ −2,000" onClick={() => { play("penalty"); onBurst({ id: Date.now(), amount: -2000, label: `${me.name} โดนปรับ`, kicker: "ถุงของเล่น", variant: me.variant }); }} />
            <B label="🏠 ได้ค่าเช่า" onClick={() => { play("prize"); onBurst({ id: Date.now(), amount: 1500, label: `${other.name} มาจ่ายค่าเช่า`, kicker: "ค่าเช่า ขั้วโลกเหนือ", detail: "บ้าน 2 หลัง", variant: me.variant }); }} />
            <B label="📝 ติดไว้ก่อน" onClick={() => { play("tab"); onBurst({ id: Date.now(), amount: 4500, tone: "tab", label: `ติด ${other.name} ไว้ก่อน`, kicker: "ค่าเช่า ทะเลทราย", detail: "ที่ดิน · ติดไว้ 4,500", variant: me.variant }); }} />
            <B label="★ จ่ายค่าแลนด์มาร์ก" onClick={() => { play("penalty"); onBurst({ id: Date.now(), amount: -7500, label: `จ่ายค่าเช่าให้ ${other.name}`, kicker: "ค่าเช่า ขั้วโลกเหนือ", detail: "แลนด์มาร์ก ★ · ค่าเช่าสูงสุด!", variant: me.variant }); }} />
          </div>
          <div className="flex flex-wrap gap-1">
            {sfx.map((n) => (
              <B key={n} label={`🔊 ${n}`} onClick={() => play(n)} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
