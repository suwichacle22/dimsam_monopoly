import { TILE_ART, ART_BY_TYPE } from "~/art/tiles";
import type { GameView, TileView } from "~/lib/game";
import { canBuildNow, canSellNow, hasMonopoly, propAt, rentPreview } from "~/lib/game";
import { baht, cx, GROUP_COLORS, TYPE_LABEL } from "~/lib/format";

export function TileSheet({
  view,
  tile,
  busy,
  onClose,
  onBuild,
  onSellHouse,
  onSellLand,
}: {
  view: GameView;
  tile: TileView | null;
  busy: boolean;
  onClose: () => void;
  onBuild: (i: number) => void;
  onSellHouse: (i: number) => void;
  onSellLand: (i: number) => void;
}) {
  if (!tile) return null;
  const Art = TILE_ART[tile.index] ?? ART_BY_TYPE[tile.type];
  const prop = propAt(view, tile.index);
  const owner = prop ? view.players.find((p) => p.seat === prop.ownerSeat) : undefined;
  const r = view.rules;
  const band = tile.group ? GROUP_COLORS[tile.group] : "#e0c9a6";
  const buildable = canBuildNow(view, view.me, tile);
  const sellable = canSellNow(view, view.me, tile);
  const toLandmark = prop && prop.houses >= r.maxHouses;
  const buildCost = Math.round((tile.housePrice ?? 0) * (toLandmark ? r.landmarkCostMultiplier : 1));
  const monopoly = prop && tile.group ? hasMonopoly(view, prop.ownerSeat, tile.group) : false;

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-cocoa-2/40" onClick={onClose}>
      <div className="card w-full sm:max-w-md max-h-[88dvh] overflow-y-auto rounded-b-none sm:rounded-b-3xl pop-in" onClick={(e) => e.stopPropagation()}>
        <div style={{ background: band }} className="h-3 rounded-t-3xl" />
        <div className="p-4 flex gap-4">
          <div className="w-24 h-24 shrink-0 rounded-2xl overflow-hidden border border-cocoa/20 bg-white">{Art && <Art animate />}</div>
          <div className="min-w-0 flex-1">
            <div className="text-xs text-cocoa/60">{TYPE_LABEL[tile.type]}</div>
            <h2 className="text-xl font-bold text-cocoa leading-tight">{tile.name}</h2>
            {tile.blurb && <p className="text-sm text-cocoa/70 mt-1">{tile.blurb}</p>}
            {tile.price ? <p className="text-sm mt-1">ราคา <b>{baht(tile.price)}</b> · ขายคืน {baht(tile.sellBack ?? 0)}</p> : null}
            {owner ? (
              <p className="text-sm mt-1">
                เจ้าของ: <b>{owner.name}</b>
                {prop?.landmark ? " · แลนด์มาร์ก ★" : prop && prop.houses > 0 ? ` · บ้าน ${prop.houses} หลัง` : ""}
                {monopoly && " · ครบสี"}
              </p>
            ) : tile.price ? (
              <p className="text-sm mt-1 text-cocoa/60">ยังไม่มีเจ้าของ</p>
            ) : null}
          </div>
        </div>

        {tile.type === "city" && tile.rent && (
          <div className="px-4 pb-2">
            <table className="w-full text-sm">
              <tbody>
                {[
                  ["ที่ดินเปล่า", tile.rent[0]],
                  ["บ้าน 1 หลัง", tile.rent[1]],
                  ["บ้าน 2 หลัง", tile.rent[2]],
                  ["บ้าน 3 หลัง", tile.rent[3]],
                  ["บ้าน 4 หลัง", tile.rent[4]],
                  ["แลนด์มาร์ก ★", tile.rent[5]],
                ].map(([label, v], i) => {
                  const active = prop && (prop.landmark ? i === 5 : prop.houses === i);
                  return (
                    <tr key={label as string} className={cx(active && "font-bold text-cocoa")}>
                      <td className="py-[2px]">{label}</td>
                      <td className="py-[2px] text-right tabular-nums">{baht(v as number)}</td>
                    </tr>
                  );
                })}
                <tr className="text-cocoa/60">
                  <td className="pt-1">ราคาบ้าน / หลัง</td>
                  <td className="pt-1 text-right tabular-nums">{baht(tile.housePrice ?? 0)}</td>
                </tr>
                {r.monopolyDoublesBareRent && (
                  <tr className="text-cocoa/60 text-xs">
                    <td colSpan={2} className="pt-1">ถ้าเจ้าของมีครบทั้งสี ค่าเช่าที่ดินเปล่า ×2</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        {tile.type === "special_item" && (
          <div className="px-4 pb-2 text-sm">
            <p className="text-cocoa/70 mb-1">ค่าเช่าตามจำนวนของเล่นที่เจ้าของมี</p>
            {r.specialItemRent.map((v, i) => (
              <div key={i} className="flex justify-between">
                <span>มี {i + 1} ชิ้น</span>
                <span className="tabular-nums">{baht(v)}</span>
              </div>
            ))}
          </div>
        )}
        {tile.type === "station" && (
          <div className="px-4 pb-2 text-sm">
            <p className="text-cocoa/70 mb-1">ค่าเช่า = แต้มลูกเต๋าที่ทอยได้ × ตัวคูณ</p>
            {r.stationRent.map((v, i) => (
              <div key={i} className="flex justify-between">
                <span>มี {i + 1} ร้าน</span>
                <span className="tabular-nums">× {v}</span>
              </div>
            ))}
          </div>
        )}
        {tile.type === "tax" && <p className="px-4 pb-2 text-sm">ตกช่องนี้จ่าย {baht(tile.amount ?? 0)}</p>}
        {prop && owner && owner.seat !== view.me && (
          <p className="px-4 pb-2 text-sm text-berry">ถ้าคุณตกช่องนี้ตอนนี้ จ่ายประมาณ {baht(rentPreview(view, tile, view.game.dice[0] + view.game.dice[1]))}</p>
        )}

        {(buildable || sellable) && (
          <div className="px-4 pb-4 pt-2 flex flex-wrap gap-2 border-t border-cocoa/10">
            {buildable && (
              <button className="btn-primary text-base" disabled={busy} onClick={() => onBuild(tile.index)}>
                {toLandmark ? `สร้างแลนด์มาร์ก ★ (${baht(buildCost)})` : `สร้างบ้าน (${baht(buildCost)})`}
              </button>
            )}
            {sellable && prop && (prop.houses > 0 || prop.landmark) && (
              <button className="btn-secondary" disabled={busy} onClick={() => onSellHouse(tile.index)}>
                ขาย{prop.landmark ? "แลนด์มาร์ก" : "บ้าน 1 หลัง"} (+{baht(Math.floor((tile.housePrice ?? 0) * (prop.landmark ? r.landmarkCostMultiplier : 1) * r.houseSellBackRatio))})
              </button>
            )}
            {sellable && prop && prop.houses === 0 && !prop.landmark && (
              <button className="btn-secondary" disabled={busy} onClick={() => onSellLand(tile.index)}>
                ขายที่ดินคืน (+{baht(tile.sellBack ?? 0)})
              </button>
            )}
          </div>
        )}
        <button className="w-full py-3 text-sm text-cocoa/60" onClick={onClose}>
          ปิด
        </button>
      </div>
    </div>
  );
}
