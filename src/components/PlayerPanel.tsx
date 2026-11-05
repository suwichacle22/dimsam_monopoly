import { useEffect, useRef, useState } from "react";
import { DimsamToken } from "~/art/Dimsam";
import { TILE_ART, ART_BY_TYPE } from "~/art/tiles";
import type { GameView, PlayerView } from "~/lib/game";
import { baht, cx, GROUP_COLORS } from "~/lib/format";
import { wealth } from "~/lib/game";

function useCashFloat(cash: number) {
  const prev = useRef(cash);
  const [float, setFloat] = useState<{ diff: number; key: number } | null>(null);
  useEffect(() => {
    if (prev.current !== cash) {
      setFloat({ diff: cash - prev.current, key: Date.now() });
      prev.current = cash;
    }
  }, [cash]);
  return float;
}

/** Eases the printed number to its new value, so a balance change reads as money moving. */
function useCountUp(value: number) {
  const [printed, setPrinted] = useState(value);
  const at = useRef(value);
  useEffect(() => {
    if (at.current === value) return;
    const from = at.current;
    const instant = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t0 = performance.now();
    let id = requestAnimationFrame(function tick(now) {
      const k = instant ? 1 : Math.min(1, (now - t0) / 700);
      at.current = Math.round(from + (value - from) * (1 - (1 - k) ** 3));
      setPrinted(at.current);
      if (k < 1) id = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(id);
  }, [value]);
  return printed;
}

function PlayerCard({
  view,
  p,
  shown,
  onTile,
  onPayDebt,
  onPayBankDebt,
}: {
  view: GameView;
  p: PlayerView;
  shown?: { cash: number; debt: number; bank: number };
  onTile: (i: number) => void;
  onPayDebt?: (amount?: number) => void;
  onPayBankDebt?: (amount?: number) => void;
}) {
  // while an action plays out the balances follow the animation, not the server
  const cash = shown?.cash ?? p.cash;
  const debt = shown?.debt ?? p.debt;
  const bankDebt = shown?.bank ?? p.bankDebt;
  const float = useCashFloat(cash);
  const debtFloat = useCashFloat(debt);
  const bankFloat = useCashFloat(bankDebt);
  const printedCash = useCountUp(cash);
  const isTurn = view.game.turn === p.seat && view.game.status === "playing";
  const owned = view.props.filter((x) => x.ownerSeat === p.seat).map((x) => view.tiles.find((t) => t.index === x.tileIndex)!);
  const w = wealth(view, p.seat);
  return (
    <div data-seat={p.seat} className={cx("card p-3 flex flex-col gap-2 relative", isTurn && "glow-turn border-caramel", p.bankrupt && "opacity-50")}>
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 shrink-0">
          <DimsamToken variant={p.variant} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold truncate">{p.name}</span>
            {p.seat === view.me && <span className="text-[10px] bg-cream-2 rounded-full px-2 py-[1px] text-cocoa/70">คุณ</span>}
            <span className={cx("w-2 h-2 rounded-full", p.online ? "bg-grass-deep bg-[#6fae4b]" : "bg-cocoa/20")} title={p.online ? "ออนไลน์" : "ออฟไลน์"} />
          </div>
          <div className="relative text-lg font-bold tabular-nums text-cocoa">
            <span key={`cash-${float?.key}`} className={cx("inline-block origin-left", float && (float.diff > 0 ? "cash-up" : "cash-down"))}>
              {baht(printedCash)}
            </span>
            {float && (
              <span
                key={float.key}
                className={cx("money-float absolute left-0 -top-2 text-base font-bold", float.diff > 0 ? "text-[#3f8f3f] dark:text-[#8fe08f]" : "text-berry")}
              >
                {float.diff > 0 ? "+" : ""}
                {float.diff.toLocaleString()}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 text-[11px]">
          {p.inJail && <span className="bg-sky/50 rounded-full px-2 py-[1px]">🛁 ในอ่าง</span>}
          {p.skipTurns > 0 && <span className="bg-cream-2 rounded-full px-2 py-[1px]">💤 พัก {p.skipTurns} ตา</span>}
          {p.bankrupt && <span className="bg-berry/20 rounded-full px-2 py-[1px]">ล้มละลาย</span>}
        </div>
      </div>
      <div className="flex gap-3 text-[11px] text-cocoa/70 tabular-nums">
        <span title="ราคาที่ซื้อมาของที่ดินและสิ่งก่อสร้างทั้งหมด">
          ทรัพย์สิน <b className="text-cocoa">{baht(w.assets)}</b>
        </span>
        <span title={`ขายคืนธนาคารได้ ${Math.round(view.rules.landSellBackRatio * 100)}% ของราคาซื้อ`}>
          ขายคืนได้ <b className="text-cocoa">{baht(w.sellable)}</b>
        </span>
        <span title="เงินสด + ทรัพย์สิน − หนี้" className="ml-auto">
          รวม <b className="text-cocoa">{baht(cash + w.assets - debt - bankDebt)}</b>
        </span>
      </div>
      {debt > 0 && (
        <div className="relative flex items-center gap-2 text-[12px] bg-[#fff1e6] dark:bg-[#3a2416] border border-[#f08a2b]/40 rounded-xl px-2 py-1">
          <span className="text-[#b8621a]">
            ติดหนี้ <b>{view.players.find((o) => o.seat !== p.seat)?.name}</b> <b className="tabular-nums">{baht(debt)}</b>
            {debtFloat && (
              <span key={debtFloat.key} className="money-float absolute left-2 -top-2 font-bold text-[#b8621a] dark:text-[#ffb070]">
                {debtFloat.diff > 0 ? "+" : ""}
                {debtFloat.diff.toLocaleString()}
              </span>
            )}
          </span>
          {p.seat === view.me && onPayDebt && (
            <span className="ml-auto flex gap-1">
              <button className="btn-secondary text-[11px] px-2 py-[2px]" disabled={p.cash <= 0} onClick={() => {
                const v = prompt(`ชำระเท่าไหร่? (ติดอยู่ ${baht(p.debt)} · เงินสด ${baht(p.cash)})`, String(Math.min(p.debt, p.cash)));
                const n = Number((v ?? "").replace(/[^\d]/g, ""));
                if (n > 0) onPayDebt(n);
              }}>
                ชำระบางส่วน
              </button>
              <button className="btn-secondary text-[11px] px-2 py-[2px]" disabled={p.cash <= 0} onClick={() => onPayDebt()}>
                ชำระทั้งหมด
              </button>
            </span>
          )}
        </div>
      )}
      {bankDebt > 0 && (
        <div className="relative flex items-center gap-2 text-[12px] bg-[#fff1e6] dark:bg-[#3a2416] border border-[#f08a2b]/40 rounded-xl px-2 py-1">
          <span className="text-[#b8621a]">
            ติดหนี้ <b>ธนาคาร</b> <b className="tabular-nums">{baht(bankDebt)}</b>
            {bankFloat && (
              <span key={bankFloat.key} className="money-float absolute left-2 -top-2 font-bold text-[#b8621a] dark:text-[#ffb070]">
                {bankFloat.diff > 0 ? "+" : ""}
                {bankFloat.diff.toLocaleString()}
              </span>
            )}
          </span>
          {p.seat === view.me && onPayBankDebt && (
            <span className="ml-auto flex gap-1">
              <button className="btn-secondary text-[11px] px-2 py-[2px]" disabled={p.cash <= 0} onClick={() => {
                const v = prompt(`ชำระเท่าไหร่? (ติดธนาคาร ${baht(p.bankDebt)} · เงินสด ${baht(p.cash)})`, String(Math.min(p.bankDebt, p.cash)));
                const n = Number((v ?? "").replace(/[^\d]/g, ""));
                if (n > 0) onPayBankDebt(n);
              }}>
                ชำระบางส่วน
              </button>
              <button className="btn-secondary text-[11px] px-2 py-[2px]" disabled={p.cash <= 0} onClick={() => onPayBankDebt()}>
                ชำระทั้งหมด
              </button>
            </span>
          )}
        </div>
      )}
      {owned.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {owned.map((t) => {
            const prop = view.props.find((x) => x.tileIndex === t.index)!;
            return (
              <button
                key={t.index}
                onClick={() => onTile(t.index)}
                title={t.name}
                style={{ borderColor: t.group ? GROUP_COLORS[t.group] : t.type === "station" ? "#c9c0b3" : "#e0a458" }}
                className="relative w-8 h-8 rounded-lg border-[3px] overflow-hidden bg-white shadow-sm"
              >
                {(() => {
                  const Art = TILE_ART[t.index] ?? ART_BY_TYPE[t.type];
                  return Art ? <Art animate={false} /> : null;
                })()}
                {(prop.landmark || prop.houses > 0) && (
                  <span className="absolute right-0 bottom-0 bg-pill text-white text-[9px] leading-none px-[3px] py-[1px] rounded-tl-md">
                    {prop.landmark ? "★" : prop.houses}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function PlayerPanel({
  view,
  shown,
  onTile,
  onPayDebt,
  onPayBankDebt,
}: {
  view: GameView;
  shown?: { cash: number[]; debt: number[]; bank: number[] };
  onTile: (i: number) => void;
  onPayDebt?: (amount?: number) => void;
  onPayBankDebt?: (amount?: number) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
      {view.players.map((p) => (
        <PlayerCard key={p.seat} view={view} p={p} shown={shown && { cash: shown.cash[p.seat], debt: shown.debt[p.seat], bank: shown.bank[p.seat] }} onTile={onTile} onPayDebt={onPayDebt} onPayBankDebt={onPayBankDebt} />
      ))}
    </div>
  );
}
