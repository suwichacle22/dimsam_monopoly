import type { GameView } from "~/lib/game";
import { baht, cx } from "~/lib/format";

export type Actions = {
  roll: () => void;
  buy: () => void;
  skipBuy: () => void;
  payJail: () => void;
  worldTour: (tileIndex?: number) => void;
  endTurn: () => void;
  giveUp: () => void;
  openTile: (tileIndex: number) => void;
};

export function ActionPanel({ view, busy, pendingAction, actions }: { view: GameView; busy: boolean; pendingAction: boolean; actions: Actions }) {
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
          รอ <b className="text-cocoa">{current?.name}</b>{" "}
          {g.phase === "roll" && "ทอยลูกเต๋า"}
          {g.phase === "jail" && "ทอยหาเบิ้ลในอ่างอาบน้ำ"}
          {g.phase === "buy" && "ตัดสินใจซื้อที่ดิน"}
          {g.phase === "card_roll" && "ทอยลูกเต๋าตามการ์ด"}
          {g.phase === "world_tour" && "เลือกที่จะไปเดินเล่น"}
          {g.phase === "debt" && "หาเงินมาจ่าย"}
          {g.phase === "end" && "จบตา"}
          …
        </p>
        <p className="text-xs text-cocoa/50">หน้าจอนี้จะอัปเดตเองทันทีที่อีกฝ่ายกด</p>
      </Panel>
    );
  }

  switch (g.phase) {
    case "roll":
      return (
        <Panel>
          <p className="font-semibold text-cocoa">ตาของคุณ</p>
          <button className="btn-primary w-full" disabled={disabled} onClick={actions.roll}>
            🎲 ทอยลูกเต๋า
          </button>
          <Hint>แตะที่ดินของตัวเองบนกระดานเพื่อสร้างบ้านหรือขาย</Hint>
        </Panel>
      );
    case "jail":
      return (
        <Panel>
          <p className="font-semibold text-cocoa">อยู่ในอ่างอาบน้ำ 🛁</p>
          <p className="text-sm text-cocoa/70">ทอยให้ได้เบิ้ลเพื่อหนีออกมา หรือจ่ายค่าไถ่ {baht(view.rules.jailFine)} (รอ {view.rules.jailMaxTurns} ตาแล้วออกฟรี)</p>
          <div className="flex gap-2">
            <button className="btn-primary flex-1" disabled={disabled} onClick={actions.roll}>
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
      return (
        <Panel>
          <p className="font-semibold text-cocoa">{tile.name} ยังไม่มีเจ้าของ</p>
          <p className="text-sm text-cocoa/70">ราคา {baht(tile.price ?? 0)} · คุณมี {baht(me.cash)}</p>
          <div className="flex gap-2">
            <button className="btn-primary flex-1" disabled={disabled || me.cash < (tile.price ?? 0)} onClick={actions.buy}>
              ซื้อเลย
            </button>
            <button className="btn-secondary flex-1" disabled={disabled} onClick={actions.skipBuy}>
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
          <button className="btn-primary w-full" disabled={disabled} onClick={actions.roll}>
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
    case "debt":
      return (
        <Panel tone="danger">
          <p className="font-semibold text-berry">เงินไม่พอ! ติดลบ {baht(-me.cash)}</p>
          <p className="text-sm text-cocoa/70">แตะที่ดินของคุณบนกระดานเพื่อขายบ้านหรือขายที่ดินคืนธนาคาร จนเงินไม่ติดลบ</p>
          <button className="btn-danger w-full" disabled={disabled} onClick={actions.giveUp}>
            ยอมแพ้
          </button>
        </Panel>
      );
    case "end":
      return (
        <Panel>
          <p className="font-semibold text-cocoa">{g.lastRollDouble ? "ทอยเบิ้ล! ได้ทอยอีกครั้ง" : "จบตาของคุณ"}</p>
          <button className="btn-primary w-full" disabled={disabled} onClick={actions.endTurn}>
            {g.lastRollDouble ? "ทอยอีกครั้ง" : "จบตา"}
          </button>
          <Hint>ก่อนจบตา แตะที่ดินของตัวเองเพื่อสร้างบ้านได้</Hint>
        </Panel>
      );
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
