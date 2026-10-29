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

export function canBuildNow(view: GameView, seat: number, tile: TileView): boolean {
  const prop = propAt(view, tile.index);
  if (!prop || prop.ownerSeat !== seat || tile.type !== "city" || prop.landmark) return false;
  if (view.game.turn !== seat) return false;
  if (!["roll", "end", "jail", "world_tour"].includes(view.game.phase)) return false;
  if (view.rules.requireMonopolyToBuild && !hasMonopoly(view, seat, tile.group)) return false;
  return true;
}

export function canSellNow(view: GameView, seat: number, tile: TileView): boolean {
  const prop = propAt(view, tile.index);
  if (!prop || prop.ownerSeat !== seat) return false;
  if (view.game.turn !== seat) return false;
  return ["roll", "end", "jail", "debt", "world_tour"].includes(view.game.phase);
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
