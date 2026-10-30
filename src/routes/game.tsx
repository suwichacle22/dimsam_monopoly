import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../convex/_generated/api";
import type { DimsamMood } from "~/art/Dimsam";
import { Dimsam } from "~/art/Dimsam";
import { Board, type TileFx } from "~/components/Board";
import { CoinFlights, type Flight } from "~/components/CoinFlights";
import { MoneyBurst, type Burst } from "~/components/MoneyBurst";
import { TestPanel } from "~/components/TestPanel";
import { DeckSheet } from "~/components/DeckSheet";
import { ActionPanel } from "~/components/ActionPanel";
import { PlayerPanel } from "~/components/PlayerPanel";
import { EventLog } from "~/components/EventLog";
import { CardToast } from "~/components/CardToast";
import { TileSheet } from "~/components/TileSheet";
import { Decision } from "~/components/Decision";
import type { GameView, TileView } from "~/lib/game";
import { buildBlocker, buildCost } from "~/lib/game";
import { setSession, useSession } from "~/lib/session";
import { errorMessage } from "~/lib/format";
import { isMuted, play, setMuted, unlockAudio } from "~/lib/sound";
import { useHotkey } from "@tanstack/react-hotkeys";
import { ThemeToggle } from "~/components/ThemeToggle";

export const Route = createFileRoute("/game")({ component: GamePage });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const STEP_MS = 230;
const ROLL_MS = 1000;

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
    payJail: useMutation(api.game.payJail),
    worldTour: useMutation(api.game.worldTour),
    build: useMutation(api.game.build),
    sellHouse: useMutation(api.game.sellHouse),
    sellLand: useMutation(api.game.sellLand),
    endTurn: useMutation(api.game.endTurn),
    giveUp: useMutation(api.game.giveUp),
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
  const [muted, setMutedState] = useState(false);
  const [tilt3d, setTilt3d] = useState(false);
  const [fx, setFx] = useState<TileFx[]>([]);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [burst, setBurst] = useState<Burst>(null);
  const clearBurst = useCallback(() => setBurst(null), []);
  const fxKey = useRef(0);
  const pushFx = (index: number, kind: TileFx["kind"]) => {
    const key = ++fxKey.current;
    setFx((list) => [...list.filter((f) => f.index !== index), { index, kind, key }]);
    setTimeout(() => setFx((list) => list.filter((f) => f.key !== key)), 1800);
  };
  const flyCoins = (fromTile: number, toSeat: number, n: number) => {
    const from = document.querySelector<HTMLElement>(`[data-tile="${fromTile}"]`)?.getBoundingClientRect();
    const to = document.querySelector<HTMLElement>(`[data-seat="${toSeat}"]`)?.getBoundingClientRect();
    if (!from || !to) return;
    const id = ++fxKey.current;
    setFlights((f) => [...f, { id, n, from: { x: from.left + from.width / 2, y: from.top + from.height / 2 }, to: { x: to.left + 40, y: to.top + 30 } }]);
    setTimeout(() => setFlights((f) => f.filter((x) => x.id !== id)), 1400);
  };
  useEffect(() => {
    setTilt3d(localStorage.getItem("dimsam.3d") !== "0" && window.matchMedia("(prefers-reduced-motion: no-preference)").matches);
    setMutedState(isMuted());
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

  // choreography: when a new server action arrives, play dice → walk → card
  const actionAt = view?.game.actionAt;
  useEffect(() => {
    const v = viewRef.current;
    if (!v || actionAt === undefined) return;
    if (lastActionRef.current === null) {
      lastActionRef.current = actionAt;
      setDisplayPos(v.players.map((p) => p.position));
      setDiceShown(v.game.dice);
      return;
    }
    if (lastActionRef.current === actionAt) return;
    lastActionRef.current = actionAt;

    const fresh = v.events.filter((e) => e.at === actionAt);
    const rolled = fresh.some((e) => e.kind === "roll");
    const moves = v.game.moves;
    const cardNow = v.game.lastCard && v.game.lastCard.at === actionAt ? v.game.lastCard : null;
    const finalPos = v.players.map((p) => p.position);
    const n = v.tiles.length;
    let cancelled = false;

    (async () => {
      if (rolled) {
        setRolling(true);
        play("roll");
        await sleep(ROLL_MS);
        if (cancelled) return;
        setDiceShown(v.game.dice);
        setRolling(false);
      }
      if (moves.length) setWalking(true);
      for (let i = 0; i < moves.length; i++) {
        const mv = moves[i];
        if (mv.teleport) {
          await sleep(250);
          if (cancelled) return;
          setDisplayPos((prev) => prev.map((p, s) => (s === mv.seat ? mv.to : p)));
          setHop((h) => h + 1);
          pushFx(mv.to, "land");
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
            await sleep(STEP_MS);
            if (cancelled) return;
          }
          pushFx(mv.to, "land");
        }
        if (i === 0 && cardNow) {
          await sleep(300);
          if (cancelled) return;
          setCard(cardNow);
          play("card");
          await sleep(2600);
          if (cancelled) return;
        }
      }
      if (!moves.length && cardNow) {
        setCard(cardNow);
        play("card");
      }
      setDisplayPos(finalPos);
      setWalking(false);
      // card prize / penalty burst (both phones see it, from the card-drawer's point of view)
      const cardMoney = fresh.filter((e) => e.kind === "card_money");
      if (cardMoney.length) {
        const seat = cardMoney[0].seat!;
        const net = cardMoney.reduce((a, e) => a + Number(e.text), 0);
        if (net !== 0) {
          if (cardNow) await sleep(600);
          if (cancelled) return;
          setCard(null);
          const p = v.players[seat];
          setBurst({
            id: actionAt,
            amount: net,
            label: net > 0 ? `${p.name} ได้รางวัล!` : `${p.name} โดนปรับ`,
            kicker: cardNow?.deck === "special" ? "ถุงของเล่น" : "หีบขนม",
            variant: p.variant,
          });
          play(net > 0 ? "prize" : "penalty");
          await sleep(2300);
          if (cancelled) return;
        }
      }
      // rent burst: shown from this phone's point of view (payer loses, owner gains, or it goes on the tab)
      const rentEv = fresh.find((e) => e.kind === "rent");
      if (rentEv && rentEv.seat !== undefined) {
        const r = JSON.parse(rentEv.text) as { to: number; amount: number; tile: number; landmark: boolean; houses: number; cash: number; offset: number; tabbed: number };
        const payer = v.players[rentEv.seat];
        const owner = v.players[r.to];
        const tile = v.tiles.find((t) => t.index === r.tile);
        const iOwn = r.to === v.me;
        const what = r.landmark ? "แลนด์มาร์ก ★" : r.houses > 0 ? `บ้าน ${r.houses} หลัง` : tile?.type === "station" ? "ร้าน" : tile?.type === "special_item" ? "ของเล่น" : "ที่ดิน";
        const onTab = r.offset > 0 || r.tabbed > 0;
        const bits: string[] = [];
        if (r.offset > 0) bits.push(`หักหนี้ ${r.offset.toLocaleString()}`);
        if (r.tabbed > 0) bits.push(`ติดไว้ ${r.tabbed.toLocaleString()}`);
        if (r.cash > 0) bits.push(`จ่ายสด ${r.cash.toLocaleString()}`);
        setBurst({
          id: actionAt + 1,
          amount: iOwn ? r.amount : -r.amount,
          tone: onTab ? "tab" : iOwn ? "win" : "lose",
          label: onTab ? (iOwn ? `${payer.name} ติดค่าเช่าไว้ก่อน` : `ติด ${owner.name} ไว้ก่อน`) : iOwn ? `${payer.name} มาจ่ายค่าเช่า` : `จ่ายค่าเช่าให้ ${owner.name}`,
          kicker: `ค่าเช่า ${tile?.name ?? ""}`,
          detail: `${what}${r.landmark ? " · ค่าเช่าสูงสุด!" : ""}${onTab ? ` · ${bits.join(" · ")}` : ""}`,
          variant: iOwn ? owner.variant : payer.variant,
        });
        play(onTab ? "tab" : iOwn ? "prize" : "penalty");
        await sleep(2300);
        if (cancelled) return;
      }
      // outcome effects, once the piece has arrived
      const mine = (e: { seat?: number }) => e.seat === v.me;
      for (const e of fresh) {
        const pos = e.seat !== undefined ? v.players[e.seat]?.position : undefined;
        if (pos === undefined) continue;
        if (e.kind === "buy" && !e.text.includes("ไม่ซื้อ")) pushFx(pos, "buy");
        if (e.kind === "build") pushFx(pos, "build");
        if (e.kind === "money" && e.text.includes("ค่าเช่า")) {
          const owner = v.props.find((p) => p.tileIndex === pos)?.ownerSeat;
          if (owner !== undefined) flyCoins(pos, owner, 6);
        }
      }
      if (fresh.some((e) => e.kind === "finish")) play(v.game.winner === v.me ? "win" : "lose");
      else if (fresh.some((e) => e.kind === "jail" && e.text.includes("โดนจับ"))) play("jail");
      else if (fresh.some((e) => e.kind === "build")) play("build");
      else if (fresh.some((e) => e.kind === "buy" && !e.text.includes("ไม่ซื้อ"))) play("buy");
      else if (!rentEv && fresh.some((e) => e.kind === "money" && mine(e) && e.text.includes("ได้รับ") && !e.text.includes("(การ์ด)"))) play("cash");
      else if (!rentEv && fresh.some((e) => e.kind === "money" && mine(e) && e.text.includes("จ่าย") && !e.text.includes("(การ์ด)"))) play("pay");
    })();
    return () => {
      cancelled = true;
      setRolling(false);
      setWalking(false);
      setDisplayPos(finalPos);
      setDiceShown(v.game.dice);
    };
  }, [actionAt]);

  // solo mode: when it is the bot's turn and nothing is animating, let it act after a short pause
  const botTurn = !!view && view.game.status === "playing" && !!view.players[view.game.turn]?.bot;
  const busyNow = rolling || walking || !!burst || !!card;
  useEffect(() => {
    if (!botTurn || busyNow) return;
    const id = setTimeout(() => m.botStep({ token }).catch(() => {}), 1100);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [botTurn, busyNow, view?.game.phase, view?.game.actionAt, token]);

  // auto end-turn: once everything has settled, end the turn by itself, except when the player
  // could still build a house where they stand (then they press build or จบตา themselves).
  // A successful land/house purchase or a build always ends the turn.
  const [autoEnding, setAutoEnding] = useState(false);
  const settled = !!view && view.game.status === "playing" && view.game.turn === view.me && view.game.phase === "end" && !rolling && !walking && !card && !burst && !sheet && !deckSheet && !pendingAction;
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
  const busy = rolling || walking;
  const myTurn = !!view && view.game.turn === view.me && view.game.status === "playing";
  const canRollNow = myTurn && !busy && !pendingAction && !card && ["roll", "jail", "card_roll"].includes(view!.game.phase);

  // Space: in the normal roll phase hold-to-aim drives the gauge; elsewhere a plain roll. Escape closes sheets.
  const [spaceHeld, setSpaceHeld] = useState(false);
  const gaugePhase = canRollNow && view!.game.phase === "roll" && view!.rules.gaugeEnabled;
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
              : view.game.phase === "broke"
                ? "sad"
                : ["buy", "rent", "world_tour", "card_roll"].includes(view.game.phase)
                  ? "think"
                  : "idle";

  const actions = {
    roll: (target?: number) => run(() => m.roll({ token, target }), true),
    buy: (withHouse = false) => run(() => m.buy({ token, withHouse })),
    payRent: (mode: "cash" | "tab") => run(() => m.payRent({ token, mode })),
    payDebt: (amount?: number) => run(() => m.payDebt({ token, amount })),
    build: (tileIndex: number) => run(() => m.build({ token, tileIndex })),
    skipBuy: () => run(() => m.skipBuy({ token })),
    payJail: () => run(() => m.payJail({ token })),
    worldTour: (tileIndex?: number) => run(() => m.worldTour({ token, tileIndex })),
    endTurn: () => run(() => m.endTurn({ token })),
    giveUp: () => {
      if (confirm("ยอมแพ้จริงๆ นะ?")) run(() => m.giveUp({ token }));
    },
    openTile: (i: number) => setSheet(view.tiles.find((t) => t.index === i) ?? null),
  };

  const decisionPhase = ["buy", "rent", "jail", "card_roll", "world_tour"].includes(view.game.phase);
  const showDecision = myTurn && !busy && decisionPhase && !sheet;

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
          tilt={tilt3d ? 14 : 0}
          fx={fx}
          onTileClick={(t) => setSheet(t)}
          onPileClick={(d) => setDeckSheet(d)}
        />
        <CoinFlights flights={flights} />
        {showDecision && <Decision view={view} disabled={pendingAction} actions={actions} />}
        <MoneyBurst burst={burst} onDone={clearBurst} />
      </section>
      <aside className="w-full lg:w-[380px] flex flex-col gap-3 lg:max-h-[calc(100dvh-2rem)]">
        <ActionPanel view={view} busy={busy} pendingAction={pendingAction} actions={actions} spaceHeld={spaceHeld} autoEnding={autoEnding} />
        {error && <div className="rounded-2xl bg-berry/10 border border-berry/30 text-berry text-sm px-3 py-2">{error}</div>}
        <PlayerPanel view={view} onTile={actions.openTile} onPayDebt={actions.payDebt} />
        {view.players.some((p) => p.bot) && (
          <TestPanel
            view={view}
            onBurst={setBurst}
            onFx={pushFx}
            onCard={(deck, text) => { setCard({ deck, text, seat: view.me, at: Date.now() }); play("card"); }}
            onRoll={() => { play("roll"); setRolling(true); setTimeout(() => { setDiceShown([1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)]); setRolling(false); }, 1000); }}
          />
        )}
        <EventLog view={view} className="h-48 lg:flex-1 lg:min-h-0" />
        <div className="flex justify-between items-center gap-1 text-xs text-cocoa/50 px-1 whitespace-nowrap">
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
      />
      <CardToast card={card ?? null} onClose={() => setCard(null)} />
      {deckSheet && <DeckSheet token={token} initial={deckSheet} onClose={() => setDeckSheet(null)} />}

      {view.game.status === "finished" && !busy && (
        <div className="fixed inset-0 z-50 bg-scrim/60 flex items-center justify-center p-6">
          <div className="card p-6 max-w-sm w-full text-center flex flex-col items-center gap-3 pop-in">
            <div className="w-40 h-40">
              <Dimsam mood={view.game.winner === view.me ? "happy" : "sad"} variant={me?.variant} />
            </div>
            <h2 className="text-2xl font-bold text-cocoa">
              {view.game.winner === undefined ? "จบเกม" : `${view.players[view.game.winner]?.name} ชนะ! 🏆`}
            </h2>
            <p className="text-sm text-cocoa/70">
              {view.game.winner === view.me ? "ติ่มซำภูมิใจในตัวคุณมาก" : "ไม่เป็นไร ขอแก้มืออีกรอบ"}
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
