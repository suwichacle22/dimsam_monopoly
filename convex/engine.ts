// Pure game engine for Dimsam Monopoly. No database access: it takes a
// snapshot of the game, applies one player action and returns the changed
// snapshot plus log events. Convex mutations (game.ts) load the snapshot,
// call into here and write the result back. Being pure makes every rule
// unit-testable with a fixed dice roller.

import type { CardEffect, Rules, TileType, GroupKey } from "./defaults";

export type Tile = {
  index: number;
  name: string;
  type: TileType;
  group?: GroupKey;
  price?: number;
  housePrice?: number;
  sellBack?: number;
  rent?: number[];
  amount?: number;
  blurb?: string;
};

export type Card = { id: string; deck: "treasure" | "special"; text: string; effect: CardEffect };

/** over_debt: the rent tab passed rules.maxDebt; play waits until the debtor gets back under it or gives up
 *  order_roll: before the first turn each player rolls once, the higher total plays first */
export type Phase = "roll" | "jail" | "buy" | "rent" | "card_roll" | "world_tour" | "broke" | "over_debt" | "order_roll" | "end";

export type Pending =
  | { kind: "buy"; tileIndex: number }
  | { kind: "card_roll"; effect: CardEffect; text: string }
  | { kind: "rent"; tileIndex: number; amount: number; toSeat: number }
  | { kind: "world_tour" }
  /** each seat's dice total so far (0 = not rolled yet) */
  | { kind: "order_roll"; rolls: number[] }
  /** bank: the shortfall is owed to the bank (card, tax), so it may go on the bank debt */
  | { kind: "broke"; amount: number; toSeat?: number; bank?: boolean };

export type GameState = {
  status: "lobby" | "playing" | "finished";
  turn: number;
  phase: Phase;
  dice: number[];
  doublesCount: number;
  lastRollDouble: boolean;
  /** houses bought since the last landing (for maxHousesPerTurn) */
  builtThisTurn: number;
  pending?: Pending;
  treasureDeck: string[];
  specialDeck: string[];
  treasureDiscard: string[];
  specialDiscard: string[];
  lastCard?: { deck: string; text: string; seat: number; at: number };
  /** every position change made by the last action, in order (for animation) */
  moves: { seat: number; from: number; to: number; teleport: boolean }[];
  actionAt: number;
  winner?: number;
  /** one open "sell you my land" offer between the two players */
  offer?: Offer;
};

export type Offer = { fromSeat: number; toSeat: number; tileIndex: number; price: number; at: number };

export type PlayerState = {
  seat: number;
  name: string;
  cash: number;
  position: number;
  inJail: boolean;
  jailTurns: number;
  /** failed jail turns after which this stay ends for free (0 = only a double or the fine) */
  jailLimit: number;
  skipTurns: number;
  bankrupt: boolean;
  /** rent owed to the other player */
  debt: number;
  /** card and tax payments owed to the bank (ติดหนี้ธนาคาร) */
  bankDebt: number;
};

export type Prop = { ownerSeat: number; houses: number; landmark: boolean };

export type Snapshot = {
  rules: Rules;
  tiles: Tile[];
  cards: Card[];
  game: GameState;
  players: PlayerState[];
  props: Record<number, Prop>;
  events: { seat?: number; kind: string; text: string }[];
  now: number;
  roll: () => number; // returns 1..6
  /** uniform 0..1, used for the aim gauge; defaults to Math.random */
  rand?: () => number;
};

export class GameError extends Error {}

const fmt = (n: number) => n.toLocaleString("en-US");

function log(s: Snapshot, kind: string, text: string, seat?: number) {
  s.events.push({ seat, kind, text });
}

/** A money move the client animates: hidden from the log, carries what the log text only spells out. */
export type Txn =
  | { type: "buy"; amount: number; tile: number }
  | { type: "build"; amount: number; tile: number }
  | { type: "fine"; amount: number; tile: number }
  | { type: "sell"; amount: number; tile: number; what: "house" | "landmark" | "land" }
  | { type: "repay"; amount: number; from: number; to: number }
  | { type: "borrow"; amount: number }
  | { type: "bank_repay"; amount: number }
  | { type: "collect"; amount: number; from: number; to: number };

function txn(s: Snapshot, seat: number, t: Txn) {
  s.events.push({ seat, kind: "txn", text: JSON.stringify(t) });
}

export function tileAt(s: Snapshot, index: number): Tile {
  const t = s.tiles.find((x) => x.index === index);
  if (!t) throw new GameError(`ไม่พบช่องที่ ${index}`);
  return t;
}

export function current(s: Snapshot): PlayerState {
  return s.players[s.game.turn];
}

function begin(s: Snapshot) {
  s.game.moves = [];
  s.game.actionAt = s.now;
}

function requireTurn(s: Snapshot, seat: number, ...phases: Phase[]) {
  if (s.game.status !== "playing") throw new GameError("เกมยังไม่เริ่ม");
  begin(s);
  if (s.game.turn !== seat) throw new GameError("ยังไม่ถึงตาคุณ");
  if (phases.length && !phases.includes(s.game.phase)) throw new GameError("ทำแบบนี้ตอนนี้ไม่ได้");
}

// ── ownership helpers ────────────────────────────────────────────────────

export function ownedBy(s: Snapshot, seat: number): number[] {
  return Object.entries(s.props)
    .filter(([, p]) => p.ownerSeat === seat)
    .map(([k]) => Number(k))
    .sort((a, b) => a - b);
}

export function groupTiles(s: Snapshot, group: GroupKey): Tile[] {
  return s.tiles.filter((t) => t.type === "city" && t.group === group);
}

export function hasMonopoly(s: Snapshot, seat: number, group: GroupKey): boolean {
  const g = groupTiles(s, group);
  return g.length > 0 && g.every((t) => s.props[t.index]?.ownerSeat === seat);
}

function countType(s: Snapshot, seat: number, type: TileType): number {
  return ownedBy(s, seat).filter((i) => tileAt(s, i).type === type).length;
}

