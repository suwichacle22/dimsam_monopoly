import { describe, expect, test } from "vitest";
import * as E from "./engine";
import { DEFAULT_CARDS, DEFAULT_RULES, DEFAULT_TILES } from "./defaults";

function makeSnap(dice: number[] = [], overrides: Partial<E.Snapshot> = {}): E.Snapshot {
  const queue = [...dice];
  const cards: E.Card[] = DEFAULT_CARDS.map((c, i) => ({ id: `c${i}`, deck: c.deck, text: c.text, effect: c.effect }));
  const s: E.Snapshot = {
    rules: { ...DEFAULT_RULES },
    tiles: DEFAULT_TILES,
    cards,
    game: {
      status: "lobby",
      turn: 0,
      phase: "roll",
      dice: [1, 1],
      doublesCount: 0,
      lastRollDouble: false,
      builtThisTurn: 0,
      treasureDeck: cards.filter((c) => c.deck === "treasure").map((c) => c.id),
      specialDeck: cards.filter((c) => c.deck === "special").map((c) => c.id),
      moves: [],
      actionAt: 0,
    },
    players: [
      { seat: 0, name: "A", cash: 0, position: 0, inJail: false, jailTurns: 0, skipTurns: 0, bankrupt: false },
      { seat: 1, name: "B", cash: 0, position: 0, inJail: false, jailTurns: 0, skipTurns: 0, bankrupt: false },
    ],
    props: {},
    events: [],
    now: 1000,
    roll: () => {
      const n = queue.shift();
      if (n === undefined) throw new Error("dice queue empty");
      return n;
    },
    ...overrides,
  };
  E.startGame(s);
  return s;
}

describe("start", () => {
  test("gives both players the starting money and the first roll", () => {
    const s = makeSnap();
    expect(s.players.map((p) => p.cash)).toEqual([30000, 30000]);
    expect(s.game.status).toBe("playing");
    expect(s.game.turn).toBe(0);
    expect(s.game.phase).toBe("roll");
  });
});

describe("rolling and buying", () => {
  test("lands on an unowned city and can buy it", () => {
    const s = makeSnap([1, 2]); // → tile 3 ผจญภัยยุคหิน (800)
    E.roll(s, 0);
    expect(s.players[0].position).toBe(3);
    expect(s.game.phase).toBe("buy");
    E.buy(s, 0);
    expect(s.players[0].cash).toBe(30000 - 800);
    expect(s.props[3]).toEqual({ ownerSeat: 0, houses: 0, landmark: false });
    expect(s.game.phase).toBe("end");
    E.endTurn(s, 0);
    expect(s.game.turn).toBe(1);
  });

  test("declining keeps the tile unowned", () => {
    const s = makeSnap([1, 2]);
    E.roll(s, 0);
    E.skipBuy(s, 0);
    expect(s.props[3]).toBeUndefined();
    expect(s.game.phase).toBe("end");
  });

  test("cannot act out of turn", () => {
    const s = makeSnap([1, 2]);
    expect(() => E.roll(s, 1)).toThrow(E.GameError);
  });
});

