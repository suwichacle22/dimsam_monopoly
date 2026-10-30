import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import * as E from "./engine";
import {
  checkPassword,
  gamePlayers,
  gameProps,
  getCards,
  getRules,
  getTiles,
  loadSnapshot,
  newToken,
  openGame,
  playerByToken,
  saveSnapshot,
  seedIfNeeded,
  shuffle,
} from "./lib";
import type { MutationCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";

const variant = v.union(v.literal("blue"), v.literal("pink"));

function wrap<T>(fn: () => Promise<T>): Promise<T> {
  return fn().catch((e) => {
    if (e instanceof E.GameError) throw new ConvexError(e.message);
    throw e;
  });
}

const publicPlayer = (p: Doc<"players">) => ({
  seat: p.seat,
  name: p.name,
  variant: p.variant,
  cash: p.cash,
  position: p.position,
  inJail: p.inJail,
  jailTurns: p.jailTurns,
  skipTurns: p.skipTurns,
  bankrupt: p.bankrupt,
  debt: p.debt ?? 0,
  bot: p.bot ?? false,
  online: p.bot ? true : Date.now() - p.lastSeen < 45_000,
});

export const checkRoom = query({
  args: { password: v.string() },
  handler: async (_ctx, { password }) => {
    try {
      checkPassword(password);
      return true;
    } catch {
      return false;
    }
  },
});

export const lobby = query({
  args: { password: v.string() },
  handler: async (ctx, { password }) =>
    wrap(async () => {
      checkPassword(password);
      const game = await openGame(ctx);
      if (!game) return { game: null, players: [] };
      const players = await gamePlayers(ctx, game._id);
      return {
        game: { id: game._id, status: game.status },
        players: players.sort((a, b) => a.seat - b.seat).map(publicPlayer),
      };
    }),
});

export const join = mutation({
  args: { password: v.string(), seat: v.number(), name: v.string(), variant },
  handler: async (ctx, { password, seat, name, variant }) =>
    wrap(async () => {
      checkPassword(password);
      await seedIfNeeded(ctx);
      if (seat !== 0 && seat !== 1) throw new E.GameError("ที่นั่งไม่ถูกต้อง");
      const trimmed = name.trim().slice(0, 20);
      if (!trimmed) throw new E.GameError("ใส่ชื่อก่อนนะ");
      let game = await openGame(ctx);
      if (!game) {
        const id = await ctx.db.insert("games", {
          status: "lobby",
          turn: 0,
          phase: "roll",
          dice: [1, 1],
          doublesCount: 0,
          lastRollDouble: false,
          builtThisTurn: 0,
          treasureDeck: [],
          specialDeck: [],
          moves: [],
          actionAt: Date.now(),
          createdAt: Date.now(),
        });
        game = (await ctx.db.get(id))!;
      }
      const players = await gamePlayers(ctx, game._id);
      const existing = players.find((p) => p.seat === seat);
      if (existing) {
        if (game.status !== "lobby") throw new E.GameError("ที่นั่งนี้มีคนเล่นอยู่แล้ว");
        // reclaim a lobby seat (e.g. the other person refreshed) — hand out a fresh token
        const token = newToken();
        await ctx.db.patch(existing._id, { name: trimmed, variant, token, lastSeen: Date.now() });
        return { token, gameId: game._id, seat };
      }
      if (game.status !== "lobby") throw new E.GameError("เกมเริ่มไปแล้ว");
      const token = newToken();
      await ctx.db.insert("players", {
        gameId: game._id,
        seat,
        name: trimmed,
        variant,
        token,
        cash: 0,
        position: 0,
        inJail: false,
        jailTurns: 0,
        skipTurns: 0,
        bankrupt: false,
        lastSeen: Date.now(),
      });
      return { token, gameId: game._id, seat };
    }),
});

/** Solo test mode: fill the other seat with a bot that plays by itself. */
export const addBot = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) =>
    wrap(async () => {
      const me = await playerByToken(ctx, token);
      const game = await ctx.db.get(me.gameId);
      if (!game || game.status !== "lobby") throw new E.GameError("เพิ่มบอทได้เฉพาะตอนอยู่ในห้องรอ");
      const players = await gamePlayers(ctx, game._id);
      const seat = me.seat === 0 ? 1 : 0;
      if (players.some((p) => p.seat === seat)) throw new E.GameError("ที่นั่งนั้นมีคนแล้ว");
      await ctx.db.insert("players", {
        gameId: game._id,
        seat,
        name: "บอทติ่มซำ",
        variant: me.variant === "blue" ? "pink" : "blue",
        token: newToken(),
        cash: 0,
        position: 0,
        inJail: false,
        jailTurns: 0,
        skipTurns: 0,
        bankrupt: false,
        bot: true,
        lastSeen: Date.now(),
      });
    }),
});

