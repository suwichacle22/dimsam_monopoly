import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { DEFAULT_CARDS, DEFAULT_RULES, DEFAULT_TILES, type Rules } from "./defaults";
import { GameError, type Snapshot, type Card, type Tile, type Prop } from "./engine";

type Ctx = QueryCtx | MutationCtx;

export function roomPassword(): string {
  return process.env.ROOM_PASSWORD ?? "dimsam";
}

export function checkPassword(password: string) {
  if (password !== roomPassword()) throw new GameError("รหัสห้องไม่ถูกต้อง");
}

export async function seedIfNeeded(ctx: MutationCtx) {
  if (!(await ctx.db.query("tiles").first())) {
    for (const t of DEFAULT_TILES) await ctx.db.insert("tiles", t);
  }
  if (!(await ctx.db.query("cards").first())) {
    let i = 0;
    for (const c of DEFAULT_CARDS) await ctx.db.insert("cards", { ...c, order: i++, enabled: true });
  }
  if (!(await ctx.db.query("rules").first())) {
    await ctx.db.insert("rules", DEFAULT_RULES);
  }
}

export async function getRules(ctx: Ctx): Promise<Rules> {
  const doc = await ctx.db.query("rules").first();
  if (!doc) return DEFAULT_RULES;
  const { _id, _creationTime, ...rules } = doc;
  return { ...DEFAULT_RULES, ...rules };
}

export async function getTiles(ctx: Ctx): Promise<Tile[]> {
  const docs = await ctx.db.query("tiles").withIndex("by_index").collect();
  if (docs.length === 0) return DEFAULT_TILES;
  return docs.map(({ _id, _creationTime, ...t }) => t);
}

export async function getCards(ctx: Ctx): Promise<Card[]> {
  const docs = await ctx.db.query("cards").collect();
  return docs.filter((c) => c.enabled).map((c) => ({ id: c._id, deck: c.deck, text: c.text, effect: c.effect }));
}

/** The one game that is currently open (lobby or playing). */
export async function openGame(ctx: Ctx): Promise<Doc<"games"> | null> {
  const playing = await ctx.db.query("games").withIndex("by_status", (q) => q.eq("status", "playing")).order("desc").first();
  if (playing) return playing;
  return await ctx.db.query("games").withIndex("by_status", (q) => q.eq("status", "lobby")).order("desc").first();
}

export async function playerByToken(ctx: Ctx, token: string): Promise<Doc<"players">> {
  const p = await ctx.db.query("players").withIndex("by_token", (q) => q.eq("token", token)).first();
  if (!p) throw new GameError("ไม่พบผู้เล่น กรุณาเข้าห้องใหม่");
  return p;
}

export async function gamePlayers(ctx: Ctx, gameId: Id<"games">): Promise<Doc<"players">[]> {
  return await ctx.db.query("players").withIndex("by_game", (q) => q.eq("gameId", gameId)).collect();
}

export async function gameProps(ctx: Ctx, gameId: Id<"games">): Promise<Doc<"properties">[]> {
  return await ctx.db.query("properties").withIndex("by_game", (q) => q.eq("gameId", gameId)).collect();
}

export type Loaded = {
  snap: Snapshot;
  game: Doc<"games">;
  players: Doc<"players">[];
  props: Doc<"properties">[];
};

export async function loadSnapshot(ctx: Ctx, game: Doc<"games">): Promise<Loaded> {
  const players = (await gamePlayers(ctx, game._id)).sort((a, b) => a.seat - b.seat);
  const props = await gameProps(ctx, game._id);
  const propMap: Record<number, Prop> = {};
  for (const p of props) propMap[p.tileIndex] = { ownerSeat: p.ownerSeat, houses: p.houses, landmark: p.landmark };
  const { _id, _creationTime, createdAt, startedAt, finishedAt, ...gameState } = game;
  const snap: Snapshot = {
    rules: await getRules(ctx),
    tiles: await getTiles(ctx),
    cards: await getCards(ctx),
    game: { ...gameState, builtThisTurn: game.builtThisTurn ?? 0, treasureDeck: [...game.treasureDeck], specialDeck: [...game.specialDeck] },
    players: players.map((p) => ({
      seat: p.seat,
      name: p.name,
      cash: p.cash,
      position: p.position,
      inJail: p.inJail,
      jailTurns: p.jailTurns,
      skipTurns: p.skipTurns,
      bankrupt: p.bankrupt,
      debt: p.debt ?? 0,
    })),
    props: propMap,
    events: [],
    now: Date.now(),
    roll: () => 1 + Math.floor(Math.random() * 6),
  };
  return { snap, game, players, props };
}

export async function saveSnapshot(ctx: MutationCtx, loaded: Loaded) {
  const { snap, game, players, props } = loaded;
  const g = snap.game;
  await ctx.db.patch(game._id, {
    status: g.status,
    turn: g.turn,
    phase: g.phase,
    dice: g.dice,
    doublesCount: g.doublesCount,
    lastRollDouble: g.lastRollDouble,
    builtThisTurn: g.builtThisTurn,
    pending: g.pending,
    treasureDeck: g.treasureDeck as Id<"cards">[],
    specialDeck: g.specialDeck as Id<"cards">[],
    lastCard: g.lastCard,
    moves: g.moves,
    actionAt: g.actionAt,
    winner: g.winner,
    ...(g.status === "finished" && !game.finishedAt ? { finishedAt: snap.now } : {}),
    ...(g.status === "playing" && !game.startedAt ? { startedAt: snap.now } : {}),
  });
  for (const ps of snap.players) {
    const doc = players.find((p) => p.seat === ps.seat)!;
    await ctx.db.patch(doc._id, {
      cash: ps.cash,
      position: ps.position,
      inJail: ps.inJail,
      jailTurns: ps.jailTurns,
      skipTurns: ps.skipTurns,
      bankrupt: ps.bankrupt,
      debt: ps.debt,
    });
  }
  const seen = new Set<number>();
  for (const [k, p] of Object.entries(snap.props)) {
    const idx = Number(k);
    seen.add(idx);
    const doc = props.find((d) => d.tileIndex === idx);
    if (!doc) {
      await ctx.db.insert("properties", { gameId: game._id, tileIndex: idx, ...p });
    } else if (doc.ownerSeat !== p.ownerSeat || doc.houses !== p.houses || doc.landmark !== p.landmark) {
      await ctx.db.patch(doc._id, p);
    }
  }
  for (const doc of props) if (!seen.has(doc.tileIndex)) await ctx.db.delete(doc._id);
  for (const e of snap.events) {
    await ctx.db.insert("events", { gameId: game._id, at: snap.now, seat: e.seat, kind: e.kind, text: e.text });
  }
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function newToken(): string {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