describe("rent", () => {
  test("pays base rent to the owner", () => {
    const s = makeSnap([1, 2, 1, 2]);
    E.roll(s, 0);
    E.buy(s, 0);
    E.endTurn(s, 0);
    E.roll(s, 1); // B lands on tile 3 too
    expect(s.players[1].cash).toBe(30000 - 40);
    expect(s.players[0].cash).toBe(30000 - 800 + 40);
    expect(s.game.phase).toBe("end");
  });

  test("monopoly doubles bare-land rent", () => {
    const s = makeSnap([1, 2]);
    s.props[1] = { ownerSeat: 0, houses: 0, landmark: false };
    s.props[3] = { ownerSeat: 0, houses: 0, landmark: false };
    s.game.turn = 1;
    E.roll(s, 1);
    expect(s.players[1].cash).toBe(30000 - 80);
  });

  test("houses and landmark use the rent table", () => {
    const s = makeSnap();
    s.props[3] = { ownerSeat: 0, houses: 2, landmark: false };
    expect(E.rentFor(s, 3, 7)).toBe(600);
    s.props[3] = { ownerSeat: 0, houses: 0, landmark: true };
    expect(E.rentFor(s, 3, 7)).toBe(4500);
  });

  test("special items scale with how many the owner holds", () => {
    const s = makeSnap();
    s.props[5] = { ownerSeat: 0, houses: 0, landmark: false };
    expect(E.rentFor(s, 5, 7)).toBe(250);
    s.props[15] = { ownerSeat: 0, houses: 0, landmark: false };
    s.props[25] = { ownerSeat: 0, houses: 0, landmark: false };
    expect(E.rentFor(s, 5, 7)).toBe(1000);
  });

  test("stations multiply the dice", () => {
    const s = makeSnap();
    s.props[12] = { ownerSeat: 0, houses: 0, landmark: false };
    expect(E.rentFor(s, 12, 7)).toBe(350);
    s.props[28] = { ownerSeat: 0, houses: 0, landmark: false };
    expect(E.rentFor(s, 12, 7)).toBe(700);
  });
});

describe("doubles", () => {
  test("a double grants another roll after the turn is ended", () => {
    const s = makeSnap([2, 2]); // → tile 4 tax
    E.roll(s, 0);
    expect(s.players[0].cash).toBe(30000 - 1000);
    expect(s.game.phase).toBe("end");
    E.endTurn(s, 0);
    expect(s.game.turn).toBe(0);
    expect(s.game.phase).toBe("roll");
  });

  test("third double in a row sends you to the bath tub", () => {
    const s = makeSnap([1, 1, 1, 1, 1, 1]);
    E.roll(s, 0); // tile 2 treasure → draws a card
    s.game.phase = "end";
    s.game.pending = undefined;
    E.endTurn(s, 0);
    E.roll(s, 0);
    s.game.phase = "end";
    s.game.pending = undefined;
    E.endTurn(s, 0);
    E.roll(s, 0);
    expect(s.players[0].inJail).toBe(true);
    expect(s.players[0].position).toBe(10);
    expect(s.game.phase).toBe("end");
    E.endTurn(s, 0);
    expect(s.game.turn).toBe(1);
  });

  test("maxDoubles is configurable", () => {
    const s = makeSnap([3, 3, 3, 3]);
    s.rules.maxDoubles = 1;
    E.roll(s, 0); // 6 → คาวบอย buy
    E.skipBuy(s, 0);
    E.endTurn(s, 0);
    E.roll(s, 0);
    expect(s.players[0].inJail).toBe(true);
  });
});

describe("jail (bath tub)", () => {
  function jailed(dice: number[]) {
    const s = makeSnap(dice);
    s.players[0].inJail = true;
    s.players[0].position = 10;
    s.game.phase = "jail";
    return s;
  }

  test("paying the fine frees you and you roll normally", () => {
    const s = jailed([1, 2]);
    E.payJail(s, 0);
    expect(s.players[0].cash).toBe(30000 - 500);
    expect(s.players[0].inJail).toBe(false);
    expect(s.game.phase).toBe("roll");
    E.roll(s, 0);
    expect(s.players[0].position).toBe(13);
  });

  test("rolling a double escapes and moves, without a bonus roll", () => {
    const s = jailed([2, 2]);
    E.roll(s, 0);
    expect(s.players[0].inJail).toBe(false);
    expect(s.players[0].position).toBe(14);
    expect(s.game.lastRollDouble).toBe(false);
  });

  test("failing the roll waits one turn then walks out free", () => {
    const s = jailed([1, 2, 4, 3]);
    E.roll(s, 0);
    expect(s.players[0].inJail).toBe(true);
    expect(s.game.phase).toBe("end");
    E.endTurn(s, 0);
    // B's turn
    expect(s.game.turn).toBe(1);
    E.roll(s, 1); // 7 → ถุงของเล่น (card)
    s.game.phase = "end";
    s.game.pending = undefined;
    s.players[1].skipTurns = 0;
    E.endTurn(s, 1);
    expect(s.game.turn).toBe(0);
    expect(s.players[0].inJail).toBe(false);
    expect(s.game.phase).toBe("roll");
  });
});

