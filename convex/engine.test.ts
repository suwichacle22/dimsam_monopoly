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
      treasureDiscard: [],
      specialDiscard: [],
      moves: [],
      actionAt: 0,
    },
    players: [
      { seat: 0, name: "A", cash: 0, position: 0, inJail: false, jailTurns: 0, jailLimit: 0, skipTurns: 0, bankrupt: false, debt: 0, bankDebt: 0 },
      { seat: 1, name: "B", cash: 0, position: 0, inJail: false, jailTurns: 0, jailLimit: 0, skipTurns: 0, bankrupt: false, debt: 0, bankDebt: 0 },
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

/** If the last landing asked how to pay rent, pay it in cash. */
function settle(s: E.Snapshot) {
  if (s.game.phase === "rent") E.payRent(s, s.game.turn, "cash");
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
    expect(s.game.phase).toBe("rent");
    settle(s);
    expect(s.players[1].cash).toBe(30000 - 40);
    expect(s.players[0].cash).toBe(30000 - 800 + 40);
    expect(s.game.phase).toBe("end");
  });

  test("monopoly doubles rent with houses and a landmark too, and only for the full colour", () => {
    const s = makeSnap();
    s.props[1] = { ownerSeat: 0, houses: 2, landmark: false };
    expect(E.rentFor(s, 1, 7)).toBe(300); // one purple tile: table rent
    s.props[3] = { ownerSeat: 0, houses: 0, landmark: true };
    expect(E.rentFor(s, 1, 7)).toBe(600);
    expect(E.rentFor(s, 3, 7)).toBe(9000);
    s.rules.monopolyDoublesBareRent = false;
    expect(E.rentFor(s, 1, 7)).toBe(300);
  });

  test("monopoly doubles bare-land rent", () => {
    const s = makeSnap([1, 2]);
    s.props[1] = { ownerSeat: 0, houses: 0, landmark: false };
    s.props[3] = { ownerSeat: 0, houses: 0, landmark: false };
    s.game.turn = 1;
    E.roll(s, 1);
    settle(s);
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
    // the "roll again" notice must not look like a dice throw, or the client replays the roll animation
    const last = s.events[s.events.length - 1];
    expect(last.text).toContain("ได้ทอยอีกครั้ง");
    expect(last.kind).toBe("again");
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
  test("landing on the tub tile puts you in it", () => {
    const s = makeSnap([4, 6]); // → tile 10
    E.roll(s, 0);
    expect(s.players[0].position).toBe(10);
    expect(s.players[0].inJail).toBe(true);
    expect(s.game.phase).toBe("end");
    expect(s.game.moves.filter((m) => m.teleport)).toHaveLength(0); // no extra hop, already there
    E.endTurn(s, 0);
    s.game.phase = "end"; s.game.pending = undefined; E.endTurn(s, 1);
    expect(s.game.turn).toBe(0);
    expect(s.game.phase).toBe("jail");
    // a tub landing is a one-turn stay: fail the double once, then walk out free next turn
    s.roll = (() => { const q = [1, 2, 3, 4]; return () => q.shift()!; })();
    E.roll(s, 0);
    expect(s.players[0].inJail).toBe(true);
    E.endTurn(s, 0);
    E.roll(s, 1);
    s.game.phase = "end"; s.game.pending = undefined; s.players[1].skipTurns = 0; E.endTurn(s, 1);
    expect(s.game.turn).toBe(0);
    expect(s.players[0].inJail).toBe(false);
    expect(s.game.phase).toBe("roll");
  });

  test("an arrest (tile 30) is the same one-turn stay as a tub landing", () => {
    const s = makeSnap([2, 4, 1, 2, 3, 4]);
    s.players[0].position = 24;
    E.roll(s, 0); // 24 + 6 = 30 → sent to the tub
    expect(s.players[0].inJail).toBe(true);
    expect(s.players[0].jailLimit).toBe(1);
    E.endTurn(s, 0);
    E.roll(s, 1); s.game.phase = "end"; s.game.pending = undefined; s.players[1].skipTurns = 0; E.endTurn(s, 1);
    expect(s.game.phase).toBe("jail");
    E.roll(s, 0); // 3 + 4, no double → waits this turn out
    E.endTurn(s, 0);
    s.game.phase = "end"; s.game.pending = undefined; s.players[1].skipTurns = 0; E.endTurn(s, 1);
    expect(s.game.turn).toBe(0);
    expect(s.players[0].inJail).toBe(false);
    expect(s.game.phase).toBe("roll");
  });

  test("a jail card and too many doubles also get the one-turn stay", () => {
    const card = makeSnap([1, 1]);
    card.game.treasureDeck = ["jail"];
    card.cards.push({ id: "jail", deck: "treasure", text: "jail", effect: { kind: "go_to_jail" } });
    E.roll(card, 0); // 1 + 1 → tile 2, หีบขนม
    expect(card.players[0].inJail).toBe(true);
    expect(card.players[0].jailLimit).toBe(1);

    const doubles = makeSnap([1, 1]);
    doubles.game.doublesCount = doubles.rules.maxDoubles;
    E.roll(doubles, 0);
    expect(doubles.players[0].inJail).toBe(true);
    expect(doubles.players[0].jailLimit).toBe(1);
  });

  test("with jailMaxTurns 0 an arrest has no free release", () => {
    const s = makeSnap([2, 4]);
    s.rules.jailMaxTurns = 0;
    s.players[0].position = 24;
    E.roll(s, 0);
    expect(s.players[0].inJail).toBe(true);
    expect(s.players[0].jailLimit).toBe(0);
  });

  test("surrender ends the game with the other player as winner", () => {
    const s = makeSnap([1, 2]);
    E.giveUp(s, 0);
    expect(s.game.status).toBe("finished");
    expect(s.game.winner).toBe(1);
    expect(s.events[s.events.length - 1].text).toContain("ยอมแพ้");
  });

  test("with jailOnLanding off the tub tile is just a visit", () => {
    const s = makeSnap([4, 6]);
    s.rules.jailOnLanding = false;
    E.roll(s, 0);
    expect(s.players[0].inJail).toBe(false);
    expect(s.game.phase).toBe("end");
  });

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

  test("with no free release a failed roll keeps you in jail turn after turn", () => {
    const s = jailed([1, 2, 4, 3, 5, 6]);
    E.roll(s, 0);
    expect(s.players[0].inJail).toBe(true);
    expect(s.game.phase).toBe("end");
    E.endTurn(s, 0);
    E.roll(s, 1); // 7 → ถุงของเล่น (card)
    s.game.phase = "end";
    s.game.pending = undefined;
    s.players[1].skipTurns = 0;
    E.endTurn(s, 1);
    expect(s.game.turn).toBe(0);
    expect(s.players[0].inJail).toBe(true);
    expect(s.game.phase).toBe("jail");
    E.roll(s, 0); // 5 + 6, still no double
    expect(s.players[0].inJail).toBe(true);
    expect(s.players[0].position).toBe(10);
  });

  test("with jailMaxTurns 1, failing the roll waits one turn then walks out free", () => {
    const s = jailed([1, 2, 4, 3]);
    s.rules.jailMaxTurns = 1;
    s.players[0].jailLimit = 1; // what sendToJail would have stamped under that rule
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

describe("tax tiles", () => {
  test("landing on a tax tile charges and emits a tax event for the client", () => {
    const s = makeSnap([2, 2]); // → tile 4 ค่าอาบน้ำตัดขน
    E.roll(s, 0);
    expect(s.players[0].cash).toBe(30000 - 1000);
    const ev = s.events.find((e) => e.kind === "tax");
    expect(ev && JSON.parse(ev.text)).toEqual({ amount: 1000, tile: 4 });
  });
});

describe("passing start", () => {
  test("emits a pass_start event carrying the bonus", () => {
    const s = makeSnap([1, 2]);
    s.players[0].position = 38; // 38 + 3 → 1, wrapping past START
    E.roll(s, 0);
    expect(s.players[0].position).toBe(1);
    expect(s.players[0].cash).toBe(30000 + 2000);
    expect(s.events.find((e) => e.kind === "pass_start")?.text).toBe("2000");
  });

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
    settle(s);
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
    expect(s.events.filter((e) => e.kind === "txn").map((e) => JSON.parse(e.text))).toEqual([{ type: "collect", amount: 500, from: 1, to: 0 }]);
  });

  test("a go-to-jail card with a cost charges on the way to the tub", () => {
    const s = withCard({ kind: "go_to_jail", amount: -1500 });
    E.roll(s, 0);
    expect(s.players[0].inJail).toBe(true);
    expect(s.players[0].cash).toBe(30000 - 1500);
    expect(s.events.find((e) => e.kind === "card_money")?.text).toBe("-1500");
  });

  test("a go-to-jail card sends you straight to the tub", () => {
    const s = withCard({ kind: "go_to_jail" });
    E.roll(s, 0); // 1+1 is a double, but jail cancels the bonus roll
    expect(s.players[0].inJail).toBe(true);
    expect(s.players[0].position).toBe(10);
    expect(s.game.phase).toBe("end");
    expect(s.game.lastRollDouble).toBe(false);
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

  test("roll_even_odd: even sends you to the tub", () => {
    const s = withCard({ kind: "roll_even_odd" });
    E.roll(s, 0);
    const dice = [2, 2];
    s.roll = () => dice.shift()!;
    E.roll(s, 0);
    expect(s.players[0].inJail).toBe(true);
    expect(s.players[0].position).toBe(10);
    expect(s.players[0].skipTurns).toBe(0);
    expect(s.game.lastRollDouble).toBe(false);
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

  test("a drawn card leaves the deck for the discard pile", () => {
    const s = makeSnap([1, 1]);
    const first = s.game.treasureDeck[0];
    const n = s.game.treasureDeck.length;
    E.roll(s, 0);
    expect(s.game.treasureDeck).toHaveLength(n - 1);
    expect(s.game.treasureDeck).not.toContain(first);
    expect(s.game.treasureDiscard).toEqual([first]);
  });

  test("an empty deck is reshuffled from the discard pile", () => {
    const s = makeSnap([1, 1], { rand: () => 0.3 });
    s.cards = [
      { id: "x", deck: "treasure", text: "x", effect: { kind: "money", amount: 1 } },
      { id: "y", deck: "treasure", text: "y", effect: { kind: "money", amount: 1 } },
    ];
    s.game.treasureDeck = [];
    s.game.treasureDiscard = ["x", "y"];
    E.roll(s, 0);
    expect(s.game.treasureDeck.length + s.game.treasureDiscard.length).toBe(2);
    expect(s.game.treasureDiscard).toHaveLength(1);
    expect(s.events.some((e) => e.kind === "shuffle")).toBe(true);
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
    settle(s);
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

describe("broke and bankruptcy", () => {
  test("rent you cannot pay puts you in the broke phase until you sell enough", () => {
    const s = makeSnap([1, 2]);
    s.rules.maxDebt = 0;
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
    expect(s.game.phase).toBe("broke");
    expect(s.game.status).toBe("playing");
    E.sellLand(s, 0, 21);
    E.sellLand(s, 0, 24);
    E.sellLand(s, 0, 12);
    E.sellLand(s, 0, 15);
    expect(s.game.phase).toBe("broke");
    E.sellLand(s, 0, 9);
    expect(s.game.phase).toBe("end");
    expect(s.players[0].cash).toBeGreaterThanOrEqual(0);
  });

  test("owing more than everything you own ends the game", () => {
    const s = makeSnap([1, 2]);
    s.rules.maxDebt = 0;
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

describe("tab between players (ติดไว้ก่อน)", () => {
  function landOnRent(cash = 30000) {
    const s = makeSnap([1, 2]); // A → tile 3 owned by B
    s.props[3] = { ownerSeat: 1, houses: 0, landmark: true }; // rent 4500
    s.players[0].cash = cash;
    E.roll(s, 0);
    expect(s.game.phase).toBe("rent");
    expect(s.game.pending).toEqual({ kind: "rent", tileIndex: 3, amount: 4500, toSeat: 1 });
    return s;
  }

  test("pay in cash", () => {
    const s = landOnRent();
    E.payRent(s, 0, "cash");
    expect(s.players[0].cash).toBe(25500);
    expect(s.players[1].cash).toBe(34500);
    expect(s.players[0].debt).toBe(0);
    expect(s.game.phase).toBe("end");
  });

  test("put it on the tab even when you could afford it", () => {
    const s = landOnRent();
    E.payRent(s, 0, "tab");
    expect(s.players[0].cash).toBe(30000);
    expect(s.players[1].cash).toBe(30000);
    expect(s.players[0].debt).toBe(4500);
    expect(s.game.phase).toBe("end");
  });

  test("tab still works when short on cash", () => {
    const s = landOnRent(100);
    E.payRent(s, 0, "tab");
    expect(s.players[0].debt).toBe(4500);
    expect(s.players[0].cash).toBe(100);
  });

  test("paying cash while short with nothing to sell ends the game", () => {
    const s = landOnRent(100);
    E.payRent(s, 0, "cash");
    expect(s.players[0].bankrupt).toBe(true);
    expect(s.game.status).toBe("finished");
    expect(s.game.winner).toBe(1);
  });

  test("paying cash while short but with assets opens the broke phase, and selling can be done first", () => {
    const s = landOnRent(100);
    s.props[37] = { ownerSeat: 0, houses: 4, landmark: false }; // the pricey deep-blue street, fully built
    s.props[39] = { ownerSeat: 0, houses: 4, landmark: false };
    expect(E.liquidationValue(s, 0)).toBeGreaterThan(4500);
    E.sellHouse(s, 0, 37); // selling is allowed while the rent is pending
    expect(s.props[37].houses).toBe(3);
    E.payRent(s, 0, "cash");
    expect(s.players[0].bankrupt).toBe(false);
    expect(s.game.phase).toBe("broke");
    expect(s.players[0].cash).toBeLessThan(0);
  });

  test("the tab has no cap, but going over maxDebt stops the game", () => {
    const s = landOnRent(100);
    s.players[0].debt = 18000;
    E.payRent(s, 0, "tab");
    expect(s.players[0].debt).toBe(22500);
    expect(s.players[0].cash).toBe(100);
    expect(s.game.phase).toBe("over_debt");
    expect(() => E.endTurn(s, 0)).toThrow();
    expect(() => E.roll(s, 0)).toThrow();
  });

  test("over the limit: repaying down to maxDebt lets the game go on", () => {
    const s = landOnRent(5000);
    s.players[0].debt = 18000;
    E.payRent(s, 0, "tab");
    E.payDebt(s, 0, 2000);
    expect(s.game.phase).toBe("over_debt");
    E.payDebt(s, 0, 500);
    expect(s.players[0].debt).toBe(20000);
    expect(s.game.phase).toBe("end");
  });

  test("over the limit: selling land to the bank, then repaying, also works", () => {
    const s = landOnRent(0);
    s.players[0].debt = 18000;
    s.props[37] = { ownerSeat: 0, houses: 0, landmark: false };
    s.props[39] = { ownerSeat: 0, houses: 0, landmark: false };
    E.payRent(s, 0, "tab");
    E.sellLand(s, 0, 37);
    E.sellLand(s, 0, 39);
    expect(s.game.phase).toBe("over_debt"); // selling raises cash; only repaying lowers the debt
    E.payDebt(s, 0);
    expect(s.players[0].debt).toBeLessThanOrEqual(20000);
    expect(s.game.phase).toBe("end");
  });

  test("over the limit: an accepted land offer cancels the debt and lets the game go on", () => {
    const s = landOnRent(0);
    s.players[0].debt = 18000;
    s.props[6] = { ownerSeat: 0, houses: 0, landmark: false };
    E.payRent(s, 0, "tab");
    E.offerSale(s, 0, 6, 3000);
    E.respondOffer(s, 1, true);
    expect(s.players[0].debt).toBe(19500);
    expect(s.props[6].ownerSeat).toBe(1);
    expect(s.game.phase).toBe("end");
  });

  test("when the creditor lands on the debtor's land, rent cancels the debt first", () => {
    const s = makeSnap([1, 2]); // B will land on tile 3
    s.props[3] = { ownerSeat: 0, houses: 0, landmark: true }; // A owns, rent 4500
    s.players[1].debt = 0;
    s.players[0].debt = 3000; // A owes B 3000
    s.game.turn = 1;
    E.roll(s, 1);
    E.payRent(s, 1, "tab");
    expect(s.players[0].debt).toBe(0); // A's debt wiped by 3000 of the rent
    expect(s.players[1].debt).toBe(1500); // remaining 1500 goes on B's tab
    expect(s.players[1].cash).toBe(30000);
  });

  test("repaying the tab moves cash to the creditor", () => {
    const s = makeSnap();
    s.players[0].debt = 5000;
    E.payDebt(s, 0, 2000);
    expect(s.players[0].debt).toBe(3000);
    expect(s.players[0].cash).toBe(28000);
    expect(s.players[1].cash).toBe(32000);
    E.payDebt(s, 0);
    expect(s.players[0].debt).toBe(0);
    expect(s.players[1].cash).toBe(35000);
    expect(() => E.payDebt(s, 0)).toThrow(/ไม่มีหนี้/);
  });

  test("maxDebt 0 charges rent immediately like classic rules", () => {
    const s = makeSnap([1, 2]);
    s.rules.maxDebt = 0;
    s.props[3] = { ownerSeat: 1, houses: 0, landmark: false };
    E.roll(s, 0);
    expect(s.game.phase).toBe("end");
    expect(s.players[0].cash).toBe(30000 - 40);
  });

  test("bank payments (tax) never go on the tab", () => {
    const s = makeSnap([2, 2]); // → tile 4 tax 1000
    s.players[0].cash = 500;
    E.roll(s, 0);
    expect(s.game.phase).toBe("broke");
    expect(s.players[0].debt).toBe(0);
  });

  test("short on a tax, the shortfall can go on the bank debt instead of selling", () => {
    const s = makeSnap([2, 2]); // → tile 4 tax 1000
    s.players[0].cash = 500;
    E.roll(s, 0);
    expect(s.game.pending).toMatchObject({ kind: "broke", bank: true });
    E.borrowBank(s, 0);
    expect(s.players[0].cash).toBe(0);
    expect(s.players[0].bankDebt).toBe(500);
    expect(s.game.phase).toBe("end");
    expect(s.events.filter((e) => e.kind === "txn").map((e) => JSON.parse(e.text))).toEqual([{ type: "borrow", amount: 500 }]);
  });

  test("the bank debt is capped; past the cap you sell, and with nothing to sell you are out", () => {
    const s = makeSnap([2, 2]);
    s.players[0].cash = 500;
    s.players[0].bankDebt = 2800; // room 200
    s.props[6] = { ownerSeat: 0, houses: 0, landmark: false }; // sellBack 500
    E.roll(s, 0);
    E.borrowBank(s, 0);
    expect(s.players[0].bankDebt).toBe(3000);
    expect(s.players[0].cash).toBe(-300);
    expect(s.game.phase).toBe("broke");
    expect(() => E.borrowBank(s, 0)).toThrow(/ครบ/);
    E.sellLand(s, 0, 6);
    expect(s.game.phase).toBe("end");

    const t = makeSnap([2, 2]);
    t.players[0].cash = 500;
    t.players[0].bankDebt = 2800;
    E.roll(t, 0);
    expect(t.players[0].bankrupt).toBe(true);
  });

  test("rent can never go on the bank debt", () => {
    const s = makeSnap([1, 2]);
    s.rules.maxDebt = 0;
    s.players[0].cash = 100;
    s.props[3] = { ownerSeat: 1, houses: 0, landmark: true }; // rent 4500
    s.props[6] = { ownerSeat: 0, houses: 0, landmark: false };
    s.props[8] = { ownerSeat: 0, houses: 0, landmark: false };
    s.props[9] = { ownerSeat: 0, houses: 0, landmark: false };
    s.props[21] = { ownerSeat: 0, houses: 0, landmark: false };
    s.props[24] = { ownerSeat: 0, houses: 0, landmark: false };
    s.props[39] = { ownerSeat: 0, houses: 0, landmark: false };
    E.roll(s, 0);
    expect(s.game.phase).toBe("broke");
    expect(() => E.borrowBank(s, 0)).toThrow(/การ์ดและภาษี/);
  });

  test("the bank debt can be repaid any time, partly or in full", () => {
    const s = makeSnap();
    s.players[0].bankDebt = 2000;
    s.players[0].cash = 5000;
    E.payBankDebt(s, 0, 500);
    expect(s.players[0].bankDebt).toBe(1500);
    E.payBankDebt(s, 0);
    expect(s.players[0].bankDebt).toBe(0);
    expect(s.players[0].cash).toBe(3000);
    expect(() => E.payBankDebt(s, 0)).toThrow(/ไม่มีหนี้/);
  });
});

describe("aim gauge", () => {
  test("an aimed roll hits the target when the accuracy check passes", () => {
    const s = makeSnap([], { rand: () => 0 });
    E.roll(s, 0, 7);
    expect(s.game.dice[0] + s.game.dice[1]).toBe(7);
    expect(s.events.find((e) => e.kind === "roll")?.text ?? "").toContain("ตรงเป้า");
  });

  test("a missed aim falls back to the normal dice", () => {
    const s = makeSnap([2, 3], { rand: () => 0.99 });
    E.roll(s, 0, 12);
    expect(s.game.dice).toEqual([2, 3]);
  });

  test("the gauge can be switched off", () => {
    const s = makeSnap([2, 3], { rand: () => 0 });
    s.rules.gaugeEnabled = false;
    E.roll(s, 0, 12);
    expect(s.game.dice).toEqual([2, 3]);
  });

  test("aiming works in jail too (hunting for a double), but is ignored for card rolls", () => {
    const s = makeSnap([1, 2], { rand: () => 0 }); // rand 0 → the aim always hits
    s.players[0].inJail = true;
    s.game.phase = "jail";
    E.roll(s, 0, 12);
    expect(s.game.dice).toEqual([6, 6]);
    expect(s.players[0].inJail).toBe(false); // the double got them out

    const c = makeSnap([1, 2], { rand: () => 0 });
    c.game.phase = "card_roll";
    c.game.pending = { kind: "card_roll", effect: { kind: "roll_threshold", threshold: 6, amount: 100 }, text: "x" };
    E.roll(c, 0, 8);
    expect(c.game.dice).toEqual([1, 2]);
  });
});

describe("money moves the client animates", () => {
  const txns = (s: E.Snapshot) => s.events.filter((e) => e.kind === "txn").map((e) => JSON.parse(e.text) as E.Txn);

  test("buying with a house, building, selling and the jail fine each record their amount and tile", () => {
    const s = makeSnap([1, 2]);
    E.roll(s, 0);
    E.buy(s, 0, true);
    E.sellHouse(s, 0, 3);
    E.sellLand(s, 0, 3);
    s.game.phase = "jail";
    s.players[0].inJail = true;
    s.players[0].position = 10;
    E.payJail(s, 0);
    expect(txns(s)).toEqual([
      { type: "buy", amount: 800, tile: 3 },
      { type: "build", amount: 500, tile: 3 },
      { type: "sell", amount: 250, tile: 3, what: "house" },
      { type: "sell", amount: 400, tile: 3, what: "land" },
      { type: "fine", amount: 500, tile: 10 },
    ]);
    expect(s.players[0].cash).toBe(30000 - 800 - 500 + 250 + 400 - 500);
  });

  test("repaying the tab records who paid whom", () => {
    const s = makeSnap();
    s.players[0].debt = 3000;
    E.payDebt(s, 0, 2000);
    expect(txns(s)).toEqual([{ type: "repay", amount: 2000, from: 0, to: 1 }]);
  });
});

describe("selling land to each other (ขายที่ดินให้กัน)", () => {
  function setup(debt = 5000) {
    const s = makeSnap([1, 2]);
    s.props[6] = { ownerSeat: 0, houses: 2, landmark: false };
    s.players[0].debt = debt; // A owes B
    return s;
  }

  test("an accepted offer first cancels the seller's tab, then moves the land with its houses", () => {
    const s = setup(5000);
    E.offerSale(s, 0, 6, 1800);
    expect(s.game.offer).toMatchObject({ fromSeat: 0, toSeat: 1, tileIndex: 6, price: 1800 });
    E.respondOffer(s, 1, true);
    expect(s.game.offer).toBeUndefined();
    expect(s.props[6]).toMatchObject({ ownerSeat: 1, houses: 2 });
    expect(s.players[0].debt).toBe(3200);
    expect(s.players[0].cash).toBe(30000);
    expect(s.players[1].cash).toBe(30000);
    expect(JSON.parse(s.events.find((e) => e.kind === "sale")!.text)).toMatchObject({ price: 1800, offset: 1800, cash: 0 });
  });

  test("a price above the debt clears it and pays the rest in cash", () => {
    const s = setup(5000);
    E.offerSale(s, 0, 6, 8000);
    E.respondOffer(s, 1, true);
    expect(s.players[0].debt).toBe(0);
    expect(s.players[0].cash).toBe(33000);
    expect(s.players[1].cash).toBe(27000);
  });

  test("the buyer needs the cash part", () => {
    const s = setup(0);
    s.rules.tradeMode = "always";
    s.players[1].cash = 500;
    E.offerSale(s, 0, 6, 2000);
    expect(() => E.respondOffer(s, 1, true)).toThrow(/เงินสดไม่พอ/);
    expect(s.props[6].ownerSeat).toBe(0);
  });

  test("declining and cancelling clear the offer without changes", () => {
    const s = setup(5000);
    E.offerSale(s, 0, 6, 1800);
    E.respondOffer(s, 1, false);
    expect(s.game.offer).toBeUndefined();
    E.offerSale(s, 0, 6, 1800);
    E.cancelOffer(s, 0);
    expect(s.game.offer).toBeUndefined();
    expect(s.props[6].ownerSeat).toBe(0);
    expect(s.players[0].debt).toBe(5000);
  });

  test("in debt-only mode you cannot offer without a tab; off mode blocks it entirely", () => {
    const s = setup(0);
    s.rules.tradeMode = "debt";
    expect(() => E.offerSale(s, 0, 6, 1000)).toThrow(/ติดหนี้/);
    s.rules.tradeMode = "always";
    E.offerSale(s, 0, 6, 1000);
    E.cancelOffer(s, 0);
    s.rules.tradeMode = "off";
    expect(() => E.offerSale(s, 0, 6, 1000)).toThrow(/ปิด/);
  });

  test("only your own land, only one open offer, and the buyer cannot be the seller", () => {
    const s = setup(5000);
    s.players[1].debt = 1000; // so the ownership check, not the debt check, is what stops B
    expect(() => E.offerSale(s, 1, 6, 1000)).toThrow(/ไม่ใช่ที่ดินของคุณ/);
    E.offerSale(s, 0, 6, 1000);
    expect(() => E.respondOffer(s, 0, true)).toThrow(/ไม่มีข้อเสนอถึงคุณ/);
    expect(() => E.cancelOffer(s, 1)).toThrow();
  });

  test("a second offer is refused until the first is cancelled, so the buyer always accepts what they saw", () => {
    const s = setup(5000);
    s.props[39] = { ownerSeat: 0, houses: 0, landmark: false };
    E.offerSale(s, 0, 6, 1000);
    expect(() => E.offerSale(s, 0, 39, 50000)).toThrow(/ค้างอยู่แล้ว/);
    E.respondOffer(s, 1, true);
    expect(s.props[6].ownerSeat).toBe(1);
    expect(s.props[39].ownerSeat).toBe(0);
  });

  test("a tile with rent pending on it cannot be offered or bought until the rent is settled", () => {
    const s = setup(5000);
    s.game.turn = 1;
    s.game.phase = "rent";
    s.game.pending = { kind: "rent", tileIndex: 6, amount: 900, toSeat: 0 };
    expect(() => E.offerSale(s, 0, 6, 1000)).toThrow(/ค่าเช่าค้าง/);
    s.game.pending = undefined;
    E.offerSale(s, 0, 6, 1000);
    s.game.pending = { kind: "rent", tileIndex: 6, amount: 900, toSeat: 0 };
    expect(() => E.respondOffer(s, 1, true)).toThrow(/ค่าเช่าค้าง/);
  });

  test("a fully debt-offset sale needs no cash, even from a buyer below zero", () => {
    const s = setup(5000);
    s.players[1].cash = -500;
    E.offerSale(s, 0, 6, 1000);
    E.respondOffer(s, 1, true);
    expect(s.props[6].ownerSeat).toBe(1);
    expect(s.players[1].cash).toBe(-500);
    expect(s.players[0].debt).toBe(4000);
  });

  test("selling the land back to the bank voids the pending offer", () => {
    const s = setup(5000);
    s.props[6] = { ownerSeat: 0, houses: 0, landmark: false };
    E.offerSale(s, 0, 6, 1000);
    s.game.turn = 0;
    s.game.phase = "end";
    E.sellLand(s, 0, 6);
    expect(s.game.offer).toBeUndefined();
    expect(() => E.respondOffer(s, 1, true)).toThrow(/ไม่มีข้อเสนอถึงคุณ/);
  });
});
