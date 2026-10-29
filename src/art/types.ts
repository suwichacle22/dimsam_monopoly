import type { ReactNode } from "react";

/**
 * Contract for a piece of tile artwork.
 *
 * - Render exactly one inline <svg viewBox="0 0 100 100"> that fills its box
 *   (width/height 100%, preserveAspectRatio="xMidYMid meet").
 * - Colours come from ~/art/palette (P). No external images, no fonts.
 * - Animations live in a <style> element inside the svg. Prefix every class
 *   and keyframe name with the tile's unique id (e.g. `t03-`) so two tiles
 *   never collide. Keep motion subtle and looping (2–6 s), transform/opacity
 *   only. Wrap keyframe use in `@media (prefers-reduced-motion: no-preference)`.
 * - When `animate` is false, render the same picture with no motion.
 * - Aim for < 6 KB of markup per tile. 2–5 moving elements is plenty.
 * - Pure, stateless; no hooks required.
 */
export type TileArtProps = { animate?: boolean; className?: string };
export type TileArt = (props: TileArtProps) => ReactNode;
