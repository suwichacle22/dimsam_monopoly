import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../convex/_generated/api";
import type { DimsamMood } from "~/art/Dimsam";
import { Dimsam } from "~/art/Dimsam";
import { Board, type TileFx, type Callout } from "~/components/Board";
import { CoinFlights, type Flight } from "~/components/CoinFlights";
import { MoneyBurst, type Burst } from "~/components/MoneyBurst";
import { TestPanel } from "~/components/TestPanel";
import { DeckSheet } from "~/components/DeckSheet";
import { OfferCard } from "~/components/OfferCard";
import { ActionPanel } from "~/components/ActionPanel";
import { PlayerPanel } from "~/components/PlayerPanel";
import { EventLog } from "~/components/EventLog";
import { CardToast } from "~/components/CardToast";
import { TileSheet } from "~/components/TileSheet";
import { Decision } from "~/components/Decision";
import type { GameView, TileView } from "~/lib/game";
import type { Txn } from "../../convex/engine";
import { buildBlocker, buildCost } from "~/lib/game";
import { setSession, useSession } from "~/lib/session";
import { cx, errorMessage } from "~/lib/format";
import { isMuted, play, setMuted, unlockAudio } from "~/lib/sound";
import { useHotkey } from "@tanstack/react-hotkeys";
import { ThemeToggle } from "~/components/ThemeToggle";

export const Route = createFileRoute("/game")({ component: GamePage });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const STEP_MS = 230;
const ROLL_MS = 1000;
/** full-screen money card; matches the fade in MoneyBurst, plus a beat so two in a row read as two */
const BURST_MS = 2450;
/** tile badge and coins for a purchase, build, sale or fine */
const BADGE_MS = 1000;
const fmtBaht = (n: number) => `${n > 0 ? "+" : "-"}${Math.abs(n).toLocaleString()} ฿`;

type CoinEnd = { tile: number } | { seat: number };
/** the balances on screen: they follow the choreography, not the server */
type Ledger = { cash: number[]; debt: number[]; bank: number[] };
const ledgerOf = (v: GameView): Ledger => ({ cash: v.players.map((p) => p.cash), debt: v.players.map((p) => p.debt), bank: v.players.map((p) => p.bankDebt) });

function GamePage() {
  const session = useSession();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const navigate = useNavigate();
  const token = session?.token ?? "";
  const resumed = useQuery(api.game.resume, mounted && token ? { token } : "skip");

  useEffect(() => {
    if (mounted && (!token || resumed === null)) navigate({ to: "/" });
  }, [mounted, token, resumed, navigate]);

  if (!mounted || !token || !resumed) {
    return <div className="min-h-dvh flex items-center justify-center text-cocoa/60">กำลังโหลดกระดาน…</div>;
  }
  if (resumed.status === "lobby") {
    navigate({ to: "/" });
    return null;
  }
  // "finished" falls through: the board stays up with the victory card until someone taps เล่นใหม่
  return <Game token={token} />;
}

