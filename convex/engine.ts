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

export type Phase = "roll" | "jail" | "buy" | "rent" | "card_roll" | "world_tour" | "broke" | "end";

export type Pending =
  | { kind: "buy"; tileIndex: number }
  | { kind: "card_roll"; effect: CardEffect; text: string }
  | { kind: "rent"; tileIndex: number; amount: number; toSeat: number }
  | { kind: "world_tour" }
  | { kind: "broke"; amount: number; toSeat?: number };

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
};

export type PlayerState = {
  seat: number;
  name: string;
  cash: number;
  position: number;
  inJail: boolean;
  jailTurns: number;
  skipTurns: number;
  bankrupt: boolean;
  /** rent owed to the other player */
  debt: number;
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
    if (prop.landmark) return rent[5] ?? 0;
    if (prop.houses > 0) return rent[Math.min(prop.houses, 4)] ?? 0;
    const base = rent[0] ?? 0;
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
    s.game.phase = "broke";
    s.game.pending = { kind: "broke", amount: -p.cash, toSeat };
    log(s, "broke", `${p.name} เงินไม่พอ ต้องขายทรัพย์สิน ${fmt(-p.cash)} บาท`, seat);
    if (p.cash + liquidationValue(s, seat) < 0) {
      bankrupt(s, seat);
    }
    return false;
  }
  return true;
}

function bankrupt(s: Snapshot, seat: number) {
  const p = s.players[seat];
  p.bankrupt = true;
  const winner = s.players.find((x) => !x.bankrupt);
  s.game.status = "finished";
  s.game.winner = winner?.seat;
  s.game.pending = undefined;
  log(s, "finish", `${p.name} ล้มละลาย! ${winner ? `${winner.name} ชนะ 🎉` : ""}`, seat);
}

// ── movement ─────────────────────────────────────────────────────────────

