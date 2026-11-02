import { Dimsam, DimsamToken } from "~/art/Dimsam";
import * as C from "~/art/tiles/setC";
import type { DimsamMood } from "~/art/Dimsam";
import type { GameView, TileView } from "~/lib/game";
import { propAt } from "~/lib/game";
import { cx, gridPos } from "~/lib/format";
import { Tile } from "./Tile";
import { Dice } from "./Dice";

function unitStart(c: number) {
  return c === 1 ? 0 : 1.5 + (c - 2);
}
function unitWidth(c: number) {
  return c === 1 || c === 11 ? 1.5 : 1;
}
/** Centre of a tile as % of the board. */
export function tileCenter(index: number): { x: number; y: number } {
  const p = gridPos(index);
  return {
    x: ((unitStart(p.col) + unitWidth(p.col) / 2) / 12) * 100,
    y: ((unitStart(p.row) + unitWidth(p.row) / 2) / 12) * 100,
  };
}

export type TileFx = { index: number; kind: "land" | "buy" | "build"; key: number };
/** one-shot badge popping out of a tile, e.g. "+2,000 ผ่านบ้าน" */
export type Callout = { index: number; text: string; sub?: string; tone?: "win" | "lose"; key: number };

const PIECE_COLOR = { blue: "#4fa7e8", pink: "#f06aa8" } as const;
/** highest two-dice total, the furthest a single roll can reach */
const MAX_STEPS = 12;