describe("passing start", () => {
  test("collects the bonus when wrapping around", () => {
    const s = makeSnap([6, 6]);
    s.players[0].position = 38;
    s.game.doublesCount = 0;
    E.roll(s, 0);
    expect(s.players[0].position).toBe(10);
    expect(s.players[0].cash).toBe(30000 + 2000);
  });
});

describe("cards", () => {
  function withCard(effect: E.Card["effect"], text = "x") {
    const s = makeSnap([1, 1]); // → tile 2 treasure
    s.cards = [{ id: "only", deck: "treasure", text, effect }];
    s.game.treasureDeck = ["only"];
    return s;
  }

  test("money card pays out", () => {
    const s = withCard({ kind: "money", amount: 2500 });
    E.roll(s, 0);
    expect(s.players[0].cash).toBe(32500);
    expect(s.game.lastCard?.text).toBe("x");
  });

  test("skip card rests the player and the turn is skipped", () => {
    const s = withCard({ kind: "skip", turns: 1, amount: -1500 });
    E.roll(s, 0);
    expect(s.players[0].cash).toBe(28500);
    expect(s.players[0].skipTurns).toBe(1);
    s.game.lastRollDouble = false;
    E.endTurn(s, 0);
    expect(s.game.turn).toBe(1);
    s.game.phase = "end";
    E.endTurn(s, 1);
    // A's turn is skipped, back to B
    expect(s.game.turn).toBe(1);
    expect(s.players[0].skipTurns).toBe(0);
  });

  test("move_to the future world with double rent", () => {
    const s = withCard({ kind: "move_to", tileIndex: 39, passStart: true, rentMultiplier: 2 });
    s.props[39] = { ownerSeat: 1, houses: 0, landmark: false };
    E.roll(s, 0);
    expect(s.players[0].position).toBe(39);
    expect(s.players[0].cash).toBe(30000 - 1000);
  });

  test("move_to start collects the bonus", () => {
    const s = withCard({ kind: "move_to", tileIndex: 0, passStart: true });
    E.roll(s, 0);
    expect(s.players[0].position).toBe(0);
    expect(s.players[0].cash).toBe(32000);
  });

  test("move_by backwards does not collect", () => {
    const s = withCard({ kind: "move_by", steps: -3 });
    E.roll(s, 0);
    expect(s.players[0].position).toBe(39);
    expect(s.players[0].cash).toBe(30000);
    expect(s.game.phase).toBe("buy");
  });

  test("collect_each takes from the other player", () => {
    const s = withCard({ kind: "collect_each", amount: 500 });
    E.roll(s, 0);
    expect(s.players[0].cash).toBe(30500);
    expect(s.players[1].cash).toBe(29500);
  });

  test("roll_threshold asks for a roll and pays by result", () => {
    const s = withCard({ kind: "roll_threshold", threshold: 6, amount: 2000 });
    E.roll(s, 0);
    expect(s.game.phase).toBe("card_roll");
    s.roll = () => 1;
    E.roll(s, 0);
    expect(s.players[0].cash).toBe(28000);
    expect(s.game.phase).toBe("end");
  });

  test("roll_even_odd: odd walks to start", () => {
    const s = withCard({ kind: "roll_even_odd" });
    E.roll(s, 0);
    const dice = [2, 1];
    s.roll = () => dice.shift()!;
    E.roll(s, 0);
    expect(s.players[0].position).toBe(0);
    expect(s.players[0].cash).toBe(32000);
  });

  test("nearest special item moves forward to tile 5", () => {
    const s = withCard({ kind: "nearest", target: "special_item" });
    E.roll(s, 0);
    expect(s.players[0].position).toBe(5);
    expect(s.game.phase).toBe("buy");
  });

  test("nearest own with nothing owned stays put", () => {
    const s = withCard({ kind: "nearest", target: "own" });
    E.roll(s, 0);
    expect(s.players[0].position).toBe(2);
    expect(s.game.phase).toBe("end");
  });

  test("roll_again gives an immediate roll", () => {
    const s = withCard({ kind: "roll_again" });
    E.roll(s, 0);
    expect(s.game.phase).toBe("roll");
  });

  test("a card move records both the walk and the teleport", () => {
    const s = withCard({ kind: "move_to", tileIndex: 39, passStart: true });
    E.roll(s, 0);
    expect(s.game.moves).toEqual([
      { seat: 0, from: 0, to: 2, teleport: false },
      { seat: 0, from: 2, to: 39, teleport: true },
    ]);
  });

  test("decks rotate: the drawn card goes to the bottom", () => {
    const s = makeSnap([1, 1]);
    const first = s.game.treasureDeck[0];
    E.roll(s, 0);
    expect(s.game.treasureDeck[s.game.treasureDeck.length - 1]).toBe(first);
  });
});

