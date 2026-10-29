import { memo } from "react";
import { TILE_ART, ART_BY_TYPE } from "~/art/tiles";
import type { PlayerView, PropView, TileView } from "~/lib/game";
import { cx, gridPos, GROUP_COLORS } from "~/lib/format";

const VARIANT_COLOR = { blue: "#4fa7e8", pink: "#f06aa8" } as const;

export const Tile = memo(function Tile({
  tile,
  prop,
  owner,
  highlight,
  animate,
  onClick,
}: {
  tile: TileView;
  prop?: PropView;
  owner?: PlayerView;
  highlight?: boolean;
  animate: boolean;
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
      onClick={onClick}
      style={{ gridRow: pos.row, gridColumn: pos.col, ["--owner" as string]: ownerColor }}
      className={cx(
        "relative overflow-hidden bg-white border border-cocoa/25 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-caramel",
        "flex min-w-0 min-h-0",
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
            <div className={cx("absolute inset-0 flex items-center justify-center gap-[2px]", horizontal && "flex-col")}>
              {prop.landmark ? (
                <span className="block w-[70%] aspect-square max-w-[14px] rounded-sm bg-white border border-cocoa/60 rotate-45 scale-75" />
              ) : (
                Array.from({ length: prop.houses }).map((_, i) => (
                  <span key={i} className="block w-[22%] aspect-square max-w-[9px] rounded-[2px] bg-white border border-cocoa/60" />
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
      {owner && (
        <span
          style={{ background: ownerColor }}
          className="absolute right-[2px] bottom-[2px] w-[9px] h-[9px] rounded-full border border-white shadow"
        />
      )}
    </button>
  );
});