/** One decision for the bot, called by the human's browser while it is the bot's turn. */
export const botStep = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) =>
    wrap(async () => {
      const me = await playerByToken(ctx, token);
      const game = await ctx.db.get(me.gameId);
      if (!game || game.status !== "playing") return "idle";
      const players = await gamePlayers(ctx, game._id);
      const bot = players.find((p) => p.seat === game.turn && p.bot);
      if (!bot) return "idle";
      const loaded = await loadSnapshot(ctx, game);
      const s = loaded.snap;
      const seat = bot.seat;
      const p = s.players[seat];
      const tile = s.tiles.find((t) => t.index === p.position);
      switch (game.phase) {
        case "roll":
        case "card_roll":
          E.roll(s, seat);
          break;
        case "jail":
          if (p.cash >= s.rules.jailFine * 4) E.payJail(s, seat);
          else E.roll(s, seat);
          break;
        case "buy": {
          const price = tile?.price ?? 0;
          const house = tile?.type === "city" ? (tile.housePrice ?? 0) : 0;
          if (p.cash - price - house >= 8000 && house > 0 && !s.rules.requireMonopolyToBuild) E.buy(s, seat, true);
          else if (p.cash - price >= 5000) E.buy(s, seat);
          else E.skipBuy(s, seat);
          break;
        }
        case "rent": {
          const amount = (game.pending as { amount: number }).amount;
          E.payRent(s, seat, p.cash - amount >= 6000 || p.debt + amount > s.rules.maxDebt ? "cash" : "tab");
          break;
        }
        case "world_tour": {
          const own = E.ownedBy(s, seat);
          E.worldTour(s, seat, own.length ? own[Math.floor(Math.random() * own.length)] : undefined);
          break;
        }
        case "broke": {
          const own = E.ownedBy(s, seat).sort((a, b) => (s.tiles.find((t) => t.index === a)?.price ?? 0) - (s.tiles.find((t) => t.index === b)?.price ?? 0));
          const withHouses = own.find((i) => s.props[i].houses > 0 || s.props[i].landmark);
          if (withHouses !== undefined) E.sellHouse(s, seat, withHouses);
          else if (own.length) E.sellLand(s, seat, own[0]);
          else E.giveUp(s, seat);
          break;
        }
        case "end": {
          // build where standing if cheap enough, then end
          if (tile && tile.type === "city" && s.props[tile.index]?.ownerSeat === seat && p.cash >= (tile.housePrice ?? 0) + 6000) {
            try {
              E.build(s, seat, tile.index);
            } catch {
              /* not allowed right now */
            }
          }
          if (p.debt > 0 && p.cash - p.debt >= 10000) E.payDebt(s, seat);
          E.endTurn(s, seat);
          break;
        }
      }
      await saveSnapshot(ctx, loaded);
      return game.phase;
    }),
});

/** Re-attach a phone that already holds a token (page reload). */
export const resume = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const p = await ctx.db.query("players").withIndex("by_token", (q) => q.eq("token", token)).first();
    if (!p) return null;
    const game = await ctx.db.get(p.gameId);
    if (!game || game.status === "finished") return null;
    return { seat: p.seat, name: p.name, status: game.status };
  },
});

export const leave = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) =>
    wrap(async () => {
      const p = await playerByToken(ctx, token);
      const game = await ctx.db.get(p.gameId);
      if (game && game.status === "lobby") await ctx.db.delete(p._id);
    }),
});

export const heartbeat = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const p = await ctx.db.query("players").withIndex("by_token", (q) => q.eq("token", token)).first();
    if (p) await ctx.db.patch(p._id, { lastSeen: Date.now() });
  },
});

export const start = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) =>
    wrap(async () => {
      const me = await playerByToken(ctx, token);
      const game = await ctx.db.get(me.gameId);
      if (!game || game.status !== "lobby") throw new E.GameError("เกมเริ่มไปแล้ว");
      const cards = await getCards(ctx);
      await ctx.db.patch(game._id, {
        treasureDeck: shuffle(cards.filter((c) => c.deck === "treasure").map((c) => c.id)) as Doc<"cards">["_id"][],
        specialDeck: shuffle(cards.filter((c) => c.deck === "special").map((c) => c.id)) as Doc<"cards">["_id"][],
      });
      const loaded = await loadSnapshot(ctx, (await ctx.db.get(game._id))!);
      E.startGame(loaded.snap);
      await saveSnapshot(ctx, loaded);
    }),
});