describe("building", () => {
  /** classic rules: build anywhere, any amount, needs the colour set */
  function classic(s: E.Snapshot) {
    s.rules.requireMonopolyToBuild = true;
    s.rules.buildOnlyOnLandedTile = false;
    s.rules.maxHousesPerTurn = 0;
  }

  test("default house rule: buy land plus one house when you land on it", () => {
    const s = makeSnap([1, 2]); // → tile 3 (800, house 500)
    E.roll(s, 0);
    E.buy(s, 0, true);
    expect(s.props[3]).toEqual({ ownerSeat: 0, houses: 1, landmark: false });
    expect(s.players[0].cash).toBe(30000 - 800 - 500);
    expect(() => E.build(s, 0, 3)).toThrow(/ตานี้สร้างได้ 1 หลัง/);
  });

  test("default house rule: one house per landing, only where you stand", () => {
    const s = makeSnap([1, 2, 1, 2, 3, 4]);
    s.props[3] = { ownerSeat: 0, houses: 0, landmark: false };
    s.props[9] = { ownerSeat: 0, houses: 0, landmark: false };
    E.roll(s, 0); // lands on own tile 3
    expect(() => E.build(s, 0, 9)).toThrow(/ช่องที่ยืนอยู่/);
    E.build(s, 0, 3);
    expect(s.props[3].houses).toBe(1);
    expect(() => E.build(s, 0, 3)).toThrow(/ตานี้สร้างได้/);
    E.endTurn(s, 0);
    E.roll(s, 1); // B lands on A's tile 3 and pays rent
    E.endTurn(s, 1);
    E.roll(s, 0); // 7 → tile 10, not own land
    expect(() => E.build(s, 0, 3)).toThrow(/ช่องที่ยืนอยู่/);
  });

  test("requires the full colour group, then builds up to a landmark", () => {
    const s = makeSnap();
    classic(s);
    s.props[1] = { ownerSeat: 0, houses: 0, landmark: false };
    expect(() => E.build(s, 0, 1)).toThrow(/ครบทั้งสี/);
    s.props[3] = { ownerSeat: 0, houses: 0, landmark: false };
    for (let i = 0; i < 4; i++) E.build(s, 0, 1);
    expect(s.props[1].houses).toBe(4);
    E.build(s, 0, 1);
    expect(s.props[1]).toEqual({ ownerSeat: 0, houses: 0, landmark: true });
    expect(s.players[0].cash).toBe(30000 - 5 * 500);
    expect(() => E.build(s, 0, 1)).toThrow(/เต็ม/);
  });

  test("rule switch requires a monopoly even with the landed-tile rule", () => {
    const s = makeSnap();
    s.rules.requireMonopolyToBuild = true;
    s.players[0].position = 1;
    s.props[1] = { ownerSeat: 0, houses: 0, landmark: false };
    expect(() => E.build(s, 0, 1)).toThrow(/ครบทั้งสี/);
    s.props[3] = { ownerSeat: 0, houses: 0, landmark: false };
    E.build(s, 0, 1);
    expect(s.props[1].houses).toBe(1);
  });

  test("land sells back at the rule ratio of its buy price, unless the tile overrides it", () => {
    const s = makeSnap();
    s.props[1] = { ownerSeat: 0, houses: 0, landmark: false }; // price 800
    s.rules.landSellBackRatio = 0.25;
    E.sellLand(s, 0, 1);
    expect(s.players[0].cash).toBe(30200);
    s.tiles = s.tiles.map((t) => (t.index === 3 ? { ...t, sellBack: 777 } : t));
    s.props[3] = { ownerSeat: 0, houses: 0, landmark: false };
    E.sellLand(s, 0, 3);
    expect(s.players[0].cash).toBe(30977);
  });

  test("asset and liquidation values count land and buildings", () => {
    const s = makeSnap();
    s.props[1] = { ownerSeat: 0, houses: 2, landmark: false }; // 800 + 2×500
    s.props[5] = { ownerSeat: 0, houses: 0, landmark: false }; // 2000
    expect(E.assetValue(s, 0)).toBe(3800);
    expect(E.liquidationValue(s, 0)).toBe(1900);
  });

  test("selling houses and land returns money", () => {
    const s = makeSnap();
    s.props[1] = { ownerSeat: 0, houses: 2, landmark: false };
    E.sellHouse(s, 0, 1);
    expect(s.players[0].cash).toBe(30250);
    expect(() => E.sellLand(s, 0, 1)).toThrow(/ขายบ้านออกก่อน/);
    E.sellHouse(s, 0, 1);
    E.sellLand(s, 0, 1);
    expect(s.props[1]).toBeUndefined();
    expect(s.players[0].cash).toBe(30500 + 400);
  });
});