function passStart(s: Snapshot, seat: number) {
  gain(s, seat, s.rules.passStartBonus, "ผ่านบ้านติ่มซำ");
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

function sendToJail(s: Snapshot, seat: number, why: string) {
  const p = s.players[seat];
  const jail = s.tiles.find((t) => t.type === "jail");
  setPosition(s, seat, jail?.index ?? 10, true);
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
    case "tax":
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
      s.events.push({ seat, kind: "card_money", text: String(a * s.players.filter((o) => o.seat !== seat && !o.bankrupt).length) });
      for (const o of s.players) {
        if (o.seat === seat || o.bankrupt) continue;
        o.cash -= a;
        p.cash += a;
        log(s, "money", `${o.name} จ่าย ${fmt(a)} บาท ให้ ${p.name} (การ์ด)`, o.seat);
      }
      return;
    }
    case "skip": {
      p.skipTurns += e.turns ?? 1;
      log(s, "skip", `${p.name} พักกินขนม ${e.turns ?? 1} ตา`, seat);
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
    log(s, "skip", `${p.name} พักกินขนม ข้ามตานี้`, seat);
    if (depth > s.players.length * 3) return; // safety valve
    return startTurnFor(s, (seat + 1) % s.players.length, depth + 1);
  }
  if (p.cash < 0) {
    g.phase = "broke";
    g.pending = { kind: "broke", amount: -p.cash };
    return;
  }
  if (p.inJail) {
    if (p.jailTurns >= s.rules.jailMaxTurns) {
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
  }
  s.props = {};
  log(s, "start", `เริ่มเกม! แต่ละคนได้เงิน ${fmt(s.rules.startingMoney)} บาท`);
  startTurnFor(s, 0);
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
  requireTurn(s, seat, "roll", "jail", "card_roll");
  const g = s.game;
  const p = s.players[seat];
  const aimed = target !== undefined && s.rules.gaugeEnabled && g.phase === "roll" ? target : undefined;
  const [a, b] = rollDice(s, aimed);
  g.dice = [a, b];
  const isDouble = a === b;
  const aimText = aimed === undefined ? "" : a + b === aimed ? ` 🎯 ตรงเป้า ${aimed}!` : ` (เล็ง ${aimed})`;
  log(s, "roll", `${p.name} ทอยได้ ${a} + ${b} = ${a + b}${aimText}${isDouble ? " เบิ้ล!" : ""}`, seat);

  if (g.phase === "card_roll" && g.pending?.kind === "card_roll") {
    const e = g.pending.effect;
    g.pending = undefined;
    g.phase = "end";
    const sum = a + b;
    if (e.kind === "roll_even_odd") {
      if (sum % 2 === 0) {
        p.skipTurns += e.turns ?? 1;
        log(s, "skip", `แต้มคู่ ${p.name} กลับบ้านพัก 1 ตา`, seat);
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
    // 2. put as much of the rest as the cap allows on my tab
    const room = Math.max(0, s.rules.maxDebt - p.debt);
    tabbed = Math.min(cash, room);
    p.debt += tabbed;
    cash -= tabbed;
    if (offset > 0) log(s, "offset", `${p.name} หักหนี้ที่ ${owner.name} ติดไว้ ${fmt(offset)} บาท`, seat);
    if (tabbed > 0) log(s, "tab", `${p.name} ติดค่าเช่า ${tile.name} ไว้ก่อน ${fmt(tabbed)} บาท (รวมติด ${fmt(p.debt)})`, seat);
  }
  s.events.push({
    seat,
    kind: "rent",
    text: JSON.stringify({ to: toSeat, amount, tile: tileIndex, landmark: prop?.landmark ?? false, houses: prop?.houses ?? 0, cash, offset, tabbed }),
  });
  if (cash > 0) charge(s, seat, cash, `ค่าเช่า ${tile.name} ให้ ${owner.name}`, toSeat);
}

export function payRent(s: Snapshot, seat: number, mode: "cash" | "tab") {
  requireTurn(s, seat, "rent");
  const g = s.game;
  if (g.pending?.kind !== "rent") throw new GameError("ไม่มีค่าเช่าค้างจ่าย");
  const { tileIndex, amount, toSeat } = g.pending;
  const p = s.players[seat];
  if (mode === "cash" && p.cash < amount) throw new GameError("เงินสดไม่พอ เลือกติดไว้ก่อนได้");
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
  log(s, "repay", `${p.name} ชำระหนี้ให้ ${creditor.name} ${fmt(amt)} บาท${p.debt > 0 ? ` (เหลือ ${fmt(p.debt)})` : " หมดหนี้แล้ว"}`, seat);
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
  if (toLandmark) {
    prop.landmark = true;
    prop.houses = 0;
    log(s, "build", `${p.name} สร้างแลนด์มาร์กที่ ${tile.name} (${fmt(cost)} บาท)`, seat);
  } else {
    prop.houses += 1;
    log(s, "build", `${p.name} สร้างบ้านหลังที่ ${prop.houses} ที่ ${tile.name} (${fmt(cost)} บาท)`, seat);
  }
}

function afterSale(s: Snapshot, seat: number) {
  const p = s.players[seat];
  if (s.game.phase === "broke" && p.cash >= 0) {
    log(s, "broke", `${p.name} หาเงินมาจ่ายครบแล้ว`, seat);
    s.game.pending = undefined;
    s.game.phase = "end";
  }
}

export function sellHouse(s: Snapshot, seat: number, tileIndex: number) {
  requireTurn(s, seat, "roll", "end", "jail", "broke", "world_tour");
  const tile = tileAt(s, tileIndex);
  const prop = s.props[tileIndex];
  const p = s.players[seat];
  if (!prop || prop.ownerSeat !== seat) throw new GameError("ไม่ใช่ที่ดินของคุณ");
  if (!prop.landmark && prop.houses === 0) throw new GameError("ไม่มีบ้านให้ขาย");
  const r = s.rules;
  let value: number;
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
  afterSale(s, seat);
}

export function sellLand(s: Snapshot, seat: number, tileIndex: number) {
  requireTurn(s, seat, "roll", "end", "jail", "broke", "world_tour");
  const tile = tileAt(s, tileIndex);
  const prop = s.props[tileIndex];
  const p = s.players[seat];
  if (!prop || prop.ownerSeat !== seat) throw new GameError("ไม่ใช่ที่ดินของคุณ");
  if (prop.houses > 0 || prop.landmark) throw new GameError("ขายบ้านออกก่อน");
  const value = landSellValue(s.rules, tile);
  delete s.props[tileIndex];
  p.cash += value;
  log(s, "sell", `${p.name} ขาย ${tile.name} คืนธนาคาร ได้ ${fmt(value)} บาท`, seat);
  afterSale(s, seat);
}

export function giveUp(s: Snapshot, seat: number) {
  if (s.game.status !== "playing") throw new GameError("เกมยังไม่เริ่ม");
  begin(s);
  bankrupt(s, seat);
}

export function endTurn(s: Snapshot, seat: number) {
  requireTurn(s, seat, "end");
  const g = s.game;
  const p = s.players[seat];
  if (g.lastRollDouble && !p.inJail && p.skipTurns === 0) {
    g.lastRollDouble = false;
    g.pending = undefined;
    g.phase = "roll";
    log(s, "roll", `${p.name} ทอยเบิ้ล ได้ทอยอีกครั้ง`, seat);
    return;
  }
  startTurnFor(s, (seat + 1) % s.players.length);
}