/** Full state for the board screen. */
export const state = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) =>
    wrap(async () => {
      const me = await playerByToken(ctx, token);
      const game = await ctx.db.get(me.gameId);
      if (!game) throw new E.GameError("ไม่พบเกม");
      const players = (await gamePlayers(ctx, game._id)).sort((a, b) => a.seat - b.seat);
      const props = await gameProps(ctx, game._id);
      const events = await ctx.db
        .query("events")
        .withIndex("by_game", (q) => q.eq("gameId", game._id))
        .order("desc")
        .take(60);
      const { _creationTime, treasureDeck, specialDeck, ...g } = game;
      return {
        me: me.seat,
        game: { ...g, treasureCount: treasureDeck.length, specialCount: specialDeck.length },
        players: players.map(publicPlayer),
        props: props.map((p) => ({ tileIndex: p.tileIndex, ownerSeat: p.ownerSeat, houses: p.houses, landmark: p.landmark })),
        tiles: await getTiles(ctx),
        rules: await getRules(ctx),
        events: events.reverse().map((e) => ({ id: e._id, at: e.at, seat: e.seat, kind: e.kind, text: e.text })),
      };
    }),
});

/** Start a brand-new game with the same two players (after a finish, or to restart). */
export const newGame = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) =>
    wrap(async () => {
      const me = await playerByToken(ctx, token);
      const old = await ctx.db.get(me.gameId);
      if (!old) throw new E.GameError("ไม่พบเกม");
      const players = await gamePlayers(ctx, old._id);
      if (old.status !== "finished") await ctx.db.patch(old._id, { status: "finished", finishedAt: Date.now() });
      const id = await ctx.db.insert("games", {
        status: "lobby",
        turn: 0,
        phase: "roll",
        dice: [1, 1],
        doublesCount: 0,
        lastRollDouble: false,
        builtThisTurn: 0,
        treasureDeck: [],
        specialDeck: [],
        moves: [],
        actionAt: Date.now(),
        createdAt: Date.now(),
      });
      for (const p of players) {
        await ctx.db.patch(p._id, {
          gameId: id,
          cash: 0,
          position: 0,
          inJail: false,
          jailTurns: 0,
          skipTurns: 0,
          bankrupt: false,
        });
      }
    }),
});

// ── in-game actions ──────────────────────────────────────────────────────

async function act(ctx: MutationCtx, token: string, fn: (s: E.Snapshot, seat: number) => void) {
  return wrap(async () => {
    const me = await playerByToken(ctx, token);
    const game = await ctx.db.get(me.gameId);
    if (!game) throw new E.GameError("ไม่พบเกม");
    const loaded = await loadSnapshot(ctx, game);
    fn(loaded.snap, me.seat);
    await saveSnapshot(ctx, loaded);
    await ctx.db.patch(me._id, { lastSeen: Date.now() });
  });
}

export const roll = mutation({
  args: { token: v.string() },
  handler: (ctx, { token }) => act(ctx, token, (s, seat) => E.roll(s, seat)),
});
export const buy = mutation({
  args: { token: v.string(), withHouse: v.optional(v.boolean()) },
  handler: (ctx, { token, withHouse }) => act(ctx, token, (s, seat) => E.buy(s, seat, withHouse ?? false)),
});
export const payRent = mutation({
  args: { token: v.string(), mode: v.union(v.literal("cash"), v.literal("tab")) },
  handler: (ctx, { token, mode }) => act(ctx, token, (s, seat) => E.payRent(s, seat, mode)),
});
export const payDebt = mutation({
  args: { token: v.string(), amount: v.optional(v.number()) },
  handler: (ctx, { token, amount }) => act(ctx, token, (s, seat) => E.payDebt(s, seat, amount)),
});
export const skipBuy = mutation({
  args: { token: v.string() },
  handler: (ctx, { token }) => act(ctx, token, (s, seat) => E.skipBuy(s, seat)),
});
export const payJail = mutation({
  args: { token: v.string() },
  handler: (ctx, { token }) => act(ctx, token, (s, seat) => E.payJail(s, seat)),
});
export const worldTour = mutation({
  args: { token: v.string(), tileIndex: v.optional(v.number()) },
  handler: (ctx, { token, tileIndex }) => act(ctx, token, (s, seat) => E.worldTour(s, seat, tileIndex)),
});
export const build = mutation({
  args: { token: v.string(), tileIndex: v.number() },
  handler: (ctx, { token, tileIndex }) => act(ctx, token, (s, seat) => E.build(s, seat, tileIndex)),
});
export const sellHouse = mutation({
  args: { token: v.string(), tileIndex: v.number() },
  handler: (ctx, { token, tileIndex }) => act(ctx, token, (s, seat) => E.sellHouse(s, seat, tileIndex)),
});
export const sellLand = mutation({
  args: { token: v.string(), tileIndex: v.number() },
  handler: (ctx, { token, tileIndex }) => act(ctx, token, (s, seat) => E.sellLand(s, seat, tileIndex)),
});
export const endTurn = mutation({
  args: { token: v.string() },
  handler: (ctx, { token }) => act(ctx, token, (s, seat) => E.endTurn(s, seat)),
});
export const giveUp = mutation({
  args: { token: v.string() },
  handler: (ctx, { token }) => act(ctx, token, (s, seat) => E.giveUp(s, seat)),
});