export function rentFor(s: Snapshot, tileIndex: number, diceSum: number): number {
  const tile = tileAt(s, tileIndex);
  const prop = s.props[tileIndex];
  if (!prop) return 0;
  const r = s.rules;
  if (tile.type === "city") {
    const rent = tile.rent ?? [0, 0, 0, 0, 0, 0];
    const base = (prop.landmark ? rent[5] : prop.houses > 0 ? rent[Math.min(prop.houses, 4)] : rent[0]) ?? 0;
    return r.monopolyDoublesBareRent && tile.group && hasMonopoly(s, prop.ownerSeat, tile.group) ? base * 2 : base;
  }
  if (tile.type === "special_item") {
    const n = countType(s, prop.ownerSeat, "special_item");
    return r.specialItemRent[Math.min(n, r.specialItemRent.length) - 1] ?? 0;
  }
  if (tile.type === "station") {
    const n = countType(s, prop.ownerSeat, "station");
    return diceSum * (r.stationRent[Math.min(n, r.stationRent.length) - 1] ?? 0);
  }
  return 0;
}

/** What the bank pays for the bare land: the tile override, else price × landSellBackRatio. */
export function landSellValue(rules: Rules, tile: Tile): number {
  return tile.sellBack ?? Math.floor((tile.price ?? 0) * rules.landSellBackRatio);
}

/** What the bank pays per house / for a landmark. */
export function houseSellValue(rules: Rules, tile: Tile, landmark: boolean): number {
  return Math.floor((tile.housePrice ?? 0) * (landmark ? rules.landmarkCostMultiplier : 1) * rules.houseSellBackRatio);
}

/** Everything a player could raise by selling houses and land. */
export function liquidationValue(s: Snapshot, seat: number): number {
  let total = 0;
  for (const i of ownedBy(s, seat)) {
    const t = tileAt(s, i);
    const p = s.props[i];
    total += landSellValue(s.rules, t);
    total += p.houses * houseSellValue(s.rules, t, false);
    if (p.landmark) total += s.rules.maxHouses * houseSellValue(s.rules, t, false) + houseSellValue(s.rules, t, true);
  }
  return total;
}

/** What a player has paid for land and buildings (purchase value). */
export function assetValue(s: Snapshot, seat: number): number {
  let total = 0;
  for (const i of ownedBy(s, seat)) {
    const t = tileAt(s, i);
    const p = s.props[i];
    total += t.price ?? 0;
    total += p.houses * (t.housePrice ?? 0);
    if (p.landmark) total += s.rules.maxHouses * (t.housePrice ?? 0) + Math.round((t.housePrice ?? 0) * s.rules.landmarkCostMultiplier);
  }
  return total;
}

// ── money ────────────────────────────────────────────────────────────────

function gain(s: Snapshot, seat: number, amount: number, why: string) {
  const p = s.players[seat];
  p.cash += amount;
  log(s, "money", `${p.name} ได้รับ ${fmt(amount)} บาท (${why})`, seat);
}

/** Charges a player. Returns true if they could pay; otherwise puts the game in the debt phase. */
function charge(s: Snapshot, seat: number, amount: number, why: string, toSeat?: number): boolean {
  const p = s.players[seat];
  p.cash -= amount;
  if (toSeat !== undefined) s.players[toSeat].cash += amount;
  log(s, "money", `${p.name} จ่าย ${fmt(amount)} บาท (${why})`, seat);
  if (p.cash < 0) {
    const bank = toSeat === undefined;
    s.game.phase = "broke";
    s.game.pending = { kind: "broke", amount: -p.cash, toSeat, ...(bank ? { bank } : {}) };
    log(s, "broke", `${p.name} เงินไม่พอ ต้องขายทรัพย์สิน${bank && bankRoom(s, seat) > 0 ? "หรือติดหนี้ธนาคาร" : ""} ${fmt(-p.cash)} บาท`, seat);
    if (p.cash + liquidationValue(s, seat) + (bank ? bankRoom(s, seat) : 0) < 0) {
      bankrupt(s, seat);
    }
    return false;
  }
  return true;
}

/** How much more a player may owe the bank. */
export function bankRoom(s: Snapshot, seat: number): number {
  return Math.max(0, s.rules.maxBankDebt - s.players[seat].bankDebt);
}

function bankrupt(s: Snapshot, seat: number, why = "ล้มละลาย!") {
  const p = s.players[seat];
  p.bankrupt = true;
  s.game.offer = undefined;
  const winner = s.players.find((x) => !x.bankrupt);
  s.game.status = "finished";
  s.game.winner = winner?.seat;
  s.game.pending = undefined;
  log(s, "finish", `${p.name} ${why} ${winner ? `${winner.name} ชนะ 🎉` : ""}`, seat);
}

// ── movement ─────────────────────────────────────────────────────────────

function passStart(s: Snapshot, seat: number) {
  gain(s, seat, s.rules.passStartBonus, "ผ่านบ้านติ่มซำ");
  s.events.push({ seat, kind: "pass_start", text: String(s.rules.passStartBonus) });
}

function setPosition(s: Snapshot, seat: number, to: number, teleport: boolean) {
  const p = s.players[seat];
  s.game.moves.push({ seat, from: p.position, to, teleport });
  p.position = to;
}

function moveBy(s: Snapshot, seat: number, steps: number, collectStart = true) {
  const p = s.players[seat];
  const n = s.tiles.length;
  const to = (((p.position + steps) % n) + n) % n;
  const wrapped = steps > 0 && to < p.position;
  setPosition(s, seat, to, false);
  if (wrapped && collectStart) passStart(s, seat);
}

function moveTo(s: Snapshot, seat: number, to: number, collectStart: boolean) {
  const p = s.players[seat];
  const passes = to <= p.position; // going "forward" around the board past START
  setPosition(s, seat, to, true);
  if (passes && collectStart) passStart(s, seat);
}

