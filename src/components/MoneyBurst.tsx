import { useEffect, useState } from "react";
import { Dimsam } from "~/art/Dimsam";
import { baht, cx } from "~/lib/format";

export type Burst = {
  id: number;
  amount: number;
  label: string;
  variant: "blue" | "pink";
  /** card title, e.g. หีบขนม / ค่าเช่า */
  kicker: string;
  /** optional second line, e.g. who received the rent */
  detail?: string;
} | null;

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
      <div
        className={cx(
          "burst-card relative w-[86%] max-w-[380px] rounded-3xl border-[3px] overflow-hidden flex flex-col items-center gap-1 px-5 pt-3 pb-5",
          win ? "bg-[#fff8e1] border-[#f5c518] shadow-[0_10px_0_#d9a900,0_24px_60px_rgba(74,49,25,.4)]" : "bg-[#fff0f4] border-berry shadow-[0_10px_0_#a22d5a,0_24px_60px_rgba(74,49,25,.4)]",
        )}
      >
        <div className={cx("self-stretch -mx-5 -mt-3 mb-1 py-2 text-center font-bold text-white text-base sm:text-lg tracking-wide", win ? "bg-[#f5c518] text-[#5a4500]" : "bg-berry")}>
          {shown.kicker}
        </div>
        <div className={cx("w-36 h-36 sm:w-48 sm:h-48", win ? "mascot-cheer" : "mascot-wince")}>
          <Dimsam mood={win ? "happy" : "sad"} variant={shown.variant} />
        </div>
        <div
          className={cx("amount-pop font-bold tabular-nums", win ? "text-[#2e8b2e]" : "text-berry")}
          style={{ fontSize: "clamp(40px, 8vw, 64px)", lineHeight: 1, textShadow: "0 4px 0 rgba(0,0,0,.12)" }}
        >
          {win ? "+" : "-"}
          {baht(Math.abs(shown.amount))}
        </div>
        <div className="amount-pop text-cocoa font-semibold text-base sm:text-lg text-center" style={{ animationDelay: "120ms" }}>
          {shown.label}
        </div>
        {shown.detail && (
          <div className="amount-pop text-cocoa/70 text-sm text-center" style={{ animationDelay: "200ms" }}>
            {shown.detail}
          </div>
        )}
      </div>
    </div>
  );
}
