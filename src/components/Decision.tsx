// Mid-turn decisions rendered in the centre of the board (option A of the mock-up).
import { TILE_ART, ART_BY_TYPE } from "~/art/tiles";
import { DimsamToken } from "~/art/Dimsam";
import type { GameView } from "~/lib/game";
import { wealth } from "~/lib/game";
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
          <div className="flex gap-2 sm:gap-3 items-start">
            <div className="w-[26%] max-w-[88px] aspect-square rounded-xl overflow-hidden border border-cocoa/20 bg-white shrink-0">{Art && <Art animate />}</div>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="text-[clamp(8px,1.4vw,11px)] text-cocoa/60">ยังไม่มีเจ้าของ</div>
              <div className="font-bold text-cocoa text-[clamp(13px,2.6vw,20px)] truncate">{tile.name}</div>
              {tile.blurb && <div className="text-[clamp(8px,1.5vw,12px)] text-cocoa/70 truncate">{tile.blurb}</div>}
              <div className="text-[clamp(9px,1.6vw,13px)] mt-[2px]">
                ราคา <b>{baht(price)}</b>
                {house > 0 && <span className="text-cocoa/70"> · บ้านหลังละ {baht(house)}</span>}
              </div>
            </div>
          </div>
          {tile.type === "city" && tile.rent && (
            <div className="hidden sm:grid grid-cols-3 gap-x-3 text-[clamp(8px,1.3vw,11px)] text-cocoa/80 tabular-nums px-1">
              {["เปล่า", "บ้าน 1", "บ้าน 2", "บ้าน 3", "บ้าน 4", "แลนด์มาร์ก"].map((l, i) => (
                <div key={l} className="flex justify-between gap-2">
                  <span>{l}</span>
                  <span>{tile.rent![i].toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
          {tile.type === "special_item" && <Small>ค่าเช่าตามจำนวนของเล่น: {r.specialItemRent.map((v) => v.toLocaleString()).join(" / ")}</Small>}
          {tile.type === "station" && <Small>ค่าเช่า = แต้มเต๋า × {r.stationRent.join(" / ")}</Small>}
          <div className="flex flex-col gap-[6px]">
            <Btn tone="primary" disabled={disabled || me.cash < price} onClick={() => actions.buy(false)} label="ซื้อที่ดิน" amount={baht(price)} />
            {canAddHouse && (
              <Btn tone="green" disabled={disabled || me.cash < price + house} onClick={() => actions.buy(true)} label="ที่ดิน + บ้าน 1 หลัง" amount={baht(price + house)} />
            )}
            <Btn tone="ghost" disabled={disabled} onClick={actions.skipBuy} label="ไม่ซื้อ" />
          </div>
          <button className="text-[clamp(8px,1.3vw,11px)] underline text-cocoa/60 self-center" onClick={() => actions.openTile(tile.index)}>
            ดูรายละเอียดทั้งหมด
          </button>
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
          <div className="flex flex-wrap gap-1 max-h-[34%] overflow-y-auto">
            {mine.map((t) => {
              const Art = TILE_ART[t.index] ?? ART_BY_TYPE[t.type];
              return (
                <button
                  key={t.index}
                  disabled={disabled}
                  onClick={() => actions.worldTour(t.index)}
                  className="flex items-center gap-1 rounded-lg border border-cocoa/20 bg-white px-1 py-[2px] text-[clamp(8px,1.4vw,11px)] active:translate-y-[1px]"
                >
                  <span className="w-5 h-5 rounded overflow-hidden">{Art && <Art animate={false} />}</span>
                  {t.name}
                </button>
              );
            })}
          </div>
          <Btn tone="primary" disabled={disabled} onClick={() => actions.worldTour(undefined)} label="อยู่ตรงนี้" />
        </Card>
      );
    }
    case "debt": {
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
    <div className="pop-in w-[86%] sm:w-[74%] max-w-[380px] max-h-full overflow-hidden rounded-2xl bg-white border-2 border-cocoa/25 shadow-[0_8px_0_rgba(107,74,43,0.15),0_18px_40px_rgba(74,49,25,0.25)] flex flex-col">
      <div style={{ background: band }} className="h-[7px] shrink-0" />
      <div className="p-2 sm:p-3 flex flex-col gap-2 min-h-0">
        {title && <div className="font-bold text-cocoa text-[clamp(12px,2.4vw,18px)] leading-tight">{title}</div>}
        {children}
      </div>
    </div>
  );
}

function Small({ children }: { children: React.ReactNode }) {
  return <p className="text-[clamp(8px,1.5vw,12px)] text-cocoa/75 leading-snug">{children}</p>;
}

function Btn({ tone, disabled, onClick, label, amount }: { tone: "primary" | "green" | "ghost" | "danger"; disabled: boolean; onClick: () => void; label: string; amount?: string }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={cx(
        "flex-1 rounded-xl px-3 py-[clamp(6px,1.4vw,10px)] font-semibold text-[clamp(10px,1.9vw,15px)] flex justify-between gap-2 transition active:translate-y-[2px] active:shadow-none disabled:opacity-40",
        tone === "primary" && "bg-caramel text-white shadow-[0_4px_0_#b9803a]",
        tone === "green" && "bg-[#5cb85c] text-white shadow-[0_4px_0_#3f8f3f]",
        tone === "ghost" && "bg-white text-cocoa border-2 border-cocoa/20 shadow-[0_3px_0_rgba(107,74,43,0.2)]",
        tone === "danger" && "bg-berry text-white shadow-[0_4px_0_#a22d5a]",
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
