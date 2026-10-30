// Settings screen API: every number in the game lives in the database and can
// be edited, added or deleted here. Guarded by the room password.
import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { cardEffect, rulesFields, tileFields } from "./schema";
import { DEFAULT_CARDS, DEFAULT_RULES, DEFAULT_TILES } from "./defaults";
import { checkPassword, seedIfNeeded } from "./lib";
import { GameError } from "./engine";

function guard(password: string) {
  try {
    checkPassword(password);
  } catch (e) {
    throw new ConvexError((e as GameError).message);
  }
}

export const all = query({
  args: { password: v.string() },
  handler: async (ctx, { password }) => {
    guard(password);
    const tiles = await ctx.db.query("tiles").withIndex("by_index").collect();
    const cards = await ctx.db.query("cards").collect();
    const rules = await ctx.db.query("rules").first();
    return {
      tiles: tiles.length ? tiles : DEFAULT_TILES.map((t) => ({ ...t, _id: undefined })),
      cards: cards.sort((a, b) => a.deck.localeCompare(b.deck) || a.order - b.order),
      rules: rules ?? DEFAULT_RULES,
    };
  },
});

export const seed = mutation({
  args: { password: v.string() },
  handler: async (ctx, { password }) => {
    guard(password);
    await seedIfNeeded(ctx);
  },
});

export const updateRules = mutation({
  args: { password: v.string(), rules: v.object(rulesFields) },
  handler: async (ctx, { password, rules }) => {
    guard(password);
    await seedIfNeeded(ctx);
    const doc = await ctx.db.query("rules").first();
    if (doc) await ctx.db.replace(doc._id, rules);
    else await ctx.db.insert("rules", rules);
  },
});

export const updateTile = mutation({
  args: { password: v.string(), tile: v.object(tileFields) },
  handler: async (ctx, { password, tile }) => {
    guard(password);
    await seedIfNeeded(ctx);
    const doc = await ctx.db.query("tiles").withIndex("by_index", (q) => q.eq("index", tile.index)).first();
    if (doc) await ctx.db.replace(doc._id, tile);
    else await ctx.db.insert("tiles", tile);
  },
});

export const upsertCard = mutation({
  args: {
    password: v.string(),
    id: v.optional(v.id("cards")),
    deck: v.union(v.literal("treasure"), v.literal("special")),
    text: v.string(),
    effect: cardEffect,
    enabled: v.boolean(),
  },
  handler: async (ctx, { password, id, ...card }) => {
    guard(password);
    await seedIfNeeded(ctx);
    if (id) {
      const doc = await ctx.db.get(id);
      if (!doc) throw new ConvexError("ไม่พบการ์ด");
      await ctx.db.patch(id, card);
      return id;
    }
    const last = await ctx.db.query("cards").withIndex("by_deck", (q) => q.eq("deck", card.deck)).order("desc").first();
    return await ctx.db.insert("cards", { ...card, order: (last?.order ?? -1) + 1 });
  },
});

export const deleteCard = mutation({
  args: { password: v.string(), id: v.id("cards") },
  handler: async (ctx, { password, id }) => {
    guard(password);
    await ctx.db.delete(id);
  },
});

/** Wipe and restore tiles / cards / rules from convex/defaults.ts. */
export const resetDefaults = mutation({
  args: { password: v.string(), what: v.union(v.literal("tiles"), v.literal("cards"), v.literal("rules")) },
  handler: async (ctx, { password, what }) => {
    guard(password);
    for (const doc of await ctx.db.query(what).collect()) await ctx.db.delete(doc._id);
    if (what === "tiles") for (const t of DEFAULT_TILES) await ctx.db.insert("tiles", t);
    if (what === "cards") {
      let i = 0;
      for (const c of DEFAULT_CARDS) await ctx.db.insert("cards", { ...c, order: i++, enabled: true });
    }
    if (what === "rules") await ctx.db.insert("rules", DEFAULT_RULES);
  },
});

/** Danger zone: delete every game so the lobby is empty again. */
export const wipeGames = mutation({
  args: { password: v.string() },
  handler: async (ctx, { password }) => {
    guard(password);
    for (const t of ["events", "properties", "players", "games"] as const) {
      for (const doc of await ctx.db.query(t).collect()) await ctx.db.delete(doc._id);
    }
  },
});

/** Dev helper: give a player a property with houses/landmark (for screenshots and manual testing). */
export const devGrant = mutation({
  args: { password: v.string(), seat: v.number(), tileIndex: v.number(), houses: v.number(), landmark: v.boolean() },
  handler: async (ctx, { password, seat, tileIndex, houses, landmark }) => {
    guard(password);
    const game = await ctx.db.query("games").withIndex("by_status", (q) => q.eq("status", "playing")).order("desc").first();
    if (!game) throw new ConvexError("ไม่มีเกมที่กำลังเล่น");
    const existing = await ctx.db
      .query("properties")
      .withIndex("by_game", (q) => q.eq("gameId", game._id).eq("tileIndex", tileIndex))
      .first();
    if (existing) await ctx.db.patch(existing._id, { ownerSeat: seat, houses, landmark });
    else await ctx.db.insert("properties", { gameId: game._id, tileIndex, ownerSeat: seat, houses, landmark });
  },
});
