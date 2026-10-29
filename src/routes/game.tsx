import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../convex/_generated/api";
import type { DimsamMood } from "~/art/Dimsam";
import { Dimsam } from "~/art/Dimsam";
import { Board } from "~/components/Board";
import { ActionPanel } from "~/components/ActionPanel";
import { PlayerPanel } from "~/components/PlayerPanel";
import { EventLog } from "~/components/EventLog";
import { CardToast } from "~/components/CardToast";
import { TileSheet } from "~/components/TileSheet";
import type { GameView, TileView } from "~/lib/game";
import { setSession, useSession } from "~/lib/session";
import { errorMessage } from "~/lib/format";
import { isMuted, play, setMuted, unlockAudio } from "~/lib/sound";
import { useHotkey } from "@tanstack/react-hotkeys";

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
    payJail: useMutation(api.game.payJail),
    worldTour: useMutation(api.game.worldTour),
    build: useMutation(api.game.build),
    sellHouse: useMutation(api.game.sellHouse),
    sellLand: useMutation(api.game.sellLand),
    endTurn: useMutation(api.game.endTurn),
    giveUp: useMutation(api.game.giveUp),
    newGame: useMutation(api.game.newGame),
    heartbeat: useMutation(api.game.heartbeat),
  };

  const [displayPos, setDisplayPos] = useState<number[]>([]);
  const [hop, setHop] = useState(0);
  const [rolling, setRolling] = useState(false);
  const [walking, setWalking] = useState(false);
  const [diceShown, setDiceShown] = useState<number[]>([1, 1]);
  const [card, setCard] = useState<GameView["game"]["lastCard"] | null>(null);
  const [sheet, setSheet] = useState<TileView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState(false);
  const lastActionRef = useRef<number | null>(null);
  const [muted, setMutedState] = useState(false);
  useEffect(() => {
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
      // outcome sounds, once the piece has arrived
      const mine = (e: { seat?: number }) => e.seat === v.me;
      if (fresh.some((e) => e.kind === "finish")) play(v.game.winner === v.me ? "win" : "lose");
      else if (fresh.some((e) => e.kind === "jail" && e.text.includes("โดนจับ"))) play("jail");
      else if (fresh.some((e) => e.kind === "build")) play("build");
      else if (fresh.some((e) => e.kind === "buy" && !e.text.includes("ไม่ซื้อ"))) play("buy");
      else if (fresh.some((e) => e.kind === "money" && mine(e) && e.text.includes("ได้รับ"))) play("cash");
      else if (fresh.some((e) => e.kind === "money" && mine(e) && e.text.includes("จ่าย"))) play("pay");
    })();
    return () => {
      cancelled = true;
      setRolling(false);
      setWalking(false);
      setDisplayPos(finalPos);
      setDiceShown(v.game.dice);
    };
  }, [actionAt]);

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

  // Space = roll (only when it's actually your turn to roll); Escape closes sheets
  useHotkey("Space", () => run(() => m.roll({ token }), true), { enabled: canRollNow });
  useHotkey("Escape", () => { setSheet(null); setCard(null); }, { enabled: !!sheet || !!card });

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
              : view.game.phase === "debt"
                ? "sad"
                : ["buy", "world_tour", "card_roll"].includes(view.game.phase)
                  ? "think"
                  : "idle";

  const actions = {
    roll: () => run(() => m.roll({ token }), true),
    buy: (withHouse = false) => run(() => m.buy({ token, withHouse })),
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

  return (
    <main className="min-h-dvh p-2 sm:p-4 flex flex-col lg:flex-row gap-3 max-w-[1400px] mx-auto">
      <section className="w-full lg:flex-1 lg:max-w-[min(100%,calc(100dvh-2rem))] mx-auto">
        <Board
          view={view}
          displayPos={displayPos}
          hop={hop}
          mood={mood}
          dice={diceShown}
          rolling={rolling}
          animate
          onTileClick={(t) => setSheet(t)}
        />
      </section>
      <aside className="w-full lg:w-[380px] flex flex-col gap-3 lg:max-h-[calc(100dvh-2rem)]">
        <ActionPanel view={view} busy={busy} pendingAction={pendingAction} actions={actions} />
        {error && <div className="rounded-2xl bg-berry/10 border border-berry/30 text-berry text-sm px-3 py-2">{error}</div>}
        <PlayerPanel view={view} onTile={actions.openTile} />
        <EventLog view={view} className="h-48 lg:flex-1 lg:min-h-0" />
        <div className="flex justify-between items-center text-xs text-cocoa/50 px-1">
          <Link to="/settings">ตั้งค่า</Link>
          <button
            className="px-2 py-1 rounded-lg border border-cocoa/20"
            onClick={() => {
              const next = !muted;
              setMuted(next);
              setMutedState(next);
              if (!next) play("tap");
            }}
          >
            {muted ? "🔇 ปิดเสียงอยู่" : "🔊 เสียงเปิด"}
          </button>
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

      {view.game.status === "finished" && !busy && (
        <div className="fixed inset-0 z-50 bg-cocoa-2/50 flex items-center justify-center p-6">
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
