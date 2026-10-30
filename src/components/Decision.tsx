// Mid-turn decisions rendered in the centre of the board (option A of the mock-up).
import { TILE_ART, ART_BY_TYPE } from "~/art/tiles";
import { DimsamToken } from "~/art/Dimsam";
import type { GameView } from "~/lib/game";
import { tabPreview, wealth } from "~/lib/game";
import { baht, cx, GROUP_COLORS } from "~/lib/format";
import type { Actions } from "./ActionPanel";

export function Decision({ view, disabled, actions }: { view: GameView; disabled: boolean; actions: Actions }) {
  const g = view.game;
  const me = view.players.find((p) => p.seat === view.me)!;
  const r = view.rules;

  switch (g.phase) {
    case "buy": {
      const tile = view.tiles.find((t) => t.index === (g.pending as { tileIndex: number }).tileIndex)!;
      const Art = TILE_ART[tile.index] ?? ART_BY_TYPE[tile.type];
      const price = tile.price ?? 0;
      const house = tile.housePrice ?? 0;
      const canAddHouse = tile.type === "city" && house > 0 && !r.requireMonopolyToBuild;
      const band = tile.group ? GROUP_COLORS[tile.group] : tile.type === "station" ? "#c9c0b3" : "#e0a458";
      return (
        <Card band={band}>
          <div className="flex gap-3 items-start">
            <div className="w-24 h-24 rounded-2xl overflow-hidden border border-cocoa/20 bg-white shrink-0">{Art && <Art animate />}</div>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="text-xs text-cocoa/60">ยังไม่มีเจ้าของ · {tile.type === "city" ? "เมือง" : tile.type === "station" ? "ร้าน" : "ของเล่น"}</div>
              <div className="font-bold text-cocoa text-2xl">{tile.name}</div>
              {tile.blurb && <div className="text-sm text-cocoa/70">{tile.blurb}</div>}
              <div className="text-sm mt-1">
                ราคา <b className="text-base">{baht(price)}</b>
                {house > 0 && <span className="text-cocoa/70"> · บ้านหลังละ {baht(house)}</span>}
              </div>
            </div>
          </div>
          {tile.type === "city" && tile.rent && (
            <div className="grid grid-cols-2 gap-x-6 text-sm text-cocoa/80 tabular-nums px-1">
              {["ที่ดินเปล่า", "บ้าน 1 หลัง", "บ้าน 2 หลัง", "บ้าน 3 หลัง", "บ้าน 4 หลัง", "แลนด์มาร์ก ★"].map((l, i) => (
                <div key={l} className="flex justify-between gap-2 border-b border-dotted border-cocoa/15 py-[2px]">
                  <span>{l}</span>
                  <span>{tile.rent![i].toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
          {tile.type === "special_item" && <Small>ค่าเช่าตามจำนวนของเล่น: {r.specialItemRent.map((v) => v.toLocaleString()).join(" / ")}</Small>}
          {tile.type === "station" && <Small>ค่าเช่า = แต้มเต๋า × {r.stationRent.join(" / ")}</Small>}
          <div className="flex flex-col gap-2 pt-1">
            <Btn tone="primary" disabled={disabled || me.cash < price} onClick={() => actions.buy(false)} label="ซื้อที่ดิน" amount={baht(price)} />
            {canAddHouse && (
              <Btn tone="green" disabled={disabled || me.cash < price + house} onClick={() => actions.buy(true)} label="ที่ดิน + บ้าน 1 หลัง" amount={baht(price + house)} />
            )}
            <Btn tone="ghost" disabled={disabled} onClick={actions.skipBuy} label="ไม่ซื้อ" />
          </div>
          <p className="text-xs text-cocoa/50 text-center">คุณมี {baht(me.cash)}</p>
        </Card>
      );
    }
    case "jail":
      return (
        <Card band="#9ed8f5" title="โดนจับอาบน้ำอยู่ 🛁">
          <Small>ทอยให้ได้เบิ้ลเพื่อหนี หรือจ่ายค่าไถ่ {baht(r.jailFine)} · รอ {r.jailMaxTurns} ตาแล้วออกฟรี</Small>
          <div className="flex gap-[6px]">
            <Btn tone="primary" disabled={disabled} onClick={actions.roll} label="🎲 ทอยหาเบิ้ล" />
            <Btn tone="ghost" disabled={disabled || me.cash < r.jailFine} onClick={actions.payJail} label={`จ่าย ${baht(r.jailFine)}`} />
          </div>
        </Card>
      );
    case "card_roll":
      return (
        <Card band="#8b6fd1" title="การ์ดให้ทอยลูกเต๋า">
          <Small>{(g.pending as { text: string }).text}</Small>
          <Btn tone="primary" disabled={disabled} onClick={actions.roll} label="🎲 ทอยลูกเต๋า" />
        </Card>
      );
    case "world_tour": {
      const mine = view.props.filter((p) => p.ownerSeat === view.me).map((p) => view.tiles.find((t) => t.index === p.tileIndex)!);
      return (
        <Card band="#a8d672" title="ไปเดินเล่น 🐾">
          <Small>เลือกที่ดินของคุณที่อยากไป (ผ่านบ้านได้ค่าขนม) หรืออยู่ตรงนี้</Small>
          <div className="flex flex-wrap gap-1 max-h-40 overflow-y-auto">
            {mine.map((t) => {
              const Art = TILE_ART[t.index] ?? ART_BY_TYPE[t.type];
              return (
                <button
                  key={t.index}
                  disabled={disabled}
                  onClick={() => actions.worldTour(t.index)}
                  className="flex items-center gap-1 rounded-lg border border-cocoa/20 bg-white px-2 py-1 text-sm active:translate-y-[1px]"
                >
                  <span className="w-6 h-6 rounded overflow-hidden">{Art && <Art animate={false} />}</span>
                  {t.name}
                </button>
              );
            })}
          </div>
          <Btn tone="primary" disabled={disabled} onClick={() => actions.worldTour(undefined)} label="อยู่ตรงนี้" />
        </Card>
      );
    }
    case "rent": {
      const pend = g.pending as { tileIndex: number; amount: number; toSeat: number };
      const tile = view.tiles.find((t) => t.index === pend.tileIndex)!;
      const owner = view.players[pend.toSeat];
      const prop = view.props.find((p) => p.tileIndex === tile.index);
      const Art = TILE_ART[tile.index] ?? ART_BY_TYPE[tile.type];
      const band = tile.group ? GROUP_COLORS[tile.group] : tile.type === "station" ? "#c9c0b3" : "#e0a458";
      const what = prop?.landmark ? "แลนด์มาร์ก ★" : prop && prop.houses > 0 ? `บ้าน ${prop.houses} หลัง` : tile.type === "station" ? "ร้าน" : tile.type === "special_item" ? "ของเล่น" : "ที่ดินเปล่า";
      const tp = tabPreview(view, view.me, pend.amount);
      const canCash = me.cash >= pend.amount;
      const tabUseful = tp.offset > 0 || tp.tabbed > 0;
      const parts: string[] = [];
      if (tp.offset > 0) parts.push(`หักหนี้ที่ ${owner.name} ติดคุณ ${baht(tp.offset)}`);
      if (tp.tabbed > 0) parts.push(`ติดเพิ่ม ${baht(tp.tabbed)}`);
      if (tp.cash > 0) parts.push(`จ่ายสด ${baht(tp.cash)}${tp.cash > me.cash ? " (เงินไม่พอ ต้องขายทรัพย์สิน)" : ""}`);
      return (
        <Card band={band} title={`ค่าเช่า ${tile.name}`}>
          <div className="flex gap-3 items-center">
            <div className="w-16 h-16 rounded-xl overflow-hidden border border-cocoa/20 bg-white shrink-0">{Art && <Art animate />}</div>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="text-sm text-cocoa/70">
                ของ <b className="text-cocoa">{owner.name}</b> · {what}
              </div>
              <div className="font-bold text-berry text-3xl tabular-nums">{baht(pend.amount)}</div>
              <div className="text-xs text-cocoa/60">คุณมีเงินสด {baht(me.cash)}</div>
            </div>
          </div>
          {(me.debt > 0 || owner.debt > 0) && (
            <Small>
              {me.debt > 0 && <>คุณติด {owner.name} อยู่ {baht(me.debt)} (ติดได้อีก {baht(Math.max(0, r.maxDebt - me.debt))})</>}
              {owner.debt > 0 && <>{owner.name} ติดคุณอยู่ {baht(owner.debt)}</>}
            </Small>
          )}
          <div className="flex flex-col gap-2 pt-1">
            <Btn tone="primary" disabled={disabled || !canCash} onClick={() => actions.payRent("cash")} label="จ่ายเงินสด" amount={baht(pend.amount)} />
            <Btn tone="tab" disabled={disabled || !tabUseful} onClick={() => actions.payRent("tab")} label="ติดไว้ก่อน" amount={tp.tabbed > 0 ? `ติด ${baht(tp.tabbed)}` : undefined} />
          </div>
          {tabUseful && <p className="text-xs text-cocoa/60 text-center">{parts.join(" · ")}</p>}
          {!tabUseful && me.debt >= r.maxDebt && <p className="text-xs text-berry text-center">ติดครบ {baht(r.maxDebt)} แล้ว ต้องจ่ายสด</p>}
        </Card>
      );
    }
    case "broke": {
      const w = wealth(view, view.me);
      return (
        <Card band="#d9487e" title={`เงินไม่พอ ติดลบ ${baht(-me.cash)}`}>
          <Small>แตะที่ดินของคุณบนกระดานเพื่อขายบ้าน/ที่ดิน (ได้ {Math.round(r.landSellBackRatio * 100)}%) จนเงินไม่ติดลบ · ขายได้สูงสุด {baht(w.sellable)}</Small>
          <Btn tone="danger" disabled={disabled} onClick={actions.giveUp} label="ยอมแพ้" />
        </Card>
      );
    }
    default:
      return null;
  }
}

function Card({ band, title, children }: { band: string; title?: string; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-cocoa-2/30 backdrop-blur-[1px]">
      <div className="decision-card w-full sm:w-[440px] max-h-[88dvh] overflow-y-auto bg-white border-2 border-cocoa/25 rounded-t-3xl sm:rounded-3xl shadow-[0_-10px_40px_rgba(74,49,25,0.3)] sm:shadow-[0_10px_0_rgba(107,74,43,0.15),0_24px_60px_rgba(74,49,25,0.35)] flex flex-col">
        <div className="sm:hidden w-11 h-[5px] rounded-full bg-cocoa/25 mx-auto mt-2" />
        <div style={{ background: band }} className="hidden sm:block h-[10px] shrink-0 rounded-t-3xl" />
        <div className="p-4 sm:p-5 flex flex-col gap-3">
          {title && <div className="font-bold text-cocoa text-xl leading-tight">{title}</div>}
          {children}
        </div>
      </div>
    </div>
  );
}

function Small({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-cocoa/75 leading-snug">{children}</p>;
}

function Btn({ tone, disabled, onClick, label, amount }: { tone: "primary" | "green" | "ghost" | "danger" | "tab"; disabled: boolean; onClick: () => void; label: string; amount?: string }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={cx(
        "flex-1 rounded-2xl px-4 py-3 font-semibold text-base flex justify-between gap-2 transition active:translate-y-[2px] active:shadow-none disabled:opacity-40",
        tone === "primary" && "bg-caramel text-white shadow-[0_4px_0_#b9803a]",
        tone === "green" && "bg-[#5cb85c] text-white shadow-[0_4px_0_#3f8f3f]",
        tone === "ghost" && "bg-white text-cocoa border-2 border-cocoa/20 shadow-[0_3px_0_rgba(107,74,43,0.2)]",
        tone === "danger" && "bg-berry text-white shadow-[0_4px_0_#a22d5a]",
        tone === "tab" && "bg-[#f08a2b] text-white shadow-[0_4px_0_#b8621a]",
      )}
    >
      <span>{label}</span>
      {amount && <span className="opacity-90 font-medium tabular-nums">{amount}</span>}
    </button>
  );
}

export function TurnBadge({ view }: { view: GameView }) {
  const current = view.players[view.game.turn];
  if (!current) return null;
  return (
    <div className="flex items-center gap-1 text-cocoa/70 text-[clamp(9px,1.6vw,13px)]">
      <span className="w-5 h-5">
        <DimsamToken variant={current.variant} animate={false} />
      </span>
      ตาของ {current.name}
    </div>
  );
}
