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

function Face({ n }: { n: number }) {
  return (
    <div className="grid grid-cols-3 grid-rows-3 w-full h-full p-[14%] gap-[4%]">
      {[0, 1, 2].flatMap((r) =>
        [0, 1, 2].map((c) => {
          const on = PIPS[n]?.some(([pr, pc]) => pr === r && pc === c);
          return <span key={`${r}${c}`} className={cx("rounded-full bg-cocoa-2", on ? "opacity-100" : "opacity-0")} />;
        }),
      )}
    </div>
  );
}

/**
 * Two dice. `rolling` plays a tumble animation; when it stops the faces show
 * `values`. `size` is the cube edge in px.
 */
export function Dice({ values, rolling, size = 56 }: { values: number[]; rolling: boolean; size?: number }) {
  const [shown, setShown] = useState(values);
  useEffect(() => {
    if (!rolling) setShown(values);
  }, [rolling, values]);
  return (
    <div className="flex gap-3 items-center justify-center">
      {[0, 1].map((i) => (
        <div
          key={i}
          style={{ width: size, height: size, animationDelay: `${i * 90}ms` }}
          className={cx(
            "rounded-[18%] bg-white border-[3px] border-cocoa/80 shadow-[0_4px_0_rgba(107,74,43,0.35)]",
            rolling && "dice-tumble",
          )}
        >
          <Face n={rolling ? ((Date.now() / 90 + i * 2) | 0) % 6 + 1 : shown[i] ?? 1} />
        </div>
      ))}
    </div>
  );
}
