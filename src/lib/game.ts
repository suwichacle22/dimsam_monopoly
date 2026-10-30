import type { FunctionReturnType } from "convex/server";
import type { api } from "../../convex/_generated/api";

export type GameView = NonNullable<FunctionReturnType<typeof api.game.state>>;
export type PlayerView = GameView["players"][number];
export type TileView = GameView["tiles"][number];
export type PropView = GameView["props"][number];
export type EventView = GameView["events"][number];
export type RulesView = GameView["rules"];

export function propAt(view: GameView, tileIndex: number): PropView | undefined {
  return view.props.find((p) => p.tileIndex === tileIndex);
}

export function hasMonopoly(view: GameView, seat: number, group?: string): boolean {
  if (!group) return false;
  const g = view.tiles.filter((t) => t.type === "city" && t.group === group);
  return g.length > 0 && g.every((t) => propAt(view, t.index)?.ownerSeat === seat);
}

/** Why a player can't build here right now, or null if they can. */
export function buildBlocker(view: GameView, seat: number, tile: TileView): string | null {
  const prop = propAt(view, tile.index);
  const me = view.players.find((p) => p.seat === seat);
  const r = view.rules;
  if (!prop || prop.ownerSeat !== seat || tile.type !== "city") return "ไม่ใช่เมืองของคุณ";
  if (prop.landmark) return "สร้างเต็มแล้ว";
  if (view.game.turn !== seat || view.game.status !== "playing") return "ยังไม่ถึงตาคุณ";
  if (!["roll", "end", "jail", "world_tour"].includes(view.game.phase)) return "ตอนนี้สร้างไม่ได้";
  if (r.buildOnlyOnLandedTile && me?.position !== tile.index) return "สร้างได้เฉพาะช่องที่ยืนอยู่";
  if (r.maxHousesPerTurn > 0 && (view.game.builtThisTurn ?? 0) >= r.maxHousesPerTurn) return `ตานี้สร้างครบ ${r.maxHousesPerTurn} หลังแล้ว`;
  if (r.requireMonopolyToBuild && !hasMonopoly(view, seat, tile.group)) return "ต้องมีครบทั้งสีก่อน";
  return null;
}

export function canBuildNow(view: GameView, seat: number, tile: TileView): boolean {
  return buildBlocker(view, seat, tile) === null;
}

export function buildCost(view: GameView, tile: TileView): { cost: number; landmark: boolean } {
  const prop = propAt(view, tile.index);
  const landmark = !!prop && prop.houses >= view.rules.maxHouses;
  return { cost: Math.round((tile.housePrice ?? 0) * (landmark ? view.rules.landmarkCostMultiplier : 1)), landmark };
}

export function canSellNow(view: GameView, seat: number, tile: TileView): boolean {
  const prop = propAt(view, tile.index);
  if (!prop || prop.ownerSeat !== seat) return false;
  if (view.game.turn !== seat) return false;
  return ["roll", "end", "jail", "broke", "world_tour"].includes(view.game.phase);
}

export function rentPreview(view: GameView, tile: TileView, diceSum = 7): number {
  const prop = propAt(view, tile.index);
  if (!prop) return 0;
  const r = view.rules;
  if (tile.type === "city") {
    const rent = tile.rent ?? [];
    if (prop.landmark) return rent[5] ?? 0;
    if (prop.houses > 0) return rent[prop.houses] ?? 0;
    const base = rent[0] ?? 0;
    return r.monopolyDoublesBareRent && hasMonopoly(view, prop.ownerSeat, tile.group) ? base * 2 : base;
  }
  const owned = view.props.filter((p) => p.ownerSeat === prop.ownerSeat);
  if (tile.type === "special_item") {
    const n = owned.filter((p) => view.tiles.find((t) => t.index === p.tileIndex)?.type === "special_item").length;
    return r.specialItemRent[Math.min(n, r.specialItemRent.length) - 1] ?? 0;
  }
  if (tile.type === "station") {
    const n = owned.filter((p) => view.tiles.find((t) => t.index === p.tileIndex)?.type === "station").length;
    return diceSum * (r.stationRent[Math.min(n, r.stationRent.length) - 1] ?? 0);
  }
  return 0;
}

export function landSellValue(view: GameView, tile: TileView): number {
  return tile.sellBack ?? Math.floor((tile.price ?? 0) * view.rules.landSellBackRatio);
}

export function houseSellValue(view: GameView, tile: TileView, landmark: boolean): number {
  const r = view.rules;
  return Math.floor((tile.housePrice ?? 0) * (landmark ? r.landmarkCostMultiplier : 1) * r.houseSellBackRatio);
}

/** How a "tab" payment of `amount` would split for `seat` right now. */
export function tabPreview(view: GameView, seat: number, amount: number): { offset: number; tabbed: number; cash: number } {
  const me = view.players.find((p) => p.seat === seat)!;
  const other = view.players.find((p) => p.seat !== seat);
  const offset = Math.min(amount, other?.debt ?? 0);
  const room = Math.max(0, view.rules.maxDebt - me.debt);
  const tabbed = Math.min(amount - offset, room);
  return { offset, tabbed, cash: amount - offset - tabbed };
}

/** Purchase value of everything a player owns, and what the bank would pay for it now. */
export function wealth(view: GameView, seat: number): { assets: number; sellable: number } {
  let assets = 0;
  let sellable = 0;
  const r = view.rules;
  for (const p of view.props) {
    if (p.ownerSeat !== seat) continue;
    const t = view.tiles.find((x) => x.index === p.tileIndex);
    if (!t) continue;
    assets += t.price ?? 0;
    sellable += landSellValue(view, t);
    assets += p.houses * (t.housePrice ?? 0);
    sellable += p.houses * houseSellValue(view, t, false);
    if (p.landmark) {
      assets += r.maxHouses * (t.housePrice ?? 0) + Math.round((t.housePrice ?? 0) * r.landmarkCostMultiplier);
      sellable += r.maxHouses * houseSellValue(view, t, false) + houseSellValue(view, t, true);
    }
  }
  return { assets, sellable };
}
