import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { api } from "../../convex/_generated/api";
import { Dimsam, DimsamToken } from "~/art/Dimsam";
import { setSession, useSession } from "~/lib/session";
import { cx, errorMessage } from "~/lib/format";
import { ThemeToggle } from "~/components/ThemeToggle";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const session = useSession();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  if (!session?.password) return <Login />;
  return <Lobby password={session.password} />;
}

function Shell({ children, mood = "idle" }: { children: React.ReactNode; mood?: "idle" | "happy" | "think" }) {
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center p-5 gap-4">
      <div className="w-40 h-40 sm:w-52 sm:h-52 drop-shadow-[0_8px_0_rgba(var(--shadow-ink),0.15)]">
        <Dimsam mood={mood} />
      </div>
      <h1 className="text-3xl sm:text-4xl font-bold text-cocoa tracking-tight">Dimsam Monopoly</h1>
      <div className="w-full max-w-sm bg-paper rounded-3xl border-2 border-cocoa/15 shadow-[0_6px_0_rgba(var(--shadow-ink),0.12)] p-5 flex flex-col gap-4">
        {children}
      </div>
      <div className="flex items-center gap-4 text-sm text-cocoa/60">
        <Link to="/settings" className="underline underline-offset-4">
          ตั้งค่ากติกา / แผนที่ / การ์ด
        </Link>
        <ThemeToggle className="text-xs" />
      </div>
    </main>
  );
}

function Login() {
  const [password, setPassword] = useState("");
  const [tried, setTried] = useState<string | null>(null);
  const ok = useQuery(api.game.checkRoom, tried ? { password: tried } : "skip");

  useEffect(() => {
    if (tried && ok === true) setSession({ password: tried });
  }, [tried, ok]);

  const wrong = tried !== null && ok === false;
  return (
    <Shell mood={wrong ? "think" : "idle"}>
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          setTried(password.trim());
        }}
      >
        <label className="text-sm font-medium text-cocoa">รหัสห้อง</label>
        <input
          autoFocus
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-xl border-2 border-cocoa/20 px-4 py-3 text-lg focus:outline-none focus:border-caramel"
          placeholder="••••••"
        />
        {wrong && <p className="text-sm text-berry">รหัสไม่ถูกต้อง ลองใหม่อีกครั้ง</p>}
        <button className="btn-primary" type="submit" disabled={!password.trim() || (tried === password.trim() && ok === undefined)}>
          เข้าห้อง
        </button>
        <p className="text-xs text-cocoa/50">ห้องนี้เป็นห้องส่วนตัว ใช้รหัสเดียวกันทั้งสองคน</p>
      </form>
    </Shell>
  );
}

function Lobby({ password }: { password: string }) {
  const session = useSession();
  const navigate = useNavigate();
  const lobby = useQuery(api.game.lobby, { password });
  const resumed = useQuery(api.game.resume, session?.token ? { token: session.token } : "skip");
  const join = useMutation(api.game.join);
  const leave = useMutation(api.game.leave);
  const start = useMutation(api.game.start);
  const addBot = useMutation(api.game.addBot);
  const [name, setName] = useState(session?.name ?? "");
  const [variant, setVariant] = useState<"blue" | "pink">(session?.variant ?? "blue");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (resumed?.status === "playing" || resumed?.status === "finished") navigate({ to: "/game" });
  }, [resumed, navigate]);

  if (lobby === undefined) return <Shell>กำลังเชื่อมต่อ…</Shell>;
  const mySeat = resumed ? resumed.seat : null;
  const players = lobby.players;
  const both = players.length === 2;

  async function takeSeat(seat: number) {
    setError(null);
    setBusy(true);
    try {
      const res = await join({ password, seat, name, variant });
      setSession({ token: res.token, name, variant });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell mood={both ? "happy" : "idle"}>
      {mySeat === null ? (
        <>
          <label className="text-sm font-medium text-cocoa">ชื่อของคุณ</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={20}
            className="rounded-xl border-2 border-cocoa/20 px-4 py-3 text-lg focus:outline-none focus:border-caramel"
            placeholder="เช่น ปอ"
          />
          <div className="flex gap-3">
            {(["blue", "pink"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setVariant(v)}
                className={cx(
                  "flex-1 rounded-2xl border-2 p-2 flex flex-col items-center gap-1 transition",
                  variant === v ? "border-caramel bg-cream-2" : "border-cocoa/15 bg-paper",
                )}
              >
                <div className="w-16 h-16">
                  <DimsamToken variant={v} />
                </div>
                <span className="text-xs text-cocoa/70">{v === "blue" ? "ปลอกคอฟ้า" : "โบว์ชมพู"}</span>
              </button>
            ))}
          </div>
        </>
      ) : null}

      <div className="flex flex-col gap-2">
        {[0, 1].map((seat) => {
          const p = players.find((x) => x.seat === seat);
          const mine = mySeat === seat;
          return (
            <div
              key={seat}
              className={cx(
                "rounded-2xl border-2 px-4 py-3 flex items-center gap-3",
                mine ? "border-caramel bg-cream-2" : "border-cocoa/15",
              )}
            >
              <div className="w-10 h-10 shrink-0">{p ? <DimsamToken variant={p.variant} /> : <div className="w-10 h-10 rounded-full border-2 border-dashed border-cocoa/30" />}</div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{p ? p.name : `ที่นั่ง ${seat + 1} ว่าง`}</div>
                <div className="text-xs text-cocoa/60">{p ? (p.bot ? "🤖 บอท" : p.online ? "ออนไลน์" : "ออฟไลน์") : "แตะเพื่อนั่ง"}</div>
              </div>
              {!p && mySeat === null && (
                <button className="btn-secondary" disabled={busy || !name.trim()} onClick={() => takeSeat(seat)}>
                  นั่งตรงนี้
                </button>
              )}
              {mine && (
                <button
                  className="text-xs text-cocoa/60 underline"
                  onClick={async () => {
                    await leave({ token: session!.token });
                    setSession({ token: "" });
                  }}
                >
                  ลุกออก
                </button>
              )}
            </div>
          );
        })}
      </div>

      {error && <p className="text-sm text-berry">{error}</p>}

      {mySeat !== null && !both && (
        <button
          className="btn-secondary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError(null);
            try {
              await addBot({ token: session!.token });
            } catch (e) {
              setError(errorMessage(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          🤖 เล่นคนเดียวกับบอท (โหมดทดสอบ)
        </button>
      )}
      {mySeat !== null && (
        <button
          className="btn-primary"
          disabled={!both || busy}
          onClick={async () => {
            setBusy(true);
            setError(null);
            try {
              await start({ token: session!.token });
              navigate({ to: "/game" });
            } catch (e) {
              setError(errorMessage(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          {both ? "เริ่มเกม!" : "รออีกคนนั่งก่อน…"}
        </button>
      )}
      <button className="text-xs text-cocoa/50 underline self-center" onClick={() => setSession(null)}>
        ออกจากห้อง
      </button>
    </Shell>
  );
}
