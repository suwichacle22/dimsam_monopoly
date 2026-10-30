import { useEffect, useState } from "react";
import { Dimsam } from "~/art/Dimsam";
import { baht, cx } from "~/lib/format";

export type Burst = { id: number; amount: number; label: string; variant: "blue" | "pink" } | null;

/** Full-screen celebration (prize) or wince (penalty) when a card moves money. */
export function MoneyBurst({ burst, onDone }: { burst: Burst; onDone: () => void }) {
  const [shown, setShown] = useState<Burst>(null);
  useEffect(() => {
    if (!burst) return;
    setShown(burst);
    const t = setTimeout(() => {
      setShown(null);
      onDone();
    }, 2300);
    return () => clearTimeout(t);
  }, [burst, onDone]);
  if (!shown) return null;
  const win = shown.amount > 0;
  return (
    <div className={cx("fixed inset-0 z-[60] pointer-events-none flex items-center justify-center", win ? "burst-win" : "burst-lose")}>
      <div className={cx("absolute inset-0 backdrop-blur-[2px]", win ? "bg-[#ffd66b]/30" : "bg-[#d9487e]/25")} />
      {/* raining coins (prize) or coins flying away (penalty) */}
      {Array.from({ length: 22 }).map((_, i) => (
        <span
          key={i}
          className={cx("burst-coin", win ? "coin-rain" : "coin-fly")}
          style={{
            left: `${(i * 37 + 11) % 100}%`,
            animationDelay: `${(i % 7) * 110}ms`,
            animationDuration: `${1.3 + (i % 4) * 0.25}s`,
            ["--spin" as string]: `${(i % 2 ? 1 : -1) * (360 + (i % 3) * 180)}deg`,
          }}
        />
      ))}
      {!win &&
        Array.from({ length: 6 }).map((_, i) => (
          <span key={`t${i}`} className="burst-tear" style={{ left: `${35 + i * 6}%`, animationDelay: `${i * 160}ms` }} />
        ))}
      <div className="relative flex flex-col items-center gap-1">
        <div className={cx("w-40 h-40 sm:w-56 sm:h-56", win ? "mascot-cheer" : "mascot-wince")}>
          <Dimsam mood={win ? "happy" : "sad"} variant={shown.variant} />
        </div>
        <div
          className={cx("amount-pop font-bold tabular-nums", win ? "text-[#2e8b2e]" : "text-berry")}
          style={{ fontSize: "clamp(44px, 9vw, 84px)", lineHeight: 1, WebkitTextStroke: "2px #fff", paintOrder: "stroke fill", textShadow: "0 4px 0 rgba(0,0,0,.15)" }}
        >
          {win ? "+" : "-"}
          {baht(Math.abs(shown.amount))}
        </div>
        <div className="amount-pop bg-white/90 rounded-full px-4 py-1 text-cocoa font-semibold text-sm sm:text-base shadow" style={{ animationDelay: "120ms" }}>
          {shown.label}
        </div>
      </div>
    </div>
  );
}