export function Board({
  view,
  displayPos,
  hop,
  mood,
  dice,
  rolling,
  animate,
  resultHidden = false,
  stepsFrom,
  overlay,
  tilt = 0,
  fx = [],
  callout,
  onTileClick,
  onPileClick,
}: {
  view: GameView;
  displayPos: number[];
  hop: number;
  mood: DimsamMood;
  dice: number[];
  rolling: boolean;
  animate: boolean;
  /** the latest action is still playing out: don't mark the tile it ends on yet */
  resultHidden?: boolean;
  /** whose piece and tile the 1–12 step numbers count from; undefined hides them */
  stepsFrom?: { seat: number; tile: number };
  /** replaces the mascot with a decision card (buy, jail, …) */
  overlay?: React.ReactNode;
  /** 3D tilt of the board in degrees (0 = flat) */
  tilt?: number;
  /** one-shot tile effects (landing pop, bought stamp, house drop) */
  fx?: TileFx[];
  callout?: Callout | null;
  onTileClick: (tile: TileView) => void;
  onPileClick?: (deck: "treasure" | "special") => void;
}) {
  const me = view.players.find((p) => p.seat === view.me);
  const current = view.players[view.game.turn];
  return (
    <div className="board-stage relative w-full aspect-square select-none" style={{ perspective: tilt ? "1600px" : undefined }}>
      <div
        className="board-tilt relative w-full h-full"
        style={{
          transform: tilt ? `rotateX(${tilt}deg)` : undefined,
          transformStyle: tilt ? "preserve-3d" : undefined,
          transition: "transform 0.6s cubic-bezier(.2,.8,.2,1)",
          ["--tilt" as string]: `${tilt}deg`,
        }}
      >
      <div
        className={cx("grid w-full h-full bg-cream-2 rounded-2xl border-2 border-cocoa/30 shadow-[0_8px_0_rgba(var(--shadow-ink),0.12)]", tilt ? "board-3d" : "overflow-hidden")}
        style={{ gridTemplateColumns: "1.5fr repeat(9, 1fr) 1.5fr", gridTemplateRows: "1.5fr repeat(9, 1fr) 1.5fr", transformStyle: tilt ? "preserve-3d" : undefined }}
      >
        {view.tiles.map((tile) => {
          const prop = propAt(view, tile.index);
          const owner = prop ? view.players.find((p) => p.seat === prop.ownerSeat) : undefined;
          return (
            <Tile
              key={tile.index}
              tile={tile}
              prop={prop}
              owner={owner}
              animate={animate}
              highlight={!resultHidden && view.game.pending?.kind === "buy" && view.game.pending.tileIndex === tile.index}
              fx={fx.find((f) => f.index === tile.index)}
              onClick={() => onTileClick(tile)}
            />
          );
        })}

        {/* centre */}
        <div style={{ gridRow: "2 / 11", gridColumn: "2 / 11" }} className={cx("relative flex flex-col items-center justify-between overflow-hidden", stepsFrom !== undefined ? "px-[6%] pt-[6%] pb-[11%]" : "p-[4%]")}>
          <div className="absolute inset-0 opacity-[0.07] pointer-events-none" aria-hidden>
            <PawField />
          </div>
          <div className={cx("text-center z-[1]", !!overlay && "hidden sm:block")}>
            <div className="font-bold text-cocoa text-[clamp(14px,3.2vw,30px)] leading-none tracking-tight">Dimsam Monopoly</div>
            <div className="text-cocoa/60 text-[clamp(9px,1.6vw,13px)] mt-1">
              {view.game.status === "playing" ? `ตาของ ${current?.name ?? ""}` : "จบเกมแล้ว"}
            </div>
          </div>
          {overlay ? (
            <div className="relative z-[2] flex-1 min-h-0 w-full flex items-center justify-center py-1">{overlay}</div>
          ) : (
            <div className="mascot relative z-[1] w-[46%] max-w-[260px] aspect-square">
              <Dimsam mood={mood} variant={me?.variant ?? "blue"} animate={animate} />
            </div>
          )}
          <div className={cx("z-[1] flex items-end justify-between w-full gap-2", !!overlay && "hidden sm:flex")}>
            <Pile count={view.game.treasureCount} label="หีบขนม" onClick={() => onPileClick?.("treasure")}>
              <C.TileTreasure animate={false} />
            </Pile>
            <Dice values={dice} rolling={rolling} size={44} />
            <Pile count={view.game.specialCount} label="ถุงของเล่น" onClick={() => onPileClick?.("special")}>
              <C.TileToyBag animate={false} />
            </Pile>
          </div>
        </div>
      </div>

      {/* step numbers sit just inside the ring of tiles, beside each tile instead of on its art */}
      {stepsFrom !== undefined &&
        Array.from({ length: MAX_STEPS }, (_, i) => {
          const index = (stepsFrom.tile + i + 1) % view.tiles.length;
          const c = tileCenter(index);
          // corners step diagonally inward, clear of the numbers beside them
          const inset = gridPos(index).corner ? 18.5 : 13.8;
          return (
            <span
              key={i}
              aria-hidden
              className="absolute z-[2] -translate-x-1/2 -translate-y-1/2 min-w-[1.6em] rounded-full text-[#2a1d14] text-center text-[clamp(9px,1.6vw,14px)] font-bold leading-[1.5] tabular-nums pointer-events-none"
              style={{ left: `${Math.min(100 - inset, Math.max(inset, c.x))}%`, top: `${Math.min(100 - inset, Math.max(inset, c.y))}%`, background: PIECE_COLOR[view.players[stepsFrom.seat].variant] }}
            >
              {i + 1}
            </span>
          );
        })}

      {callout && (() => {
        const c = tileCenter(callout.index);
        // keep the badge inside the board when the tile is a corner
        const x = Math.min(78, Math.max(22, c.x));
        const y = Math.min(96, Math.max(14, c.y));
        return (
          <div
            key={callout.key}
            className="callout absolute pointer-events-none z-[7]"
            style={{ left: `${x}%`, top: `${y}%`, transform: tilt ? `rotateX(calc(-1 * var(--tilt)))` : undefined, transformOrigin: "50% 100%" }}
          >
            <div className={cx("callout-card", callout.tone === "lose" && "callout-lose")}>
              <div className="callout-amount">{callout.text}</div>
              {callout.sub && <div className="callout-sub">{callout.sub}</div>}
            </div>
          </div>
        );
      })()}

      {/* pieces (stand upright when the board is tilted) */}
      {view.players.map((p) => {
        const pos = displayPos[p.seat] ?? p.position;
        const c = tileCenter(pos);
        const other = view.players.find((o) => o.seat !== p.seat);
        const shared = other && (displayPos[other.seat] ?? other.position) === pos;
        const dx = shared ? (p.seat === 0 ? -1.6 : 1.6) : 0;
        const dy = shared ? (p.seat === 0 ? -1.2 : 1.2) : 0;
        const color = PIECE_COLOR[p.variant];
        const active = view.game.status === "playing" && view.game.turn === p.seat;
        const isMe = p.seat === view.me;
        return (
          <div
            key={p.seat}
            className="absolute pointer-events-none"
            style={{
              left: `${c.x + dx}%`,
              top: `${c.y + dy}%`,
              width: "8.2%",
              maxWidth: 68,
              zIndex: active ? 4 : 3,
              transform: "translate(-50%, -62%)",
              transition: "left 0.22s ease-in-out, top 0.22s ease-in-out",
              ["--piece" as string]: color,
            }}
          >
            <div
              style={{ transform: tilt ? `rotateX(calc(-1 * var(--tilt))) translateZ(6px)` : undefined, transformOrigin: "50% 100%" }}
            >
              {/* coloured halo on the tile + pulsing ring for the player whose turn it is */}
              <div className={cx("piece-halo", active && "piece-halo-active")} />
              <div className={cx("piece-tag", isMe && "piece-tag-me")}>{isMe ? "คุณ" : p.name}</div>
              <div key={hop} className={cx("token-hop piece-body w-full aspect-square", p.bankrupt && "opacity-30 grayscale")}>
                <DimsamToken variant={p.variant} animate={animate} />
              </div>
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
}

function Pile({ children, count, label, onClick }: { children: React.ReactNode; count: number; label: string; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex flex-col items-center w-[22%] max-w-[90px] active:translate-y-[1px] focus:outline-none" title="ดูการ์ดในกอง">
      <div className="relative w-full aspect-square">
        <div className="absolute inset-0 translate-x-[4%] translate-y-[4%] rounded-lg bg-paper border border-cocoa/30" />
        <div className="absolute inset-0 translate-x-[2%] translate-y-[2%] rounded-lg bg-paper border border-cocoa/30" />
        <div className="absolute inset-0 rounded-lg bg-paper border border-cocoa/40 overflow-hidden">{children}</div>
      </div>
      <span className="text-[clamp(8px,1.3vw,11px)] text-cocoa/60 mt-1">
        {label} เหลือ {count}
      </span>
    </button>
  );
}

function PawField() {
  const paws = Array.from({ length: 12 }, (_, i) => ({ x: (i * 37) % 100, y: (i * 53 + 20) % 100, r: (i * 47) % 360 }));
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      {paws.map((p, i) => (
        <g key={i} transform={`translate(${p.x} ${p.y}) rotate(${p.r}) scale(0.5)`} className="fill-cocoa">
          <ellipse cx="0" cy="3" rx="4.5" ry="3.8" />
          <circle cx="-4.6" cy="-2.5" r="1.7" />
          <circle cx="-1.6" cy="-4.6" r="1.7" />
          <circle cx="1.6" cy="-4.6" r="1.7" />
          <circle cx="4.6" cy="-2.5" r="1.7" />
        </g>
      ))}
    </svg>
  );
}