function Game({ token }: { token: string }) {
  const view = useQuery(api.game.state, { token });
  const navigate = useNavigate();
  const m = {
    roll: useMutation(api.game.roll),
    buy: useMutation(api.game.buy),
    skipBuy: useMutation(api.game.skipBuy),
    payRent: useMutation(api.game.payRent),
    payDebt: useMutation(api.game.payDebt),
    borrowBank: useMutation(api.game.borrowBank),
    payBankDebt: useMutation(api.game.payBankDebt),
    payJail: useMutation(api.game.payJail),
    worldTour: useMutation(api.game.worldTour),
    build: useMutation(api.game.build),
    sellHouse: useMutation(api.game.sellHouse),
    sellLand: useMutation(api.game.sellLand),
    endTurn: useMutation(api.game.endTurn),
    giveUp: useMutation(api.game.giveUp),
    offerSale: useMutation(api.game.offerSale),
    cancelOffer: useMutation(api.game.cancelOffer),
    respondOffer: useMutation(api.game.respondOffer),
    newGame: useMutation(api.game.newGame),
    heartbeat: useMutation(api.game.heartbeat),
    botStep: useMutation(api.game.botStep),
  };

  const [displayPos, setDisplayPos] = useState<number[]>([]);
  const [hop, setHop] = useState(0);
  const [rolling, setRolling] = useState(false);
  const [walking, setWalking] = useState(false);
  const [diceShown, setDiceShown] = useState<number[]>([1, 1]);
  const [card, setCard] = useState<GameView["game"]["lastCard"] | null>(null);
  useEffect(() => {
    if (!card) return;
    const id = setTimeout(() => setCard(null), 3500);
    return () => clearTimeout(id);
  }, [card]);
  const [sheet, setSheet] = useState<TileView | null>(null);
  const [deckSheet, setDeckSheet] = useState<"treasure" | "special" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState(false);
  const lastActionRef = useRef<number | null>(null);
  // the action whose result may be shown: the server answers while the dice are still tumbling
  const [revealedAt, setRevealedAt] = useState<number | null>(null);
  const [muted, setMutedState] = useState(false);
  const [tilt3d, setTilt3d] = useState(false);
  const [showSteps, setShowSteps] = useState(false);
  const [fx, setFx] = useState<TileFx[]>([]);
  const [callout, setCallout] = useState<Callout | null>(null);
  const calloutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showCallout = (index: number, text: string, sub?: string, tone: Callout["tone"] = "win") => {
    if (calloutTimer.current) clearTimeout(calloutTimer.current);
    setCallout({ index, text, sub, tone, key: ++fxKey.current });
    calloutTimer.current = setTimeout(() => setCallout(null), 2600);
  };
  const [flights, setFlights] = useState<Flight[]>([]);
  const [burst, setBurst] = useState<Burst>(null);
  const clearBurst = useCallback(() => setBurst(null), []);
  const fxKey = useRef(0);
  const pushFx = (index: number, kind: TileFx["kind"]) => {
    const key = ++fxKey.current;
    setFx((list) => [...list.filter((f) => f.index !== index), { index, kind, key }]);
    setTimeout(() => setFx((list) => list.filter((f) => f.key !== key)), 1800);
  };
  const coinPoint = (end: CoinEnd) => {
    const r = document.querySelector<HTMLElement>("tile" in end ? `[data-tile="${end.tile}"]` : `[data-seat="${end.seat}"]`)?.getBoundingClientRect();
    if (!r) return null;
    const p = "tile" in end ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : { x: r.left + 40, y: r.top + 30 };
    // on a phone the player cards sit below the board: head for the screen edge instead of flying out of sight
    return { x: Math.min(window.innerWidth - 12, Math.max(12, p.x)), y: Math.min(window.innerHeight - 12, Math.max(12, p.y)) };
  };
  const flyCoins = (fromEnd: CoinEnd, toEnd: CoinEnd, n: number) => {
    const from = coinPoint(fromEnd);
    const to = coinPoint(toEnd);
    if (!from || !to) return;
    const id = ++fxKey.current;
    setFlights((f) => [...f, { id, n, from, to }]);
    setTimeout(() => setFlights((f) => f.filter((x) => x.id !== id)), 1400);
  };
  const [ledger, setLedger] = useState<Ledger>({ cash: [], debt: [], bank: [] });
  const ledgerRef = useRef(ledger);
  const syncLedger = (next: Ledger) => {
    ledgerRef.current = next;
    setLedger(next);
  };
  const moveMoney = (seat: number, cash: number, debt = 0, bank = 0) => {
    const { cash: c, debt: d, bank: b } = ledgerRef.current;
    syncLedger({ cash: c.map((x, s) => (s === seat ? x + cash : x)), debt: d.map((x, s) => (s === seat ? x + debt : x)), bank: b.map((x, s) => (s === seat ? x + bank : x)) });
  };
  // the last action that has finished playing; until it catches up with the server the game waits for the show
  const [settledAt, setSettledAt] = useState<number | null>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    setTilt3d(localStorage.getItem("dimsam.3d") !== "0" && window.matchMedia("(prefers-reduced-motion: no-preference)").matches);
    setMutedState(isMuted());
    setShowSteps(localStorage.getItem("dimsam.steps") === "1");
    const unlock = () => unlockAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);
  const viewRef = useRef(view);
  viewRef.current = view;

  // presence
  useEffect(() => {
    m.heartbeat({ token });
    const id = setInterval(() => m.heartbeat({ token }), 20_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // choreography: every new server action plays dice → walk → card → money, one action at a time, so a
  // later action (the other phone repaying, a fast end-turn) waits its turn instead of cutting this one off
  const queue = useRef<{ v: GameView; since: number }[]>([]);
  const draining = useRef(false);
  const actionAt = view?.game.actionAt;
  useEffect(() => {
    const v = viewRef.current;
    if (!v || actionAt === undefined) return;
    if (lastActionRef.current === null) {
      lastActionRef.current = actionAt;
      setDisplayPos(v.players.map((p) => p.position));
      setDiceShown(v.game.dice);
      setRevealedAt(actionAt);
      setSettledAt(actionAt);
      syncLedger(ledgerOf(v));
      return;
    }
    if (lastActionRef.current === actionAt) return;
    queue.current.push({ v, since: lastActionRef.current });
    lastActionRef.current = actionAt;
    void drain();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionAt]);

  async function drain() {
    if (draining.current) return;
    draining.current = true;
    while (queue.current.length) {
      const { v, since } = queue.current.shift()!;
      try {
        // a hidden tab or a long backlog jumps to the result instead of replaying old news
        if (!document.hidden && queue.current.length < 3) await playAction(v, since);
      } catch (e) {
        console.error(e);
      }
      if (!alive.current) return;
      setRolling(false);
      setWalking(false);
      setDisplayPos(v.players.map((p) => p.position));
      setDiceShown(v.game.dice);
      setRevealedAt(v.game.actionAt);
      syncLedger(ledgerOf(v));
      setSettledAt(v.game.actionAt);
    }
    draining.current = false;
  }

  async function playAction(v: GameView, since: number) {
    // "since", not "this action": two quick mutations can reach the client as one update
    const fresh = v.events.filter((e) => e.at > since);
    const rolled = fresh.some((e) => e.kind === "roll");
    const moves = v.game.moves;
    const cardNow = v.game.lastCard && v.game.lastCard.at > since ? v.game.lastCard : null;
    const startTile = v.tiles.find((t) => t.type === "start")?.index ?? 0;
    const passes = fresh.filter((e) => e.kind === "pass_start");
    const passStartBonus = (seat: number) => {
      const i = passes.findIndex((e) => e.seat === seat);
      if (i < 0) return;
      const amt = Number(passes.splice(i, 1)[0].text);
      showCallout(startTile, `+${amt.toLocaleString()} ฿`, "ผ่านบ้านติ่มซำ 🏠");
      flyCoins({ tile: startTile }, { seat }, 5);
      moveMoney(seat, amt);
      play("cash");
    };
    const n = v.tiles.length;

    if (rolled) {
      setRolling(true);
      play("roll");
      await sleep(ROLL_MS);
      if (!alive.current) return;
      setDiceShown(v.game.dice);
      setRolling(false);
    }
    if (moves.length) setWalking(true);
    for (let i = 0; i < moves.length; i++) {
      const mv = moves[i];
      if (mv.teleport) {
        await sleep(250);
        if (!alive.current) return;
        setDisplayPos((prev) => prev.map((p, s) => (s === mv.seat ? mv.to : p)));
        setHop((h) => h + 1);
        pushFx(mv.to, "land");
        passStartBonus(mv.seat);
        await sleep(450);
      } else {
        const fwd = (mv.to - mv.from + n) % n;
        const back = (mv.from - mv.to + n) % n;
        const dir = back < fwd ? -1 : 1;
        const steps = dir === 1 ? fwd : back;
        let pos = mv.from;
        for (let k = 0; k < steps; k++) {
          pos = (pos + dir + n) % n;
          const next = pos;
          setDisplayPos((prev) => prev.map((p, s) => (s === mv.seat ? next : p)));
          setHop((h) => h + 1);
          play("step");
          if (next === startTile) passStartBonus(mv.seat);
          await sleep(STEP_MS);
          if (!alive.current) return;
        }
        pushFx(mv.to, "land");
      }
      if (i === 0 && cardNow) {
        await sleep(300);
        if (!alive.current) return;
        setCard(cardNow);
        play("card");
        await sleep(2600);
        if (!alive.current) return;
      }
    }
    if (!moves.length && cardNow) {
      setCard(cardNow);
      play("card");
    }
    setDisplayPos(v.players.map((p) => p.position));
    setWalking(false);
    setRevealedAt(v.game.actionAt);
    for (const { seat } of [...passes]) if (seat !== undefined) passStartBonus(seat); // safety: a pass we did not see while stepping

    await playMoney(v, fresh, cardNow);
    if (!alive.current) return;

    // whatever moved without a beat of its own (should be nothing) still may not change silently
    for (const p of v.players) {
      const diff = p.cash - (ledgerRef.current.cash[p.seat] ?? p.cash);
      if (diff === 0) continue;
      showCallout(p.position, fmtBaht(diff), p.name, diff > 0 ? "win" : "lose");
      flyCoins(diff > 0 ? { tile: p.position } : { seat: p.seat }, diff > 0 ? { seat: p.seat } : { tile: p.position }, 5);
      moveMoney(p.seat, diff);
      play(diff > 0 ? "cash" : "pay");
    }
    if (fresh.some((e) => e.kind === "finish")) play(v.game.winner === v.me ? "win" : "lose");
    else if (fresh.some((e) => e.kind === "jail" && e.text.includes("โดนจับ"))) play("jail");
  }

  /** Plays every money move of an action in the order the engine made them; each one updates the balances on screen as it plays. */
  async function playMoney(v: GameView, fresh: GameView["events"], cardNow: GameView["game"]["lastCard"] | null) {
    const tileOf = (i: number) => v.tiles.find((t) => t.index === i);
    const deckName = v.game.lastCard?.deck === "special" ? "ถุงของเล่น" : "หีบขนม";
    const who = (seat: number) => (seat === v.me ? "" : `${v.players[seat].name} `);
    const showBurst = async (b: NonNullable<Burst>, sfx: Parameters<typeof play>[0]) => {
      setCard(null); // the drawn card makes way for what it did
      setBurst(b);
      play(sfx);
      await sleep(BURST_MS);
    };
    const badge = async (seat: number, tile: number, amount: number, sub: string, sfx: Parameters<typeof play>[0]) => {
      showCallout(tile, fmtBaht(amount), `${who(seat)}${sub}`, amount > 0 ? "win" : "lose");
      flyCoins(amount > 0 ? { tile } : { seat }, amount > 0 ? { seat } : { tile }, 6);
      moveMoney(seat, amount);
      play(sfx);
      await sleep(BADGE_MS);
    };
    let cardDone = false;
    let waitedForCard = !cardNow;
    const letCardRead = async () => {
      if (!waitedForCard) await sleep(600);
      waitedForCard = true;
    };
    for (const e of fresh) {
      if (!alive.current) return;
      if (e.kind === "card_money" && !cardDone) {
        cardDone = true;
        const seat = e.seat!;
        const net = fresh.filter((x) => x.kind === "card_money").reduce((a, x) => a + Number(x.text), 0);
        if (net === 0) continue;
        await letCardRead();
        if (!alive.current) return;
        const p = v.players[seat];
        const tile = { tile: p.position };
        flyCoins(net > 0 ? tile : { seat }, net > 0 ? { seat } : tile, 8);
        moveMoney(seat, net);
        await showBurst({ id: ++fxKey.current, amount: net, label: net > 0 ? `${p.name} ได้รางวัล!` : `${p.name} โดนปรับ`, kicker: deckName, variant: p.variant }, net > 0 ? "prize" : "penalty");
      } else if (e.kind === "sale") {
        // land sold between the players (ขายที่ดินให้กัน)
        const t = JSON.parse(e.text) as { from: number; to: number; tile: number; price: number; offset: number; cash: number };
        const seller = v.players[t.from];
        const buyer = v.players[t.to];
        const tile = tileOf(t.tile);
        const bits = [t.offset > 0 ? `หักหนี้ ${t.offset.toLocaleString()}` : "", t.cash > 0 ? `จ่ายสด ${t.cash.toLocaleString()}` : ""].filter(Boolean).join(" · ");
        if (t.cash > 0) flyCoins({ seat: t.to }, { seat: t.from }, 6);
        moveMoney(t.to, -t.cash);
        moveMoney(t.from, t.cash, -t.offset);
        if (tile) pushFx(tile.index, "buy");
        await showBurst(
          {
            id: ++fxKey.current,
            amount: t.to === v.me ? -t.price : t.price,
            tone: "tab",
            label: t.to === v.me ? `คุณซื้อ ${tile?.name ?? ""} จาก ${seller.name}` : `${buyer.name} ซื้อ ${tile?.name ?? ""} จากคุณ`,
            kicker: "ซื้อขายที่ดิน 🤝",
            detail: bits || undefined,
            variant: t.to === v.me ? buyer.variant : seller.variant,
          },
          "cash",
        );
      } else if (e.kind === "tax" && e.seat !== undefined) {
        // tax tile (ค่าหาหมอ, ค่าอาบน้ำตัดขน): the money just vanishes, so show it clearly
        const t = JSON.parse(e.text) as { amount: number; tile: number };
        const payer = v.players[e.seat];
        const tile = tileOf(t.tile);
        flyCoins({ seat: e.seat }, { tile: t.tile }, 6);
        moveMoney(e.seat, -t.amount);
        await showBurst({ id: ++fxKey.current, amount: -t.amount, tone: "lose", label: `${payer.name} จ่าย${tile?.name ?? "ค่าใช้จ่าย"}`, kicker: tile?.name ?? "ค่าใช้จ่าย", detail: tile?.blurb, variant: payer.variant }, "penalty");
      } else if (e.kind === "rent" && e.seat !== undefined) {
        // rent: shown from this phone's point of view (payer loses, owner gains, or it goes on the tab)
        const r = JSON.parse(e.text) as { to: number; amount: number; tile: number; landmark: boolean; houses: number; cash: number; offset: number; tabbed: number };
        const payer = v.players[e.seat];
        const owner = v.players[r.to];
        const tile = tileOf(r.tile);
        const iOwn = r.to === v.me;
        const what = r.landmark ? "แลนด์มาร์ก ★" : r.houses > 0 ? `บ้าน ${r.houses} หลัง` : tile?.type === "station" ? "ร้าน" : tile?.type === "special_item" ? "ของเล่น" : "ที่ดิน";
        const onTab = r.offset > 0 || r.tabbed > 0;
        const bits: string[] = [];
        if (r.offset > 0) bits.push(`หักหนี้ ${r.offset.toLocaleString()}`);
        if (r.tabbed > 0) bits.push(`ติดไว้ ${r.tabbed.toLocaleString()}`);
        if (r.cash > 0) bits.push(`จ่ายสด ${r.cash.toLocaleString()}`);
        if (r.cash > 0) flyCoins({ seat: e.seat }, { seat: r.to }, 6);
        moveMoney(e.seat, -r.cash, r.tabbed);
        moveMoney(r.to, r.cash, -r.offset);
        await showBurst(
          {
            id: ++fxKey.current,
            amount: iOwn ? r.amount : -r.amount,
            tone: onTab ? "tab" : iOwn ? "win" : "lose",
            label: onTab ? (iOwn ? `${payer.name} ติดค่าเช่าไว้ก่อน` : `ติด ${owner.name} ไว้ก่อน`) : iOwn ? `${payer.name} มาจ่ายค่าเช่า` : `จ่ายค่าเช่าให้ ${owner.name}`,
            kicker: `ค่าเช่า ${tile?.name ?? ""}`,
            detail: `${what}${r.landmark ? " · ค่าเช่าสูงสุด!" : ""}${onTab ? ` · ${bits.join(" · ")}` : ""}`,
            variant: iOwn ? owner.variant : payer.variant,
          },
          onTab ? "tab" : iOwn ? "prize" : "penalty",
        );
      } else if (e.kind === "txn" && e.seat !== undefined) {
        const t = JSON.parse(e.text) as Txn;
        if (t.type === "buy") {
          pushFx(t.tile, "buy");
          await badge(e.seat, t.tile, -t.amount, `ซื้อ ${tileOf(t.tile)?.name ?? ""}`, "buy");
        } else if (t.type === "build") {
          pushFx(t.tile, "build");
          const landmark = v.props.find((x) => x.tileIndex === t.tile)?.landmark;
          await badge(e.seat, t.tile, -t.amount, `สร้าง${landmark ? "แลนด์มาร์ก" : "บ้าน"} ${tileOf(t.tile)?.name ?? ""}`, "build");
        } else if (t.type === "sell") {
          const what = t.what === "land" ? "ที่ดิน" : t.what === "landmark" ? "แลนด์มาร์ก" : "บ้าน";
          await badge(e.seat, t.tile, t.amount, `ขาย${what} ${tileOf(t.tile)?.name ?? ""}`, "cash");
        } else if (t.type === "fine") {
          await badge(e.seat, t.tile, -t.amount, "จ่ายค่าไถ่ออกจากอ่าง", "pay");
        } else if (t.type === "borrow" || t.type === "bank_repay") {
          // bank debt (ติดหนี้ธนาคาร): borrowing covers a card/tax shortfall, repaying hands cash back to the bank
          const p = v.players[e.seat];
          const borrow = t.type === "borrow";
          moveMoney(e.seat, borrow ? t.amount : -t.amount, 0, borrow ? t.amount : -t.amount);
          const left = ledgerRef.current.bank[e.seat] ?? 0;
          await showBurst(
            {
              id: ++fxKey.current,
              amount: borrow ? t.amount : -t.amount,
              tone: "tab",
              label: borrow ? `${p.name} ติดหนี้ธนาคาร` : `${p.name} ชำระหนี้ธนาคาร`,
              kicker: "ธนาคาร 🏦",
              detail: left > 0 ? `หนี้ธนาคารรวม ${left.toLocaleString()}` : "หมดหนี้ธนาคารแล้ว",
              variant: p.variant,
            },
            borrow ? "tab" : "pay",
          );
        } else {
          // collect (card) and repay move money between the players: each phone sees its own side
          const iPay = t.from === v.me;
          const payer = v.players[t.from];
          const payee = v.players[t.to];
          if (t.type === "collect") await letCardRead();
          if (!alive.current) return;
          flyCoins({ seat: t.from }, { seat: t.to }, 8);
          moveMoney(t.from, -t.amount, t.type === "repay" ? -t.amount : 0);
          moveMoney(t.to, t.amount);
          const left = ledgerRef.current.debt[t.from] ?? 0;
          await showBurst(
            {
              id: ++fxKey.current,
              amount: iPay ? -t.amount : t.amount,
              label: t.type === "repay" ? (iPay ? `ชำระหนี้ให้ ${payee.name}` : `${payer.name} ชำระหนี้ให้คุณ`) : iPay ? `จ่ายให้ ${payee.name}` : `${payer.name} จ่ายให้คุณ`,
              kicker: t.type === "repay" ? "ชำระหนี้ 💵" : deckName,
              detail: t.type === "repay" ? (left > 0 ? `เหลือหนี้ ${left.toLocaleString()}` : "หมดหนี้แล้ว") : undefined,
              variant: iPay ? payer.variant : payee.variant,
            },
            iPay ? "penalty" : "prize",
          );
        }
      }
    }
  }

  // solo mode: when it is the bot's turn and nothing is animating, let it act after a short pause
  const botTurn = !!view && view.game.status === "playing" && !!view.players[view.game.turn]?.bot;
  const botOffer = !!view && view.game.status === "playing" && !!view.game.offer && !!view.players[view.game.offer.toSeat]?.bot;
  // true from the render that first shows a new action, so no effect or button can slip in before the show starts
  const showing = !!view && settledAt !== view.game.actionAt;
  const busyNow = rolling || walking || !!burst || !!card || showing;
  useEffect(() => {
    if (!(botTurn || botOffer) || busyNow) return;
    const id = setTimeout(() => m.botStep({ token }).catch(() => {}), 1100);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [botTurn, botOffer, busyNow, view?.game.phase, view?.game.actionAt, token]);

  // auto end-turn: once everything has settled, end the turn by itself, except when the player
  // could still build a house where they stand (then they press build or จบตา themselves).
  // A successful land/house purchase or a build always ends the turn.
  const [autoEnding, setAutoEnding] = useState(false);
  const settled = !!view && view.game.status === "playing" && view.game.turn === view.me && view.game.phase === "end" && !showing && !rolling && !walking && !card && !burst && !sheet && !deckSheet && !pendingAction;
  const autoEnabled = !!view && view.rules.autoEndTurn && !view.players[view.me]?.bot;
  useEffect(() => {
    if (!settled || !autoEnabled || !view) {
      setAutoEnding(false);
      return;
    }
    const me = view.players[view.me];
    const here = view.tiles.find((t) => t.index === me.position);
    const canBuild = !!here && buildBlocker(view, view.me, here) === null && me.cash >= buildCost(view, here).cost;
    const justActed = view.events.some((e) => e.at === view.game.actionAt && e.seat === view.me && (e.kind === "build" || (e.kind === "buy" && !e.text.includes("ไม่ซื้อ"))));
    if (canBuild && !justActed) {
      setAutoEnding(false);
      return;
    }
    setAutoEnding(true);
    const id = setTimeout(() => {
      m.endTurn({ token }).catch(() => {});
    }, 700);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settled, autoEnabled, view?.game.actionAt, token]);

  const run = useCallback(async (fn: () => Promise<unknown>, optimisticRoll = false) => {
    setError(null);
    setPendingAction(true);
    if (optimisticRoll) setRolling(true);
    try {
      await fn();
    } catch (e) {
      setError(errorMessage(e));
      if (optimisticRoll) setRolling(false);
    } finally {
      setPendingAction(false);
    }
  }, []);

  const me = view?.players.find((p) => p.seat === view.me);
  const busy = rolling || walking || showing;
  const myTurn = !!view && view.game.turn === view.me && view.game.status === "playing";
  const canRollNow = myTurn && !busy && !pendingAction && !card && ["roll", "jail", "card_roll", "order_roll"].includes(view!.game.phase);
  // step numbers count from the active player and hold still until the next roll is due, so they stay put through a turn
  const stepsAnchor = useRef<{ seat: number; tile: number } | undefined>(undefined);
  if (view && revealedAt === view.game.actionAt && !busy && ["roll", "jail", "card_roll"].includes(view.game.phase)) {
    stepsAnchor.current = { seat: view.game.turn, tile: view.players[view.game.turn].position };
  }

  // Space: in the normal roll phase hold-to-aim drives the gauge; elsewhere a plain roll. Escape closes sheets.
  const [spaceHeld, setSpaceHeld] = useState(false);
  // the jail gauge lives in the Decision popup, which a tile sheet hides → plain roll while a sheet is open
  const gaugePhase = canRollNow && view!.rules.gaugeEnabled && (view!.game.phase === "roll" || (view!.game.phase === "jail" && !sheet));
  useHotkey("Space", () => setSpaceHeld(true), { enabled: gaugePhase && !spaceHeld, eventType: "keydown", requireReset: true, conflictBehavior: "allow", preventDefault: "always" });
  useHotkey("Space", () => setSpaceHeld(false), { enabled: spaceHeld, eventType: "keyup", conflictBehavior: "allow", preventDefault: "always" });
  useHotkey("Space", () => run(() => m.roll({ token }), true), { enabled: canRollNow && !gaugePhase, conflictBehavior: "allow", preventDefault: "always" });
  // Space must never page-scroll the board (key repeat while holding, focused buttons, etc.)
  useEffect(() => {
    const block = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      e.preventDefault();
    };
    window.addEventListener("keydown", block, { capture: true });
    window.addEventListener("keyup", block, { capture: true });
    return () => {
      window.removeEventListener("keydown", block, { capture: true });
      window.removeEventListener("keyup", block, { capture: true });
    };
  }, []);
  useEffect(() => {
    if (!gaugePhase) setSpaceHeld(false);
  }, [gaugePhase]);
  useHotkey("Escape", () => { setSheet(null); setCard(null); setDeckSheet(null); }, { enabled: !!sheet || !!card || !!deckSheet });

  if (!view) return <div className="min-h-dvh flex items-center justify-center text-cocoa/60">กำลังโหลดกระดาน…</div>;
  const mood: DimsamMood =
    view.game.status === "finished"
      ? view.game.winner === view.me
        ? "happy"
        : "sad"
      : rolling
        ? "happy"
        : walking
          ? "walk"
          : me?.inJail
            ? "soggy"
            : !myTurn
              ? "sleep"
              : view.game.phase === "broke" || view.game.phase === "over_debt"
                ? "sad"
                : ["buy", "rent", "world_tour", "card_roll"].includes(view.game.phase)
                  ? "think"
                  : "idle";

  const actions = {
    roll: (target?: number) => run(() => m.roll({ token, target }), true),
    buy: (withHouse = false) => run(() => m.buy({ token, withHouse })),
    payRent: (mode: "cash" | "tab") => run(() => m.payRent({ token, mode })),
    payDebt: (amount?: number) => run(() => m.payDebt({ token, amount })),
    borrowBank: () => run(() => m.borrowBank({ token })),
    build: (tileIndex: number) => run(() => m.build({ token, tileIndex })),
    skipBuy: () => run(() => m.skipBuy({ token })),
    payJail: () => run(() => m.payJail({ token })),
    worldTour: (tileIndex?: number) => run(() => m.worldTour({ token, tileIndex })),
    endTurn: () => run(() => m.endTurn({ token })),
    giveUp: () => {
      const other = view.players.find((p) => p.seat !== view.me);
      if (confirm(`ยอมแพ้จริงๆ นะ? ${other ? `${other.name} จะชนะทันที` : "เกมจะจบทันที"}`)) run(() => m.giveUp({ token }));
    },
    openTile: (i: number) => setSheet(view.tiles.find((t) => t.index === i) ?? null),
  };

  const decisionPhase = ["buy", "rent", "jail", "card_roll", "world_tour"].includes(view.game.phase);
  const showDecision = myTurn && !rolling && !walking && !burst && decisionPhase && !sheet;
  const resultHidden = revealedAt !== view.game.actionAt;

  return (
    <main className="game-main min-h-dvh p-2 sm:p-4 flex flex-col lg:flex-row gap-3 max-w-[1400px] mx-auto">
      <section className="w-full lg:flex-1 lg:max-w-[min(100%,calc(100dvh-2rem))] mx-auto">
        <Board
          view={view}
          displayPos={displayPos}
          hop={hop}
          mood={mood}
          dice={diceShown}
          rolling={rolling}
          animate
          resultHidden={resultHidden}
          stepsFrom={showSteps ? stepsAnchor.current ?? { seat: view.game.turn, tile: view.players[view.game.turn].position } : undefined}
          tilt={tilt3d ? 14 : 0}
          fx={fx}
          callout={callout}
          onTileClick={(t) => setSheet(t)}
          onPileClick={(d) => setDeckSheet(d)}
        />
        <CoinFlights flights={flights} />
        {showDecision && <Decision view={view} disabled={pendingAction || showing} actions={actions} spaceHeld={spaceHeld} />}
        <MoneyBurst burst={burst} onDone={clearBurst} />
      </section>
      <aside className="w-full lg:w-[380px] flex flex-col gap-3 lg:max-h-[calc(100dvh-2rem)]">
        <OfferCard view={view} busy={pendingAction} onRespond={(accept) => run(() => m.respondOffer({ token, accept }))} onCancel={() => run(() => m.cancelOffer({ token }))} />
        <ActionPanel view={view} busy={rolling || walking} pendingAction={pendingAction || showing} actions={actions} spaceHeld={spaceHeld} autoEnding={autoEnding} />
        {error && <div className="rounded-2xl bg-berry/10 border border-berry/30 text-berry text-sm px-3 py-2">{error}</div>}
        <PlayerPanel view={view} shown={showing ? ledger : undefined} onTile={actions.openTile} onPayDebt={actions.payDebt} onPayBankDebt={(amount) => run(() => m.payBankDebt({ token, amount }))} />
        {view.players.some((p) => p.bot) && (
          <TestPanel
            view={view}
            onBurst={setBurst}
            onFx={pushFx}
            onCard={(deck, text) => { setCard({ deck, text, seat: view.me, at: Date.now() }); play("card"); }}
            onRoll={() => { play("roll"); setRolling(true); setTimeout(() => { setDiceShown([1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)]); setRolling(false); }, 1000); }}
          />
        )}
        <EventLog view={view} resultHidden={resultHidden} className="h-48 lg:flex-1 lg:min-h-0" />
        <div className="flex flex-wrap justify-center sm:justify-end items-center gap-x-1 gap-y-1.5 text-xs text-cocoa/50 px-1 whitespace-nowrap">
          <Link to="/settings">ตั้งค่า</Link>
          <button className="px-2 py-1 rounded-lg border border-cocoa/20" onClick={() => setDeckSheet("treasure")} title="ดูการ์ด">
            🃏<span className="hidden sm:inline"> ดูการ์ด</span>
          </button>
          <button
            className="px-2 py-1 rounded-lg border border-cocoa/20"
            onClick={() => {
              const next = !tilt3d;
              setTilt3d(next);
              localStorage.setItem("dimsam.3d", next ? "1" : "0");
            }}
          >
            {tilt3d ? "🎲" : "▭"}<span className="hidden sm:inline">{tilt3d ? " มุมมอง 3D" : " มุมมองแบน"}</span>
          </button>
          <button
            className="px-2 py-1 rounded-lg border border-cocoa/20"
            title="แสดงจำนวนก้าว 1–12 จากตัวผู้เล่นที่ถึงตา"
            onClick={() => {
              const next = !showSteps;
              setShowSteps(next);
              localStorage.setItem("dimsam.steps", next ? "1" : "0");
            }}
          >
            🔢<span className="hidden sm:inline">{showSteps ? " นับช่องเปิด" : " นับช่องปิด"}</span>
          </button>
          <button
            className="px-2 py-1 rounded-lg border border-cocoa/20"
            onClick={() => {
              const next = !muted;
              setMuted(next);
              setMutedState(next);
              if (!next) play("tap");
            }}
          >
            {muted ? "🔇" : "🔊"}<span className="hidden sm:inline">{muted ? " ปิดเสียงอยู่" : " เสียงเปิด"}</span>
          </button>
          <ThemeToggle compact />
          {view.game.status === "playing" && me && !me.bankrupt && (
            <button
              className="px-2 py-1 rounded-lg border border-berry/40 text-berry"
              title="ยอมแพ้ (อีกฝ่ายชนะทันที)"
              disabled={pendingAction}
              onClick={actions.giveUp}
            >
              🏳️<span className="hidden sm:inline"> ยอมแพ้</span>
            </button>
          )}
          <button
            onClick={() => {
              if (confirm("ออกจากห้องบนเครื่องนี้? (เกมยังอยู่ กลับเข้ามาใหม่ได้ด้วยรหัสห้อง)")) {
                setSession(null);
                navigate({ to: "/" });
              }
            }}
          >
            ออกจากห้อง
          </button>
        </div>
      </aside>

      <TileSheet
        view={view}
        tile={sheet}
        busy={pendingAction}
        onClose={() => setSheet(null)}
        onBuild={(i) => run(() => m.build({ token, tileIndex: i }))}
        onSellHouse={(i) => run(() => m.sellHouse({ token, tileIndex: i }))}
        onSellLand={(i) => run(() => m.sellLand({ token, tileIndex: i }))}
        onOffer={(i, price) => run(async () => { await m.offerSale({ token, tileIndex: i, price }); setSheet(null); })}
      />
      <CardToast card={card ?? null} onClose={() => setCard(null)} />
      {deckSheet && <DeckSheet token={token} initial={deckSheet} onClose={() => setDeckSheet(null)} />}

      {view.game.status === "finished" && !busy && (
        <div className="fixed inset-0 z-50 bg-scrim/60 flex items-center justify-center p-6">
          <div className="card p-6 max-w-sm w-full text-center flex flex-col items-center gap-3 pop-in">
            <div className={cx("w-40 h-40", view.game.winner === view.me && "mascot-cheer")}>
              <Dimsam mood={view.game.winner === view.me ? "happy" : "sad"} variant={me?.variant} />
            </div>
            <h2 className="text-3xl font-bold text-cocoa">
              {view.game.winner === undefined ? "จบเกม" : view.game.winner === view.me ? "🏆 คุณชนะ!" : `🏆 ${view.players[view.game.winner]?.name} ชนะ!`}
            </h2>
            <p className="text-sm text-cocoa/70">{[...view.events].reverse().find((e) => e.kind === "finish")?.text}</p>
            <p className="text-sm text-cocoa/70">
              {view.game.winner === view.me ? "ติ่มซำภูมิใจในตัวคุณมาก 🐾" : "ไม่เป็นไร ขอแก้มืออีกรอบ"}
            </p>
            <button
              className="btn-primary w-full"
              onClick={() =>
                run(async () => {
                  await m.newGame({ token });
                  navigate({ to: "/" });
                })
              }
            >
              เล่นใหม่
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