function sendToJail(s: Snapshot, seat: number, why: string, limit = s.rules.jailMaxTurns) {
  const p = s.players[seat];
  p.jailLimit = limit;
  const jail = s.tiles.find((t) => t.type === "jail");
  const jailIndex = jail?.index ?? 10;
  if (p.position !== jailIndex) setPosition(s, seat, jailIndex, true); // landing on the tub itself: no extra hop
  p.inJail = true;
  p.jailTurns = 0;
  s.game.doublesCount = 0;
  s.game.lastRollDouble = false;
  s.game.pending = undefined;
  s.game.phase = "end";
  log(s, "jail", `${p.name} โดนจับไปอาบน้ำ! (${why})`, seat);
}

// ── landing ──────────────────────────────────────────────────────────────

function land(s: Snapshot, seat: number, opts: { rentMultiplier?: number; diceSum?: number } = {}) {
  const p = s.players[seat];
  const tile = tileAt(s, p.position);
  const g = s.game;
  g.pending = undefined;
  g.phase = "end";
  g.builtThisTurn = 0;
  log(s, "land", `${p.name} มาถึง ${tile.name}`, seat);

  switch (tile.type) {
    case "city":
    case "special_item":
    case "station": {
      const prop = s.props[tile.index];
      if (!prop) {
        if ((tile.price ?? 0) > 0) {
          g.phase = "buy";
          g.pending = { kind: "buy", tileIndex: tile.index };
        }
      } else if (prop.ownerSeat !== seat) {
        const base = rentFor(s, tile.index, opts.diceSum ?? g.dice[0] + g.dice[1]);
        const rent = base * (opts.rentMultiplier ?? 1);
        if (rent > 0) {
          if (s.rules.maxDebt > 0) {
            g.phase = "rent";
            g.pending = { kind: "rent", tileIndex: tile.index, amount: rent, toSeat: prop.ownerSeat };
            log(s, "rent_due", `${p.name} ต้องจ่ายค่าเช่า ${tile.name} ${fmt(rent)} บาท ให้ ${s.players[prop.ownerSeat].name}`, seat);
          } else {
            settleRent(s, seat, tile.index, rent, prop.ownerSeat, "cash");
          }
        }
      }
      return;
    }
    case "jail":
      // the physical board's rule: being on the tub means you are in it (toggle: jailOnLanding)
      if (s.rules.jailOnLanding) sendToJail(s, seat, "ตกช่องอ่างอาบน้ำ", s.rules.jailOnLandingTurns);
      return;
    case "tax":
      s.events.push({ seat, kind: "tax", text: JSON.stringify({ amount: tile.amount ?? 0, tile: tile.index }) });
      charge(s, seat, tile.amount ?? 0, tile.name);
      return;
    case "treasure":
      drawCard(s, seat, "treasure");
      return;
    case "special_card":
      drawCard(s, seat, "special");
      return;
    case "go_to_jail":
      sendToJail(s, seat, "ตกช่องโดนจับไปอาบน้ำ");
      return;
    case "world_tour":
      if (ownedBy(s, seat).length > 0) {
        g.phase = "world_tour";
        g.pending = { kind: "world_tour" };
      }
      return;
    default:
      return; // start, jail (just visiting)
  }
}

// ── cards ────────────────────────────────────────────────────────────────

