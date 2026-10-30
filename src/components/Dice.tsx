import { useEffect, useState } from "react";
import { cx } from "~/lib/format";

const PIPS: Record<number, [number, number][]> = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [0, 2], [2, 0], [2, 2]],
  5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
  6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]],
};

function Face({ n, size, transform }: { n: number; size: number; transform: string }) {
  return (
    <div
      className="absolute inset-0 grid grid-cols-3 grid-rows-3 bg-white rounded-[18%] border-[2px] border-cocoa/70"
      style={{ transform, backfaceVisibility: "hidden", padding: size * 0.14, gap: size * 0.04 }}
    >
      {[0, 1, 2].flatMap((r) =>
        [0, 1, 2].map((c) => {
          const on = PIPS[n]?.some(([pr, pc]) => pr === r && pc === c);
          return <span key={`${r}${c}`} className={cx("rounded-full bg-[#4a3119]", on ? "opacity-100" : "opacity-0")} />;
        }),
      )}
    </div>
  );
}

// Orientation that brings face `v` to the front. Opposite faces add up to 7.
const SHOW: Record<number, string> = {
  1: "rotateX(0deg) rotateY(0deg)",
  6: "rotateX(0deg) rotateY(180deg)",
  3: "rotateX(0deg) rotateY(-90deg)",
  4: "rotateX(0deg) rotateY(90deg)",
  2: "rotateX(-90deg) rotateY(0deg)",
  5: "rotateX(90deg) rotateY(0deg)",
};

/** Real 3D cube dice. While `rolling` they tumble; afterwards they settle on `values`. */
export function Dice({ values, rolling, size = 56 }: { values: number[]; rolling: boolean; size?: number }) {
  const [shown, setShown] = useState(values);
  const [spins, setSpins] = useState(0);
  useEffect(() => {
    if (!rolling) setShown(values);
    else setSpins((s) => s + 1);
  }, [rolling, values]);
  const h = size / 2;
  const faces = (
    <>
      <Face n={1} size={size} transform={`translateZ(${h}px)`} />
      <Face n={6} size={size} transform={`rotateY(180deg) translateZ(${h}px)`} />
      <Face n={3} size={size} transform={`rotateY(90deg) translateZ(${h}px)`} />
      <Face n={4} size={size} transform={`rotateY(-90deg) translateZ(${h}px)`} />
      <Face n={2} size={size} transform={`rotateX(90deg) translateZ(${h}px)`} />
      <Face n={5} size={size} transform={`rotateX(-90deg) translateZ(${h}px)`} />
    </>
  );
  return (
    <div className="flex gap-3 items-center justify-center" style={{ perspective: size * 9 }}>
      {[0, 1].map((i) => (
        <div
          key={i}
          className={cx("relative", rolling && "dice-bounce")}
          style={{ width: size, height: size, animationDelay: `${i * 70}ms` }}
        >
          <div
            className={cx("absolute inset-0", rolling && "dice-spin")}
            style={{
              transformStyle: "preserve-3d",
              transform: rolling ? undefined : `${SHOW[shown[i] ?? 1]} rotateZ(${((spins * 37 + i * 23) % 14) - 7}deg)`,
              transition: rolling ? "none" : "transform 0.55s cubic-bezier(.2,.9,.3,1.05)",
              animationDelay: `${i * 120}ms`,
            }}
          >
            {faces}
          </div>
          <div className="absolute left-[10%] right-[10%] -bottom-[14%] h-[16%] rounded-full bg-scrim/30 blur-[2px]" style={{ transform: "translateZ(-1px)" }} />
        </div>
      ))}
    </div>
  );
}
