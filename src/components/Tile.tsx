import { memo } from "react";
import { TILE_ART, ART_BY_TYPE } from "~/art/tiles";
import { DimsamPaw } from "~/art/Dimsam";
import type { TileFx } from "./Board";
import type { PlayerView, PropView, TileView } from "~/lib/game";
import { cx, gridPos, GROUP_COLORS } from "~/lib/format";

const VARIANT_COLOR = { blue: "#4fa7e8", pink: "#f06aa8" } as const;

export const Tile = memo(function Tile({
  tile,
  prop,
  owner,
  highlight,
  steps,
  animate,
  fx,
  onClick,
}: {
  tile: TileView;
  prop?: PropView;
  owner?: PlayerView;
  highlight?: boolean;
  /** steps forward from the player's piece (0 = standing here) */
  steps?: number;
  animate: boolean;
  fx?: TileFx;
  onClick: () => void;
}) {
  const pos = gridPos(tile.index);
  const Art = TILE_ART[tile.index] ?? ART_BY_TYPE[tile.type];
  const band = tile.group ? GROUP_COLORS[tile.group] : undefined;
  const ownerColor = owner ? VARIANT_COLOR[owner.variant] : undefined;
  const horizontal = pos.side === "left" || pos.side === "right";

  return (
    <button
      type="button"
      data-tile={tile.index}
      onClick={onClick}
      style={{ gridRow: pos.row, gridColumn: pos.col, ["--owner" as string]: ownerColor }}
      className={cx(
        "tile relative bg-paper border border-cocoa/25 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-caramel",
        "flex min-w-0 min-h-0",
        fx?.kind === "land" && "tile-land",
        fx?.kind === "buy" && "tile-buy",
        fx?.kind === "build" && "tile-build",
        pos.corner && "rounded-xl",
        !pos.corner && pos.side === "bottom" && "flex-col",
        !pos.corner && pos.side === "top" && "flex-col-reverse",
        !pos.corner && pos.side === "left" && "flex-row-reverse",
        !pos.corner && pos.side === "right" && "flex-row",
        highlight && "ring-2 ring-caramel z-[1]",
        owner && "shadow-[inset_0_0_0_2px_var(--owner)]",
      )}
    >
      {band && !pos.corner && (
        <div
          style={{ background: band }}
          className={cx("shrink-0 relative", horizontal ? "w-[14%] h-full" : "h-[14%] w-full")}
        >
          {prop && (prop.houses > 0 || prop.landmark) && (
            <div className={cx("absolute inset-0 flex items-center justify-center gap-[3px]", horizontal && "flex-col")}>
              {prop.landmark ? (
                <span key={`lm-${fx?.kind === "build" ? fx.key : 0}`} className={cx("landmark3d", fx?.kind === "build" && "house-drop")} />
              ) : (
                Array.from({ length: prop.houses }).map((_, i) => (
                  <span
                    key={i === prop.houses - 1 && fx?.kind === "build" ? `h-${fx.key}` : i}
                    className={cx("house3d", i === prop.houses - 1 && fx?.kind === "build" && "house-drop")}
                  />
                ))
              )}
            </div>
          )}
        </div>
      )}
      <div className={cx("flex-1 min-w-0 min-h-0 flex", horizontal ? "flex-row items-center" : "flex-col")}>
        <div className={cx("min-w-0 min-h-0", pos.corner ? "flex-1" : horizontal ? "h-full aspect-square shrink-0 sm:h-[86%] sm:self-center" : "flex-1 w-full")}>
          {Art && <Art animate={animate} />}
        </div>
        {!pos.corner && (
          <div
            style={horizontal ? { writingMode: "vertical-rl", transform: pos.side === "left" ? "rotate(180deg)" : undefined } : undefined}
            className={cx(
              "hidden sm:flex flex-col justify-center leading-[1.05] min-w-0 min-h-0 overflow-hidden",
              horizontal ? "flex-1 h-full px-[2px] items-center" : "pb-[3px] px-[3px] text-center",
            )}
          >
            <span className="text-[8px] md:text-[9px] font-medium text-cocoa-2 line-clamp-2">{tile.name}</span>
            {tile.price ? <span className="text-[8px] text-cocoa/60 tabular-nums">{tile.price.toLocaleString()}</span> : null}
          </div>
        )}
      </div>
      {!!steps && (
        <span
          className={cx(
            "absolute left-[1px] top-[1px] min-w-[1.5em] rounded-md px-[2px] text-center text-[clamp(8px,1.4vw,12px)] font-bold leading-[1.4] tabular-nums pointer-events-none",
            steps >= 2 && steps <= 12 ? "bg-cocoa text-paper" : "bg-paper/80 text-cocoa/60",
          )}
        >
          {steps}
        </span>
      )}
      {owner && (
        <span
          style={{ background: ownerColor }}
          className="absolute right-[2px] bottom-[2px] w-[9px] h-[9px] rounded-full border border-white shadow"
        />
      )}
      {fx?.kind === "land" && (
        <span key={`s-${fx.key}`} className="sparkles" aria-hidden>
          {Array.from({ length: 8 }).map((_, i) => (
            <i key={i} style={{ ["--a" as string]: `${i * 45}deg` }} />
          ))}
        </span>
      )}
      {fx?.kind === "buy" && (
        <span key={`b-${fx.key}`} className="bought" aria-hidden>
          <span className="stamp" style={{ color: ownerColor ?? "#e0a458" }}>
            <DimsamPaw />
          </span>
          {Array.from({ length: 14 }).map((_, i) => (
            <i
              key={i}
              style={{
                ["--dx" as string]: `${Math.cos((i / 14) * Math.PI * 2) * (44 + (i % 3) * 22)}px`,
                ["--dy" as string]: `${-60 - (i % 4) * 22}px`,
                ["--c" as string]: ["#f7c59f", "#f06aa8", "#4fa7e8", "#f5c518", "#5cb85c", "#a26be0"][i % 6],
                ["--d" as string]: `${(i % 5) * 40}ms`,
              }}
            />
          ))}
        </span>
      )}
    </button>
  );
});