function shuffleWith<T>(arr: T[], rand: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function drawCard(s: Snapshot, seat: number, deck: "treasure" | "special") {
  const ids = deck === "treasure" ? s.game.treasureDeck : s.game.specialDeck;
  const discard = deck === "treasure" ? s.game.treasureDiscard : s.game.specialDiscard;
  const label = deck === "treasure" ? "หีบขนม" : "ถุงของเล่น";
  if (ids.length === 0) {
    if (discard.length === 0) return;
    ids.push(...shuffleWith(discard, s.rand ?? Math.random));
    discard.length = 0;
    log(s, "shuffle", `การ์ด${label}หมดกอง สับใหม่ทั้ง ${ids.length} ใบ`, seat);
  }
  const id = ids.shift()!;
  discard.push(id);
  const card = s.cards.find((c) => c.id === id);
  if (!card) return;
  s.game.lastCard = { deck, text: card.text, seat, at: s.now };
  log(s, "card", `${s.players[seat].name} จั่วการ์ด: ${card.text}`, seat);
  applyEffect(s, seat, card.effect, card.text);
}

function nearestIndex(s: Snapshot, from: number, pick: (t: Tile) => boolean): number | undefined {
  const n = s.tiles.length;
  for (let d = 1; d <= n; d++) {
    const i = (from + d) % n;
    if (pick(tileAt(s, i))) return i;
  }
  return undefined;
}

function applyEffect(s: Snapshot, seat: number, e: CardEffect, text: string) {
  const p = s.players[seat];
  const g = s.game;
  const collect = s.rules.cardMovesCollectStart && (e.passStart ?? true);
  switch (e.kind) {
    case "money": {
      const a = e.amount ?? 0;
      s.events.push({ seat, kind: "card_money", text: String(a) });
      if (a >= 0) gain(s, seat, a, "การ์ด");
      else charge(s, seat, -a, "การ์ด");
      return;
    }
    case "collect_each": {
      const a = e.amount ?? 0;
      for (const o of s.players) {
        if (o.seat === seat || o.bankrupt) continue;
        o.cash -= a;
        p.cash += a;
        txn(s, seat, { type: "collect", amount: a, from: o.seat, to: seat });
        log(s, "money", `${o.name} จ่าย ${fmt(a)} บาท ให้ ${p.name} (การ์ด)`, o.seat);
      }
      return;
    }
    case "skip": {
      p.skipTurns += e.turns ?? 1;
      log(s, "skip", `${p.name} พัก ${e.turns ?? 1} ตา`, seat);
      if (e.amount) s.events.push({ seat, kind: "card_money", text: String(e.amount) });
      if (e.amount && e.amount < 0) charge(s, seat, -e.amount, "การ์ด");
      else if (e.amount && e.amount > 0) gain(s, seat, e.amount, "การ์ด");
      return;
    }
    case "move_to": {
      moveTo(s, seat, e.tileIndex ?? 0, collect);
      land(s, seat, { rentMultiplier: e.rentMultiplier });
      return;
    }
    case "move_by": {
      moveBy(s, seat, e.steps ?? 0, collect);
      land(s, seat);
      return;
    }
    case "roll_again": {
      g.phase = "roll";
      g.pending = undefined;
      return;
    }
    case "roll_even_odd":
    case "roll_threshold": {
      g.phase = "card_roll";
      g.pending = { kind: "card_roll", effect: e, text };
      return;
    }
    case "nearest": {
      const target = e.target ?? "special_item";
      const idx =
        target === "own"
          ? nearestIndex(s, p.position, (t) => s.props[t.index]?.ownerSeat === seat)
          : nearestIndex(s, p.position, (t) => t.type === target);
      if (idx === undefined) {
        log(s, "card", `${p.name} ไม่มีที่ให้ไป`, seat);
        return;
      }
      moveTo(s, seat, idx, collect);
      land(s, seat, { rentMultiplier: e.rentMultiplier });
      return;
    }
    case "go_to_jail":
      sendToJail(s, seat, "การ์ด");
      if (e.amount && e.amount < 0) {
        s.events.push({ seat, kind: "card_money", text: String(e.amount) });
        charge(s, seat, -e.amount, "การ์ด"); // may switch the phase to "broke"; the tub still waits next turn
      } else if (e.amount && e.amount > 0) {
        s.events.push({ seat, kind: "card_money", text: String(e.amount) });
        gain(s, seat, e.amount, "การ์ด");
      }
      return;
  }
}

// ── turn flow ────────────────────────────────────────────────────────────

function startTurnFor(s: Snapshot, seat: number, depth = 0) {
  const g = s.game;
  const p = s.players[seat];
  g.turn = seat;
  g.pending = undefined;
  g.doublesCount = 0;
  g.lastRollDouble = false;
  g.builtThisTurn = 0;

  if (p.bankrupt) {
    if (depth > s.players.length) return;
    return startTurnFor(s, (seat + 1) % s.players.length, depth + 1);
  }
  if (p.skipTurns > 0) {
    p.skipTurns -= 1;
    log(s, "skip", `${p.name} ยังพักอยู่ ข้ามตานี้`, seat);
    if (depth > s.players.length * 3) return; // safety valve
    return startTurnFor(s, (seat + 1) % s.players.length, depth + 1);
  }
  if (p.cash < 0) {
    g.phase = "broke";
    g.pending = { kind: "broke", amount: -p.cash };
    return;
  }
  if (s.rules.maxDebt > 0 && p.debt > s.rules.maxDebt) {
    checkOverDebt(s, seat);
    return;
  }
  if (p.inJail) {
    // a limit of 0 = no free release: only a double or the fine gets you out
    if (p.jailLimit > 0 && p.jailTurns >= p.jailLimit) {
      p.inJail = false;
      p.jailTurns = 0;
      log(s, "jail", `${p.name} อาบน้ำเสร็จแล้ว ออกจากอ่างได้`, seat);
      g.phase = "roll";
    } else {
      g.phase = "jail";
    }
    return;
  }
  g.phase = "roll";
}

export function startGame(s: Snapshot) {
  if (s.players.length < 2) throw new GameError("ต้องมีผู้เล่น 2 คน");
  begin(s);
  s.game.status = "playing";
  for (const p of s.players) {
    p.cash = s.rules.startingMoney;
    p.position = 0;
    p.inJail = false;
    p.jailTurns = 0;
    p.skipTurns = 0;
    p.bankrupt = false;
    p.debt = 0;
    p.bankDebt = 0;
  }
  s.props = {};
  log(s, "start", `เริ่มเกม! แต่ละคนได้เงิน ${fmt(s.rules.startingMoney)} บาท`);
  if (s.rules.rollForFirst) {
    s.game.turn = 0;
    s.game.phase = "order_roll";
    s.game.pending = { kind: "order_roll", rolls: s.players.map(() => 0) };
    log(s, "start", "ทอยลูกเต๋าหาคนเริ่มก่อน ใครได้แต้มมากกว่าเริ่มก่อน");
  } else {
    startTurnFor(s, 0);
  }
}

/** Two dice; with an aimed `target` (2–12) the result hits the target with rules.gaugeAccuracy. */
function rollDice(s: Snapshot, target?: number): [number, number] {
  const r = s.rules;
  const rand = s.rand ?? Math.random;
  if (target !== undefined && r.gaugeEnabled && Number.isInteger(target) && target >= 2 && target <= 12 && rand() < r.gaugeAccuracy) {
    const pairs: [number, number][] = [];
    for (let a = 1; a <= 6; a++) {
      const b = target - a;
      if (b >= 1 && b <= 6) pairs.push([a, b]);
    }
    return pairs[Math.min(pairs.length - 1, Math.floor(rand() * pairs.length))];
  }
  return [s.roll(), s.roll()];
}

export function roll(s: Snapshot, seat: number, target?: number) {
  requireTurn(s, seat, "roll", "jail", "card_roll", "order_roll");
  const g = s.game;
  const p = s.players[seat];
  const aimed = target !== undefined && s.rules.gaugeEnabled && (g.phase === "roll" || g.phase === "jail") ? target : undefined;
  const [a, b] = rollDice(s, aimed);
  g.dice = [a, b];
  const isDouble = a === b;
  const aimText = aimed === undefined ? "" : a + b === aimed ? ` 🎯 ตรงเป้า ${aimed}!` : ` (เล็ง ${aimed})`;
  log(s, "roll", `${p.name} ทอยได้ ${a} + ${b} = ${a + b}${aimText}${isDouble ? " เบิ้ล!" : ""}`, seat);

  if (g.phase === "order_roll" && g.pending?.kind === "order_roll") {
    decideOrder(s, seat, a + b);
    return;
  }

  if (g.phase === "card_roll" && g.pending?.kind === "card_roll") {
    const e = g.pending.effect;
    g.pending = undefined;
    g.phase = "end";
    const sum = a + b;
    if (e.kind === "roll_even_odd") {
      if (sum % 2 === 0) {
        sendToJail(s, seat, `การ์ด: ทอยได้แต้มคู่ ${sum}`); // "กลับบ้าน" = the tub
      } else {
        moveTo(s, seat, 0, true);
        land(s, seat);
      }
    } else if (e.kind === "roll_threshold") {
      const th = e.threshold ?? 6;
      const amt = e.amount ?? 0;
      s.events.push({ seat, kind: "card_money", text: String(sum >= th ? amt : -amt) });
      if (sum >= th) gain(s, seat, amt, `ทอยได้ ${sum}`);
      else charge(s, seat, amt, `ทอยได้ ${sum}`);
    }
    return;
  }

  if (g.phase === "jail") {
    if (isDouble) {
      p.inJail = false;
      p.jailTurns = 0;
      g.lastRollDouble = false; // escaping does not grant another roll
      log(s, "jail", `${p.name} ทอยได้เบิ้ล หนีออกจากอ่างอาบน้ำ!`, seat);
      moveBy(s, seat, a + b);
      land(s, seat);
    } else {
      p.jailTurns += 1;
      g.phase = "end";
      log(s, "jail", `${p.name} ยังอยู่ในอ่างอาบน้ำ`, seat);
    }
    return;
  }

  // normal roll
  if (isDouble) {
    g.doublesCount += 1;
    g.lastRollDouble = true;
    if (g.doublesCount > s.rules.maxDoubles) {
      sendToJail(s, seat, `ทอยเบิ้ล ${g.doublesCount} ครั้งติด`);
      return;
    }
  } else {
    g.lastRollDouble = false;
  }
  moveBy(s, seat, a + b);
  land(s, seat);
}

/** Records a roll for who goes first; once everyone has rolled the highest total starts, a tie rolls again. */
function decideOrder(s: Snapshot, seat: number, total: number) {
  const g = s.game;
  if (g.pending?.kind !== "order_roll") return;
  const rolls = [...g.pending.rolls];
  rolls[seat] = total;
  g.pending = { kind: "order_roll", rolls };
  g.lastRollDouble = false;
  const next = s.players.find((p) => !p.bankrupt && rolls[p.seat] === 0);
  if (next) {
    g.turn = next.seat;
    return;
  }
  const best = Math.max(...rolls);
  const top = s.players.filter((p) => rolls[p.seat] === best);
  if (top.length > 1) {
    log(s, "order", `ได้แต้มเท่ากัน (${best}) ทอยใหม่อีกรอบ`);
    g.turn = top[0].seat;
    g.pending = { kind: "order_roll", rolls: s.players.map(() => 0) };
    return;
  }
  log(s, "order", `${s.players.map((p) => `${p.name} ${rolls[p.seat]}`).join(" · ")} → ${top[0].name} เริ่มก่อน!`, top[0].seat);
  startTurnFor(s, top[0].seat);
}

/** Pays rent in cash, or (mode "tab") nets it against the tab between the two players. */
function settleRent(s: Snapshot, seat: number, tileIndex: number, amount: number, toSeat: number, mode: "cash" | "tab") {
  const tile = tileAt(s, tileIndex);
  const prop = s.props[tileIndex];
  const p = s.players[seat];
  const owner = s.players[toSeat];
  let offset = 0;
  let tabbed = 0;
  let cash = amount;
  if (mode === "tab") {
    // 1. the owner may already owe me: cancel that first
    offset = Math.min(amount, owner.debt);
    owner.debt -= offset;
    cash -= offset;
    // 2. the rest goes on my tab; there is no cap, but going over maxDebt stops the game (below)
    tabbed = cash;
    p.debt += tabbed;
    cash = 0;
    if (offset > 0) log(s, "offset", `${p.name} หักหนี้ที่ ${owner.name} ติดไว้ ${fmt(offset)} บาท`, seat);
    if (tabbed > 0) log(s, "tab", `${p.name} ติดค่าเช่า ${tile.name} ไว้ก่อน ${fmt(tabbed)} บาท (รวมติด ${fmt(p.debt)})`, seat);
  }
  s.events.push({
    seat,
    kind: "rent",
    text: JSON.stringify({ to: toSeat, amount, tile: tileIndex, landmark: prop?.landmark ?? false, houses: prop?.houses ?? 0, cash, offset, tabbed }),
  });
  if (cash > 0) charge(s, seat, cash, `ค่าเช่า ${tile.name} ให้ ${owner.name}`, toSeat);
  if (mode === "tab") checkOverDebt(s, seat);
}

/** Over the tab limit: stop the turn until the debtor repays, sells, gets an offer accepted, or gives up. */
function checkOverDebt(s: Snapshot, seat: number) {
  const p = s.players[seat];
  const limit = s.rules.maxDebt;
  if (limit <= 0 || p.debt <= limit || s.game.status !== "playing") return;
  s.game.phase = "over_debt";
  s.game.pending = undefined;
  log(s, "broke", `${p.name} ติดหนี้ ${fmt(p.debt)} เกิน ${fmt(limit)} บาท ต้องลดหนี้ให้เหลือไม่เกิน ${fmt(limit)} ก่อนเล่นต่อ (ชำระหนี้ ขายที่ดิน เสนอขายที่ดินให้อีกฝ่าย หรือยอมแพ้)`, seat);
}

export function payRent(s: Snapshot, seat: number, mode: "cash" | "tab") {
  requireTurn(s, seat, "rent");
  const g = s.game;
  if (g.pending?.kind !== "rent") throw new GameError("ไม่มีค่าเช่าค้างจ่าย");
  const { tileIndex, amount, toSeat } = g.pending;
  // Paying cash while short is allowed: charge() drops the player into the "broke" phase
  // (sell houses/land to cover it) or bankrupts them when nothing can cover it.
  g.pending = undefined;
  g.phase = "end";
  settleRent(s, seat, tileIndex, amount, toSeat, mode);
}

/** Repay (part of) the tab from cash. Allowed any time during the game. */
export function payDebt(s: Snapshot, seat: number, amount?: number) {
  if (s.game.status !== "playing") throw new GameError("เกมยังไม่เริ่ม");
  begin(s);
  const p = s.players[seat];
  const creditor = s.players.find((o) => o.seat !== seat && !o.bankrupt);
  if (p.debt <= 0 || !creditor) throw new GameError("ไม่มีหนี้ค้าง");
  const amt = Math.min(amount ?? p.debt, p.debt, p.cash);
  if (amt <= 0) throw new GameError("เงินสดไม่พอ");
  p.cash -= amt;
  p.debt -= amt;
  creditor.cash += amt;
  txn(s, seat, { type: "repay", amount: amt, from: seat, to: creditor.seat });
  log(s, "repay", `${p.name} ชำระหนี้ให้ ${creditor.name} ${fmt(amt)} บาท${p.debt > 0 ? ` (เหลือ ${fmt(p.debt)})` : " หมดหนี้แล้ว"}`, seat);
  afterSale(s, seat);
}

/** Short on a card or tax payment: put (as much as the cap allows of) the shortfall on the bank debt. */
export function borrowBank(s: Snapshot, seat: number) {
  requireTurn(s, seat, "broke");
  const g = s.game;
  if (g.pending?.kind !== "broke" || !g.pending.bank) throw new GameError("ติดหนี้ธนาคารได้เฉพาะค่าการ์ดและภาษี");
  const p = s.players[seat];
  const amt = Math.min(-p.cash, bankRoom(s, seat));
  if (amt <= 0) throw new GameError(`ติดหนี้ธนาคารครบ ${fmt(s.rules.maxBankDebt)} บาทแล้ว`);
  p.cash += amt;
  p.bankDebt += amt;
  txn(s, seat, { type: "borrow", amount: amt });
  log(s, "bank_debt", `${p.name} ติดหนี้ธนาคาร ${fmt(amt)} บาท (รวมติด ${fmt(p.bankDebt)})`, seat);
  afterSale(s, seat);
}

/** Repay (part of) the bank debt from cash. Allowed any time during the game. */
export function payBankDebt(s: Snapshot, seat: number, amount?: number) {
  if (s.game.status !== "playing") throw new GameError("เกมยังไม่เริ่ม");
  begin(s);
  const p = s.players[seat];
  if (p.bankrupt) throw new GameError("คุณออกจากเกมแล้ว");
  if (p.bankDebt <= 0) throw new GameError("ไม่มีหนี้ธนาคารค้าง");
  const amt = Math.min(amount ?? p.bankDebt, p.bankDebt, p.cash);
  if (amt <= 0) throw new GameError("เงินสดไม่พอ");
  p.cash -= amt;
  p.bankDebt -= amt;
  txn(s, seat, { type: "bank_repay", amount: amt });
  log(s, "repay", `${p.name} ชำระหนี้ธนาคาร ${fmt(amt)} บาท${p.bankDebt > 0 ? ` (เหลือ ${fmt(p.bankDebt)})` : " หมดหนี้แล้ว"}`, seat);
}

export function buy(s: Snapshot, seat: number, withHouse = false) {
  requireTurn(s, seat, "buy");
  const g = s.game;
  if (g.pending?.kind !== "buy") throw new GameError("ไม่มีอะไรให้ซื้อ");
  const tile = tileAt(s, g.pending.tileIndex);
  const p = s.players[seat];
  const price = tile.price ?? 0;
  const houseCost = withHouse && tile.type === "city" ? (tile.housePrice ?? 0) : 0;
  if (withHouse && tile.type !== "city") throw new GameError("สร้างบ้านได้เฉพาะเมือง");
  if (p.cash < price + houseCost) throw new GameError("เงินไม่พอ");
  p.cash -= price;
  s.props[tile.index] = { ownerSeat: seat, houses: 0, landmark: false };
  txn(s, seat, { type: "buy", amount: price, tile: tile.index });
  log(s, "buy", `${p.name} ซื้อ ${tile.name} ราคา ${fmt(price)} บาท`, seat);
  g.pending = undefined;
  g.phase = "end";
  if (withHouse) build(s, seat, tile.index);
}

export function skipBuy(s: Snapshot, seat: number) {
  requireTurn(s, seat, "buy");
  const tile = tileAt(s, (s.game.pending as { tileIndex: number }).tileIndex);
  log(s, "buy", `${s.players[seat].name} ไม่ซื้อ ${tile.name}`, seat);
  s.game.pending = undefined;
  s.game.phase = "end";
}

export function payJail(s: Snapshot, seat: number) {
  requireTurn(s, seat, "jail");
  const p = s.players[seat];
  if (p.cash < s.rules.jailFine) throw new GameError("เงินไม่พอจ่ายค่าไถ่");
  p.cash -= s.rules.jailFine;
  p.inJail = false;
  p.jailTurns = 0;
  txn(s, seat, { type: "fine", amount: s.rules.jailFine, tile: p.position });
  log(s, "jail", `${p.name} จ่ายค่าไถ่ ${fmt(s.rules.jailFine)} บาท ออกจากอ่างอาบน้ำ`, seat);
  s.game.phase = "roll";
}

export function worldTour(s: Snapshot, seat: number, tileIndex?: number) {
  requireTurn(s, seat, "world_tour");
  const p = s.players[seat];
  if (tileIndex === undefined) {
    log(s, "move", `${p.name} ขอพักเดินเล่นอยู่ตรงนี้`, seat);
    s.game.pending = undefined;
    s.game.phase = "end";
    return;
  }
  if (s.props[tileIndex]?.ownerSeat !== seat) throw new GameError("ไปได้เฉพาะที่ดินของตัวเอง");
  moveTo(s, seat, tileIndex, true);
  log(s, "move", `${p.name} เดินเล่นไปที่ ${tileAt(s, tileIndex).name}`, seat);
  land(s, seat);
}

function canBuildPhase(s: Snapshot, seat: number) {
  requireTurn(s, seat, "roll", "end", "jail", "world_tour");
}

export function build(s: Snapshot, seat: number, tileIndex: number) {
  canBuildPhase(s, seat);
  const r = s.rules;
  const tile = tileAt(s, tileIndex);
  const prop = s.props[tileIndex];
  const p = s.players[seat];
  if (tile.type !== "city" || !prop || prop.ownerSeat !== seat) throw new GameError("ไม่ใช่ที่ดินของคุณ");
  if (r.buildOnlyOnLandedTile && p.position !== tileIndex) throw new GameError("สร้างได้เฉพาะช่องที่ยืนอยู่");
  if (r.maxHousesPerTurn > 0 && s.game.builtThisTurn >= r.maxHousesPerTurn) throw new GameError(`ตานี้สร้างได้ ${r.maxHousesPerTurn} หลังเท่านั้น`);
  if (r.requireMonopolyToBuild && tile.group && !hasMonopoly(s, seat, tile.group)) throw new GameError("ต้องมีครบทั้งสีก่อน");
  if (prop.landmark) throw new GameError("สร้างเต็มแล้ว");
  if (r.evenBuild && tile.group) {
    const minHouses = Math.min(...groupTiles(s, tile.group).map((t) => s.props[t.index]?.houses ?? 0));
    if (prop.houses > minHouses) throw new GameError("ต้องสร้างให้เท่ากันทั้งสี");
  }
  const toLandmark = prop.houses >= r.maxHouses;
  const cost = Math.round((tile.housePrice ?? 0) * (toLandmark ? r.landmarkCostMultiplier : 1));
  if (p.cash < cost) throw new GameError("เงินไม่พอ");
  p.cash -= cost;
  s.game.builtThisTurn += 1;
  txn(s, seat, { type: "build", amount: cost, tile: tileIndex });
  if (toLandmark) {
    prop.landmark = true;
    prop.houses = 0;
    log(s, "build", `${p.name} สร้างแลนด์มาร์กที่ ${tile.name} (${fmt(cost)} บาท)`, seat);
  } else {
    prop.houses += 1;
    log(s, "build", `${p.name} สร้างบ้านหลังที่ ${prop.houses} ที่ ${tile.name} (${fmt(cost)} บาท)`, seat);
  }
}

/** After money moved for `seat`: leave the broke / over_debt phase once it is resolved (only on their own turn). */
function afterSale(s: Snapshot, seat: number) {
  const p = s.players[seat];
  if (s.game.turn !== seat) return;
  if (s.game.phase === "broke" && p.cash >= 0) {
    log(s, "broke", `${p.name} หาเงินมาจ่ายครบแล้ว`, seat);
    s.game.pending = undefined;
    s.game.phase = "end";
    checkOverDebt(s, seat);
  } else if (s.game.phase === "over_debt" && p.debt <= s.rules.maxDebt) {
    log(s, "broke", `${p.name} ลดหนี้เหลือ ${fmt(p.debt)} บาท ไม่เกิน ${fmt(s.rules.maxDebt)} แล้ว เล่นต่อได้`, seat);
    s.game.phase = "end";
  }
}

export function sellHouse(s: Snapshot, seat: number, tileIndex: number) {
  requireTurn(s, seat, "roll", "end", "jail", "broke", "over_debt", "world_tour", "rent");
  const tile = tileAt(s, tileIndex);
  const prop = s.props[tileIndex];
  const p = s.players[seat];
  if (!prop || prop.ownerSeat !== seat) throw new GameError("ไม่ใช่ที่ดินของคุณ");
  if (!prop.landmark && prop.houses === 0) throw new GameError("ไม่มีบ้านให้ขาย");
  const r = s.rules;
  let value: number;
  const what = prop.landmark ? "landmark" : "house";
  if (prop.landmark) {
    prop.landmark = false;
    prop.houses = r.maxHouses;
    value = houseSellValue(r, tile, true);
    log(s, "sell", `${p.name} ขายแลนด์มาร์กที่ ${tile.name} ได้ ${fmt(value)} บาท`, seat);
  } else {
    prop.houses -= 1;
    value = houseSellValue(r, tile, false);
    log(s, "sell", `${p.name} ขายบ้าน 1 หลังที่ ${tile.name} ได้ ${fmt(value)} บาท`, seat);
  }
  p.cash += value;
  txn(s, seat, { type: "sell", amount: value, tile: tileIndex, what });
  afterSale(s, seat);
}

export function sellLand(s: Snapshot, seat: number, tileIndex: number) {
  requireTurn(s, seat, "roll", "end", "jail", "broke", "over_debt", "world_tour", "rent");
  if (s.game.offer?.tileIndex === tileIndex) s.game.offer = undefined; // the land is gone, so is the offer
  const tile = tileAt(s, tileIndex);
  const prop = s.props[tileIndex];
  const p = s.players[seat];
  if (!prop || prop.ownerSeat !== seat) throw new GameError("ไม่ใช่ที่ดินของคุณ");
  if (prop.houses > 0 || prop.landmark) throw new GameError("ขายบ้านออกก่อน");
  const value = landSellValue(s.rules, tile);
  delete s.props[tileIndex];
  p.cash += value;
  txn(s, seat, { type: "sell", amount: value, tile: tileIndex, what: "land" });
  log(s, "sell", `${p.name} ขาย ${tile.name} คืนธนาคาร ได้ ${fmt(value)} บาท`, seat);
  afterSale(s, seat);
}

// ── selling land to each other (ขายที่ดินให้กัน) ─────────────────────────
// The seller names a price for one of their tiles (houses included). If the buyer accepts, the
// price first cancels what the seller owes the buyer on the tab; any remainder is paid in cash.

function tradePartner(s: Snapshot, seat: number): PlayerState {
  const other = s.players.find((x) => x.seat !== seat && !x.bankrupt);
  if (!other) throw new GameError("ไม่มีผู้เล่นอีกฝ่าย");
  return other;
}

export function offerSale(s: Snapshot, seat: number, tileIndex: number, price: number) {
  if (s.game.status !== "playing") throw new GameError("เกมยังไม่เริ่ม");
  begin(s);
  const mode = s.rules.tradeMode;
  if (mode === "off") throw new GameError("ปิดการขายที่ดินให้กันอยู่ (เปิดได้ในตั้งค่า)");
  const p = s.players[seat];
  if (p.bankrupt) throw new GameError("คุณออกจากเกมแล้ว");
  if (mode === "debt" && p.debt <= 0) throw new GameError("เสนอขายได้เฉพาะตอนที่คุณติดหนี้อีกฝ่าย");
  const prop = s.props[tileIndex];
  if (!prop || prop.ownerSeat !== seat) throw new GameError("ไม่ใช่ที่ดินของคุณ");
  if (!Number.isInteger(price) || price <= 0) throw new GameError("ใส่ราคาเป็นจำนวนเต็มมากกว่า 0");
  const to = tradePartner(s, seat);
  if (s.game.offer) {
    throw new GameError(s.game.offer.fromSeat === seat ? "คุณมีข้อเสนอค้างอยู่แล้ว ยกเลิกก่อนถ้าจะเปลี่ยนราคา" : "มีข้อเสนอจากอีกฝ่ายค้างอยู่ ตอบก่อนนะ");
  }
  if (s.game.pending?.kind === "rent" && s.game.pending.tileIndex === tileIndex) throw new GameError("ที่ดินนี้มีค่าเช่าค้างจ่ายอยู่ รอจ่ายค่าเช่าก่อน");
  const tile = tileAt(s, tileIndex);
  s.game.offer = { fromSeat: seat, toSeat: to.seat, tileIndex, price, at: s.now };
  log(s, "offer", `${p.name} เสนอขาย ${tile.name} ให้ ${to.name} ${fmt(price)} บาท`, seat);
}

export function cancelOffer(s: Snapshot, seat: number) {
  if (s.game.status !== "playing") throw new GameError("เกมยังไม่เริ่ม");
  begin(s);
  const o = s.game.offer;
  if (!o || o.fromSeat !== seat) throw new GameError("ไม่มีข้อเสนอของคุณค้างอยู่");
  s.game.offer = undefined;
  log(s, "offer", `${s.players[seat].name} ยกเลิกข้อเสนอขาย ${tileAt(s, o.tileIndex).name}`, seat);
}

/** Purchase price of a tile plus everything built on it (what the owner paid in total). */
export function builtValue(s: Snapshot, tileIndex: number): number {
  const t = tileAt(s, tileIndex);
  const pr = s.props[tileIndex];
  const house = t.housePrice ?? 0;
  return (t.price ?? 0) + (pr?.houses ?? 0) * house + (pr?.landmark ? Math.round(house * s.rules.landmarkCostMultiplier) : 0);
}

/** How an accepted offer would settle: part cancels the seller's tab, the rest is cash. */
export function salePreview(s: Snapshot, o: Offer): { offset: number; cash: number } {
  const offset = Math.min(o.price, s.players[o.fromSeat].debt);
  return { offset, cash: o.price - offset };
}

export function respondOffer(s: Snapshot, seat: number, accept: boolean) {
  if (s.game.status !== "playing") throw new GameError("เกมยังไม่เริ่ม");
  begin(s);
  const o = s.game.offer;
  if (!o || o.toSeat !== seat) throw new GameError("ไม่มีข้อเสนอถึงคุณ");
  const seller = s.players[o.fromSeat];
  const buyer = s.players[seat];
  const tile = tileAt(s, o.tileIndex);
  if (!accept) {
    s.game.offer = undefined;
    log(s, "offer", `${buyer.name} ไม่ซื้อ ${tile.name}`, seat);
    return;
  }
  const prop = s.props[o.tileIndex];
  if (!prop || prop.ownerSeat !== o.fromSeat) {
    // the land moved under the offer: void it (must not throw, a throw would roll this back)
    s.game.offer = undefined;
    log(s, "offer", `ข้อเสนอขาย ${tile.name} ถูกยกเลิก เพราะที่ดินเปลี่ยนมือไปแล้ว`, seat);
    return;
  }
  if (s.game.pending?.kind === "rent" && s.game.pending.tileIndex === o.tileIndex) throw new GameError("ที่ดินนี้มีค่าเช่าค้างจ่ายอยู่ จ่ายค่าเช่าก่อนแล้วค่อยซื้อ");
  const { offset, cash } = salePreview(s, o);
  if (cash > 0 && buyer.cash < cash) throw new GameError(`เงินสดไม่พอ ต้องจ่ายสด ${fmt(cash)} บาท`);
  seller.debt -= offset;
  buyer.cash -= cash;
  seller.cash += cash;
  prop.ownerSeat = seat;
  s.game.offer = undefined;
  s.events.push({ seat, kind: "sale", text: JSON.stringify({ from: o.fromSeat, to: seat, tile: o.tileIndex, price: o.price, offset, cash }) });
  const how = [offset > 0 ? `หักหนี้ ${fmt(offset)}` : "", cash > 0 ? `จ่ายสด ${fmt(cash)}` : ""].filter(Boolean).join(" · ");
  log(s, "offer", `${seller.name} ขาย ${tile.name} ให้ ${buyer.name} ${fmt(o.price)} บาท${how ? ` (${how})` : ""}`, seat);
  afterSale(s, o.fromSeat); // a broke seller may now be solvent
}

export function giveUp(s: Snapshot, seat: number) {
  if (s.game.status !== "playing") throw new GameError("เกมยังไม่เริ่ม");
  begin(s);
  bankrupt(s, seat, "ยอมแพ้");
}

export function endTurn(s: Snapshot, seat: number) {
  requireTurn(s, seat, "end");
  const g = s.game;
  const p = s.players[seat];
  if (g.lastRollDouble && !p.inJail && p.skipTurns === 0) {
    g.lastRollDouble = false;
    g.pending = undefined;
    g.phase = "roll";
    log(s, "again", `${p.name} ทอยเบิ้ล ได้ทอยอีกครั้ง`, seat);
    return;
  }
  startTurnFor(s, (seat + 1) % s.players.length);
}
