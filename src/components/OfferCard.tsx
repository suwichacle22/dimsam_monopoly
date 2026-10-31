import { TILE_ART, ART_BY_TYPE } from "~/art/tiles";
import type { GameView } from "~/lib/game";
import { offerSettle, propAt } from "~/lib/game";
import { baht, cx } from "~/lib/format";

/** The one open "sell you my land" offer: a decision card for the buyer, a waiting row for the seller. */
export function OfferCard({ view, busy, onRespond, onCancel }: { view: GameView; busy: boolean; onRespond: (accept: boolean) => void; onCancel: () => void }) {
  const o = view.game.offer;
  if (!o || view.game.status !== "playing") return null;
  const tile = view.tiles.find((t) => t.index === o.tileIndex);
  if (!tile) return null;
  const seller = view.players[o.fromSeat];
  const buyer = view.players[o.toSeat];
  const me = view.players.find((p) => p.seat === view.me)!;
  const prop = propAt(view, tile.index);
  const Art = TILE_ART[tile.index] ?? ART_BY_TYPE[tile.type];
  const { offset, cash } = offerSettle(view, o);
  const what = prop?.landmark ? "แลนด์มาร์ก ★" : prop && prop.houses > 0 ? `บ้าน ${prop.houses} หลัง` : "ที่ดินเปล่า";

  if (o.fromSeat === view.me) {
    return (
      <div className="card p-3 flex items-center gap-3 border-caramel/60 pop-in">
        <div className="w-10 h-10 rounded-lg overflow-hidden border border-cocoa/20 bg-white shrink-0">{Art && <Art animate={false} />}</div>
        <div className="min-w-0 flex-1 text-sm leading-tight">
          <div className="text-cocoa/70">รอ {buyer.name} ตอบ…</div>
          <div className="font-semibold text-cocoa truncate">เสนอขาย {tile.name} {baht(o.price)}</div>
        </div>
        <button className="btn-secondary text-xs px-3 py-2" disabled={busy} onClick={onCancel}>
          ยกเลิกข้อเสนอ
        </button>
      </div>
    );
  }
  if (o.toSeat !== view.me) return null;
  const canPay = me.cash >= cash;
  return (
    <div className="card p-3 flex flex-col gap-2 border-caramel pop-in">
      <div className="flex items-center gap-3">
        <div className="w-14 h-14 rounded-xl overflow-hidden border border-cocoa/20 bg-white shrink-0">{Art && <Art animate />}</div>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="text-xs text-cocoa/70">🤝 {seller.name} เสนอขายให้คุณ · {what}</div>
          <div className="font-bold text-cocoa text-lg truncate">{tile.name}</div>
          <div className="font-bold text-berry text-2xl tabular-nums">{baht(o.price)}</div>
        </div>
      </div>
      <div className="text-xs text-cocoa/70">
        {offset > 0 && <span>หักหนี้ที่ {seller.name} ติดคุณ {baht(offset)}</span>}
        {offset > 0 && cash > 0 && " · "}
        {cash > 0 && <span className={cx(!canPay && "text-berry")}>จ่ายสด {baht(cash)}{!canPay ? " (เงินสดไม่พอ)" : ""}</span>}
        {offset === 0 && cash === 0 && <span>ไม่มีเงินเปลี่ยนมือ</span>}
      </div>
      <div className="flex gap-2">
        <button className="btn-primary flex-1 text-base py-2" disabled={busy || !canPay} onClick={() => onRespond(true)}>
          ซื้อ {baht(o.price)}
        </button>
        <button className="btn-secondary flex-1 text-base py-2" disabled={busy} onClick={() => onRespond(false)}>
          ไม่ซื้อ
        </button>
      </div>
    </div>
  );
}