describe("debt and bankruptcy", () => {
  test("rent you cannot pay puts you in debt until you sell enough", () => {
    const s = makeSnap([1, 2]);
    s.players[0].cash = 100;
    s.props[3] = { ownerSeat: 1, houses: 0, landmark: true }; // rent 4500
    s.props[6] = { ownerSeat: 0, houses: 0, landmark: false }; // sellBack 500
    s.props[8] = { ownerSeat: 0, houses: 0, landmark: false };
    s.props[9] = { ownerSeat: 0, houses: 0, landmark: false };
    s.props[12] = { ownerSeat: 0, houses: 0, landmark: false };
    s.props[15] = { ownerSeat: 0, houses: 0, landmark: false };
    s.props[21] = { ownerSeat: 0, houses: 0, landmark: false }; // 1100
    s.props[24] = { ownerSeat: 0, houses: 0, landmark: false }; // 1200
    E.roll(s, 0);
    expect(s.game.phase).toBe("debt");
    expect(s.game.status).toBe("playing");
    E.sellLand(s, 0, 21);
    E.sellLand(s, 0, 24);
    E.sellLand(s, 0, 12);
    E.sellLand(s, 0, 15);
    expect(s.game.phase).toBe("debt");
    E.sellLand(s, 0, 9);
    expect(s.game.phase).toBe("end");
    expect(s.players[0].cash).toBeGreaterThanOrEqual(0);
  });

  test("owing more than everything you own ends the game", () => {
    const s = makeSnap([1, 2]);
    s.players[0].cash = 100;
    s.props[3] = { ownerSeat: 1, houses: 0, landmark: true };
    E.roll(s, 0);
    expect(s.game.status).toBe("finished");
    expect(s.game.winner).toBe(1);
    expect(s.players[0].bankrupt).toBe(true);
  });
});

describe("world tour (ไปเดินเล่น)", () => {
  test("lets you jump to your own land, collecting the start bonus if you pass it", () => {
    const s = makeSnap([4, 6]);
    s.players[0].position = 10;
    s.props[3] = { ownerSeat: 0, houses: 0, landmark: false };
    E.roll(s, 0);
    expect(s.players[0].position).toBe(20);
    expect(s.game.phase).toBe("world_tour");
    E.worldTour(s, 0, 3);
    expect(s.players[0].position).toBe(3);
    expect(s.players[0].cash).toBe(32000);
    expect(s.game.phase).toBe("end");
  });

  test("without land it is just a rest stop", () => {
    const s = makeSnap([4, 6]);
    s.players[0].position = 10;
    E.roll(s, 0);
    expect(s.game.phase).toBe("end");
  });
});
