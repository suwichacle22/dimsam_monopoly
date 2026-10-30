import type { GameView } from "~/lib/game";
import { baht, cx } from "~/lib/format";
import { buildBlocker, buildCost, wealth } from "~/lib/game";
import { RollGauge } from "./RollGauge";

export type Actions = {
  roll: (target?: number) => void;
  buy: (withHouse?: boolean) => void;
  payRent: (mode: "cash" | "tab") => void;
  payDebt: (amount?: number) => void;
  build: (tileIndex: number) => void;
  skipBuy: () => void;
  payJail: () => void;
  worldTour: (tileIndex?: number) => void;
  endTurn: () => void;
  giveUp: () => void;
  openTile: (tileIndex: number) => void;
};

export function ActionPanel({ view, busy, pendingAction, actions, spaceHeld, autoEnding }: { view: GameView; busy: boolean; pendingAction: boolean; actions: Actions; spaceHeld?: boolean; autoEnding?: boolean }) {
  const g = view.game;
  const me = view.players.find((p) => p.seat === view.me)!;
  const current = view.players[g.turn];
  const mine = g.turn === view.me && g.status === "playing";
  const disabled = busy || pendingAction;

  if (g.status === "finished") return null;

  if (busy) {
    return (
      <Panel tone="muted">
        <p className="text-cocoa/70">กำลังเดิน…</p>
      </Panel>
    );
  }

  if (!mine) {
    return (
      <Panel tone="muted">
        <p className="text-cocoa/70">
          {current?.bot ? "🤖 " : ""}รอ <b className="text-cocoa">{current?.name}</b>{" "}
          {g.phase === "roll" && "ทอยลูกเต๋า"}
          {g.phase === "jail" && "ทอยหาเบิ้ลในอ่างอาบน้ำ"}
          {g.phase === "buy" && "ตัดสินใจซื้อที่ดิน"}
          {g.phase === "rent" && "เลือกวิธีจ่ายค่าเช่า"}
          {g.phase === "card_roll" && "ทอยลูกเต๋าตามการ์ด"}
          {g.phase === "world_tour" && "เลือกที่จะไปเดินเล่น"}
          {g.phase === "broke" && "หาเงินมาจ่าย"}
          {g.phase === "end" && "จบตา"}
          …
        </p>
        <p className="text-xs text-cocoa/50">หน้าจอนี้จะอัปเดตเองทันทีที่อีกฝ่ายกด</p>
      </Panel>
    );
  }

  if (["buy", "rent", "jail", "card_roll", "world_tour"].includes(g.phase)) {
    return (
      <Panel tone="muted">
        <p className="text-cocoa/70">
          {g.phase === "buy" && "เลือกซื้อหรือไม่ซื้อได้ในหน้าต่างที่เด้งขึ้นมา"}
          {g.phase === "rent" && "เลือกจ่ายค่าเช่าสดหรือติดไว้ก่อนได้ในหน้าต่างที่เด้งขึ้นมา"}
          {g.phase === "jail" && "ทอยหาเบิ้ลหรือจ่ายค่าไถ่ได้ในหน้าต่างที่เด้งขึ้นมา"}
          {g.phase === "card_roll" && "ทอยลูกเต๋าตามการ์ดได้ในหน้าต่างที่เด้งขึ้นมา"}
          {g.phase === "world_tour" && "เลือกที่จะไปเดินเล่นได้ในหน้าต่างที่เด้งขึ้นมา"}
        </p>
      </Panel>
    );
  }

  switch (g.phase) {
    case "roll":
      return (
        <Panel>
          <p className="font-semibold text-cocoa">ตาของคุณ</p>
          {view.rules.gaugeEnabled ? (
            <>
              <RollGauge disabled={disabled} externalHold={spaceHeld} onRoll={actions.roll} />
              <Hint>กดค้างให้เข็มวิ่ง ปล่อยตรงแต้มที่อยากได้ (โอกาสตรงเป้า {Math.round(view.rules.gaugeAccuracy * 100)}%) · แตะสั้นๆ = สุ่มล้วน</Hint>
            </>
          ) : (
            <button className="btn-primary w-full" disabled={disabled} onClick={() => actions.roll()}>
              🎲 ทอยลูกเต๋า <kbd className="hidden sm:inline-block ml-2 text-xs font-normal bg-white/25 rounded px-1.5 py-0.5 align-middle">Space</kbd>
            </button>
          )}
        </Panel>
      );
    case "jail":
      return (
        <Panel>
          <p className="font-semibold text-cocoa">อยู่ในอ่างอาบน้ำ 🛁</p>
          <p className="text-sm text-cocoa/70">ทอยให้ได้เบิ้ลเพื่อหนีออกมา หรือจ่ายค่าไถ่ {baht(view.rules.jailFine)} (รอ {view.rules.jailMaxTurns} ตาแล้วออกฟรี)</p>
          <div className="flex gap-2">
            <button className="btn-primary flex-1" disabled={disabled} onClick={() => actions.roll()}>
              🎲 ทอยหาเบิ้ล
            </button>
            <button className="btn-secondary flex-1" disabled={disabled || me.cash < view.rules.jailFine} onClick={actions.payJail}>
              จ่าย {baht(view.rules.jailFine)}
            </button>
          </div>
        </Panel>
      );
    case "buy": {
      const tile = view.tiles.find((t) => t.index === (g.pending as { tileIndex: number }).tileIndex)!;
      const price = tile.price ?? 0;
      const house = tile.housePrice ?? 0;
      const canAddHouse = tile.type === "city" && house > 0 && (view.rules.maxHousesPerTurn === 0 || view.rules.maxHousesPerTurn >= 1) &&
        (!view.rules.requireMonopolyToBuild);
      return (
        <Panel>
          <p className="font-semibold text-cocoa">{tile.name} ยังไม่มีเจ้าของ</p>
          <p className="text-sm text-cocoa/70">ราคา {baht(price)} · คุณมี {baht(me.cash)}</p>
          <div className="flex flex-col gap-2">
            <button className="btn-primary w-full" disabled={disabled || me.cash < price} onClick={() => actions.buy(false)}>
              ซื้อที่ดิน ({baht(price)})
            </button>
            {canAddHouse && (
              <button className="btn-primary w-full bg-[#5cb85c] shadow-[0_4px_0_#3f8f3f]" disabled={disabled || me.cash < price + house} onClick={() => actions.buy(true)}>
                ซื้อที่ดิน + บ้าน 1 หลัง ({baht(price + house)})
              </button>
            )}
            <button className="btn-secondary w-full" disabled={disabled} onClick={actions.skipBuy}>
              ไม่ซื้อ
            </button>
          </div>
          <button className="text-xs underline text-cocoa/60 self-start" onClick={() => actions.openTile(tile.index)}>
            ดูรายละเอียดค่าเช่า
          </button>
        </Panel>
      );
    }
    case "card_roll":
      return (
        <Panel>
          <p className="font-semibold text-cocoa">การ์ดบอกให้ทอยลูกเต๋า</p>
          <p className="text-sm text-cocoa/70">{(g.pending as { text: string }).text}</p>
          <button className="btn-primary w-full" disabled={disabled} onClick={() => actions.roll()}>
            🎲 ทอยลูกเต๋า
          </button>
        </Panel>
      );
    case "world_tour": {
      const mine = view.props.filter((p) => p.ownerSeat === view.me).map((p) => view.tiles.find((t) => t.index === p.tileIndex)!);
      return (
        <Panel>
          <p className="font-semibold text-cocoa">ไปเดินเล่น 🐾</p>
          <p className="text-sm text-cocoa/70">เลือกที่ดินของคุณที่อยากไป (ผ่านบ้านได้ค่าขนม) หรืออยู่ตรงนี้</p>
          <div className="flex flex-wrap gap-2">
            {mine.map((t) => (
              <button key={t.index} className="btn-secondary text-sm" disabled={disabled} onClick={() => actions.worldTour(t.index)}>
                {t.name}
              </button>
            ))}
          </div>
          <button className="btn-primary w-full" disabled={disabled} onClick={() => actions.worldTour(undefined)}>
            อยู่ตรงนี้
          </button>
        </Panel>
      );
    }
    case "broke": {
      const w = wealth(view, view.me);
      return (
        <Panel tone="danger">
          <p className="font-semibold text-berry">เงินไม่พอ! ติดลบ {baht(-me.cash)}</p>
          <p className="text-sm text-cocoa/70">
            แตะที่ดินของคุณบนกระดานเพื่อขายบ้านหรือขายที่ดินคืนธนาคาร (ได้ {Math.round(view.rules.landSellBackRatio * 100)}% ของราคาซื้อ) จนเงินไม่ติดลบ
          </p>
          <p className="text-sm">
            ขายทั้งหมดได้สูงสุด <b>{baht(w.sellable)}</b> จากทรัพย์สินมูลค่า {baht(w.assets)}
          </p>
          <button className="btn-danger w-full" disabled={disabled} onClick={actions.giveUp}>
            ยอมแพ้
          </button>
        </Panel>
      );
    }
    case "end": {
      const here = view.tiles.find((t) => t.index === me.position)!;
      const blocker = buildBlocker(view, view.me, here);
      const bc = buildCost(view, here);
      const ownHere = view.props.find((p) => p.tileIndex === here.index)?.ownerSeat === view.me && here.type === "city";
      return (
        <Panel>
          <p className="font-semibold text-cocoa">{g.lastRollDouble ? "ทอยเบิ้ล! ได้ทอยอีกครั้ง" : "จบตาของคุณ"}</p>
          {ownHere && blocker === null && (
            <button className="btn-primary w-full bg-[#5cb85c] shadow-[0_4px_0_#3f8f3f]" disabled={disabled || me.cash < bc.cost} onClick={() => actions.build(here.index)}>
              {bc.landmark ? `สร้างแลนด์มาร์ก ★ ที่ ${here.name} (${baht(bc.cost)})` : `สร้างบ้านที่ ${here.name} (${baht(bc.cost)})`}
            </button>
          )}
          {ownHere && blocker !== null && blocker !== "สร้างเต็มแล้ว" && <Hint>{blocker}</Hint>}
          {autoEnding ? (
            <p className="text-sm text-cocoa/60 text-center">{g.lastRollDouble ? "กำลังไปทอยอีกครั้ง…" : "จบตาอัตโนมัติ…"}</p>
          ) : (
            <button className="btn-primary w-full" disabled={disabled} onClick={actions.endTurn}>
              {g.lastRollDouble ? "ทอยอีกครั้ง" : "จบตา"}
            </button>
          )}
          <Hint>
            {view.rules.buildOnlyOnLandedTile
              ? `สร้างบ้านได้เฉพาะเมืองที่ยืนอยู่ ตาละ ${view.rules.maxHousesPerTurn || "ไม่จำกัด"} หลัง`
              : "แตะที่ดินของตัวเองบนกระดานเพื่อสร้างบ้าน"}
          </Hint>
        </Panel>
      );
    }
  }
}

function Panel({ children, tone = "normal" }: { children: React.ReactNode; tone?: "normal" | "muted" | "danger" }) {
  return (
    <div
      className={cx(
        "card p-4 flex flex-col gap-3 pop-in",
        tone === "muted" && "bg-cream-2/60",
        tone === "danger" && "border-berry/40",
      )}
    >
      {children}
    </div>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-cocoa/50">{children}</p>;
}

