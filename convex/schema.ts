import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const tileType = v.union(
  v.literal("start"),
  v.literal("city"),
  v.literal("treasure"),
  v.literal("special_card"),
  v.literal("tax"),
  v.literal("special_item"),
  v.literal("station"),
  v.literal("jail"),
  v.literal("world_tour"),
  v.literal("go_to_jail"),
);

export const groupKey = v.union(
  v.literal("purple"),
  v.literal("blue"),
  v.literal("pink"),
  v.literal("orange"),
  v.literal("red"),
  v.literal("yellow"),
  v.literal("green"),
  v.literal("deepblue"),
);

export const cardEffect = v.object({
  kind: v.union(
    v.literal("money"),
    v.literal("collect_each"),
    v.literal("skip"),
    v.literal("move_to"),
    v.literal("move_by"),
    v.literal("roll_again"),
    v.literal("roll_even_odd"),
    v.literal("roll_threshold"),
    v.literal("nearest"),
    v.literal("go_to_jail"),
  ),
  amount: v.optional(v.number()),
  turns: v.optional(v.number()),
  tileIndex: v.optional(v.number()),
  steps: v.optional(v.number()),
  passStart: v.optional(v.boolean()),
  rentMultiplier: v.optional(v.number()),
  threshold: v.optional(v.number()),
  target: v.optional(v.union(v.literal("special_item"), v.literal("station"), v.literal("own"))),
});

export const tileFields = {
  index: v.number(),
  name: v.string(),
  type: tileType,
  group: v.optional(groupKey),
  price: v.optional(v.number()),
  housePrice: v.optional(v.number()),
  sellBack: v.optional(v.number()),
  rent: v.optional(v.array(v.number())),
  amount: v.optional(v.number()),
  blurb: v.optional(v.string()),
};

export const rulesFields = {
  startingMoney: v.number(),
  passStartBonus: v.number(),
  jailFine: v.number(),
  jailMaxTurns: v.number(),
  maxDoubles: v.number(),
  specialItemRent: v.array(v.number()),
  stationRent: v.array(v.number()),
  requireMonopolyToBuild: v.boolean(),
  monopolyDoublesBareRent: v.boolean(),
  evenBuild: v.boolean(),
  maxHouses: v.number(),
  landmarkCostMultiplier: v.number(),
  houseSellBackRatio: v.number(),
  landSellBackRatio: v.optional(v.number()),
  cardMovesCollectStart: v.boolean(),
};

export const phase = v.union(
  v.literal("roll"), // current player must roll
  v.literal("jail"), // current player is in the tub: roll for doubles or pay
  v.literal("buy"), // landed on an unowned property
  v.literal("card_roll"), // a card asks for a dice roll
  v.literal("world_tour"), // pick one of your own tiles to visit
  v.literal("debt"), // cash < 0, must sell or give up
  v.literal("end"), // may build/sell, then end turn
);

export const pending = v.union(
  v.object({ kind: v.literal("buy"), tileIndex: v.number() }),
  v.object({ kind: v.literal("card_roll"), effect: cardEffect, text: v.string() }),
  v.object({ kind: v.literal("world_tour") }),
  v.object({ kind: v.literal("debt"), amount: v.number(), toSeat: v.optional(v.number()) }),
);

export default defineSchema({
  tiles: defineTable(tileFields).index("by_index", ["index"]),

  cards: defineTable({
    deck: v.union(v.literal("treasure"), v.literal("special")),
    text: v.string(),
    effect: cardEffect,
    order: v.number(),
    enabled: v.boolean(),
  }).index("by_deck", ["deck", "order"]),

  rules: defineTable(rulesFields),

  games: defineTable({
    status: v.union(v.literal("lobby"), v.literal("playing"), v.literal("finished")),
    turn: v.number(),
    phase,
    dice: v.array(v.number()),
    doublesCount: v.number(),
    lastRollDouble: v.boolean(),
    pending: v.optional(pending),
    treasureDeck: v.array(v.id("cards")),
    specialDeck: v.array(v.id("cards")),
    lastCard: v.optional(v.object({ deck: v.string(), text: v.string(), seat: v.number(), at: v.number() })),
    moves: v.array(v.object({ seat: v.number(), from: v.number(), to: v.number(), teleport: v.boolean() })),
    actionAt: v.number(),
    winner: v.optional(v.number()),
    createdAt: v.number(),
    startedAt: v.optional(v.number()),
    finishedAt: v.optional(v.number()),
  }).index("by_status", ["status"]),

  players: defineTable({
    gameId: v.id("games"),
    seat: v.number(),
    name: v.string(),
    variant: v.union(v.literal("blue"), v.literal("pink")),
    token: v.string(),
    cash: v.number(),
    position: v.number(),
    inJail: v.boolean(),
    jailTurns: v.number(),
    skipTurns: v.number(),
    bankrupt: v.boolean(),
    lastSeen: v.number(),
  })
    .index("by_game", ["gameId", "seat"])
    .index("by_token", ["token"]),

  properties: defineTable({
    gameId: v.id("games"),
    tileIndex: v.number(),
    ownerSeat: v.number(),
    houses: v.number(),
    landmark: v.boolean(),
  }).index("by_game", ["gameId", "tileIndex"]),

  events: defineTable({
    gameId: v.id("games"),
    at: v.number(),
    seat: v.optional(v.number()),
    kind: v.string(),
    text: v.string(),
  }).index("by_game", ["gameId", "at"]),
});
