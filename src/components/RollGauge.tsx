import { useCallback, useEffect, useRef, useState } from "react";
import { cx } from "~/lib/format";

const R = 78;
const CX = 100;
const CY = 96;
const SWEEP_MS = 1500; // one way, 2 → 12

function pointAt(p: number) {
  const a = Math.PI + p * Math.PI; // 180° → 360°, across the top
  return { x: CX + R * Math.cos(a), y: CY + R * Math.sin(a) };
}

/**
 * Hold-to-aim dice button. Press and hold: a marker sweeps 2 → 12 → 2.
 * Release: rolls aiming at the number under the marker. A quick tap rolls
 * without aiming. `externalHold` lets a keyboard key drive the same gesture.
 */
export function RollGauge({ disabled, externalHold, onRoll }: { disabled: boolean; externalHold?: boolean; onRoll: (target?: number) => void }) {
  const [aiming, setAiming] = useState(false);
  const [pos, setPos] = useState(0);
  const startRef = useRef(0);
  const rafRef = useRef(0);
  const posRef = useRef(0);

  const start = useCallback(() => {
    if (disabled || aiming) return;
    startRef.current = performance.now();
    setAiming(true);
    const tick = (t: number) => {
      const x = ((t - startRef.current) / SWEEP_MS) % 2;
      const p = x <= 1 ? x : 2 - x;
      posRef.current = p;
      setPos(p);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [disabled, aiming]);

  const stop = useCallback(() => {
    if (!aiming) return;
    cancelAnimationFrame(rafRef.current);
    setAiming(false);
    const held = performance.now() - startRef.current;
    onRoll(held < 160 ? undefined : 2 + Math.round(posRef.current * 10));
  }, [aiming, onRoll]);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);
  useEffect(() => {
    if (externalHold) start();
    else stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalHold]);

  const target = 2 + Math.round(pos * 10);
  const m = pointAt(pos);
  const arc = `M ${pointAt(0).x} ${pointAt(0).y} A ${R} ${R} 0 0 1 ${pointAt(1).x} ${pointAt(1).y}`;

  return (
    <div className="flex flex-col items-center gap-1 select-none">
      <svg viewBox="0 0 200 118" className="w-full max-w-[230px]" aria-hidden>
        <path d={arc} stroke="rgba(107,74,43,.18)" strokeWidth="12" fill="none" strokeLinecap="round" />
        <path d={arc} stroke="url(#rg-grad)" strokeWidth="8" fill="none" strokeLinecap="round" opacity={aiming ? 1 : 0.45} />
        <defs>
          <linearGradient id="rg-grad" x1="0" x2="1">
            <stop offset="0" stopColor="#9ed8f5" />
            <stop offset="0.5" stopColor="#f5c518" />
            <stop offset="1" stopColor="#e2443c" />
          </linearGradient>
        </defs>
        {Array.from({ length: 11 }, (_, i) => {
          const pt = pointAt(i / 10);
          const big = i === 0 || i === 5 || i === 10;
          return (
            <g key={i}>
              <circle cx={pt.x} cy={pt.y} r={big ? 3 : 1.8} fill="#6b4a2b" opacity={0.5} />
              <text x={CX + (R + 14) * Math.cos(Math.PI + (i / 10) * Math.PI)} y={CY + (R + 14) * Math.sin(Math.PI + (i / 10) * Math.PI) + 4} textAnchor="middle" fontSize={big ? 12 : 9} fontWeight={big ? 700 : 500} fill="#6b4a2b" opacity={big ? 0.9 : 0.55} fontFamily="Mitr, sans-serif">
                {i + 2}
              </text>
            </g>
          );
        })}
        {aiming && (
          <>
            <circle cx={m.x} cy={m.y} r="11" fill="#ffd66b" opacity="0.45" />
            <circle cx={m.x} cy={m.y} r="6" fill="#fff" stroke="#e0a458" strokeWidth="2.5" />
          </>
        )}
        <text x={CX} y={CY - 10} textAnchor="middle" fontSize={aiming ? 34 : 13} fontWeight={700} fill={aiming ? "#6b4a2b" : "rgba(107,74,43,.55)"} fontFamily="Mitr, sans-serif">
          {aiming ? target : "กดค้างเพื่อเล็ง"}
        </text>
      </svg>
      <button
        type="button"
        disabled={disabled}
        onPointerDown={(e) => {
          e.preventDefault();
          (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
          start();
        }}
        onPointerUp={stop}
        onPointerCancel={stop}
        onContextMenu={(e) => e.preventDefault()}
        className={cx("btn-primary w-full -mt-4 touch-none", aiming && "translate-y-[2px] shadow-[0_2px_0_#b9803a] bg-[#d9994a]")}
      >
        🎲 {aiming ? `ปล่อยเพื่อทอย ${target}` : "ทอยลูกเต๋า"}
        <kbd className="hidden sm:inline-block ml-2 text-xs font-normal bg-white/25 rounded px-1.5 py-0.5 align-middle">Space ค้าง</kbd>
      </button>
    </div>
  );
}
