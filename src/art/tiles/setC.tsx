import type { ReactNode } from "react";
import { P } from "~/art/palette";
import type { TileArt } from "~/art/types";

// Set C: green + deepblue cities, the two stations, and the shared
// treasure / toy-bag / tax tiles.

const ink = { stroke: P.ink, strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;

const mq = (base: string, anim: string) =>
  `${base}@media (prefers-reduced-motion: no-preference){${anim}}`;

type SvgProps = { animate: boolean; className?: string; css: string; children: ReactNode };
const Svg = ({ animate, className, css, children }: SvgProps) => (
  <svg
    viewBox="0 0 100 100"
    width="100%"
    height="100%"
    preserveAspectRatio="xMidYMid meet"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    {animate ? <style dangerouslySetInnerHTML={{ __html: css }} /> : null}
    {children}
  </svg>
);

const Sky = ({ id, a, b }: { id: string; a: string; b: string }) => (
  <>
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={a} />
        <stop offset="1" stopColor={b} />
      </linearGradient>
    </defs>
    <rect width="100" height="100" fill={`url(#${id})`} />
  </>
);

// Plain backdrop for the non-property tiles.
const Blob = () => (
  <>
    <rect width="100" height="100" fill={P.cream} />
    <circle cx="50" cy="52" r="42" fill={P.cream2} />
    <ellipse cx="50" cy="89" rx="32" ry="4" fill={P.furShade} opacity="0.6" />
  </>
);

// Dimsam's face, radius ~10 at s=1, centred on (x, y).
const Face = ({ x, y, s = 1 }: { x: number; y: number; s?: number }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} strokeWidth={2 / s}>
    <path d="M-9.5-3L-7-15.5 0-9Z" fill={P.peach} />
    <path d="M9.5-3L7-15.5 0-9Z" fill={P.peach} />
    <circle r="10" fill={P.fur} />
    <ellipse cx="-6.3" cy="3" rx="1.7" ry="1" fill={P.blush} stroke="none" />
    <ellipse cx="6.3" cy="3" rx="1.7" ry="1" fill={P.blush} stroke="none" />
    <circle cx="-3.7" cy="-1" r="1.8" fill={P.ink} stroke="none" />
    <circle cx="3.7" cy="-1" r="1.8" fill={P.ink} stroke="none" />
    <circle cx="-3.1" cy="-1.6" r="0.6" fill={P.white} stroke="none" />
    <circle cx="4.3" cy="-1.6" r="0.6" fill={P.white} stroke="none" />
    <path d="M-1.4 4.4Q0 8 1.4 4.4Z" fill={P.tongue} strokeWidth={1.2 / s} />
    <ellipse cx="0" cy="2.6" rx="1.7" ry="1.2" fill={P.ink} stroke="none" />
  </g>
);

// Four-point sparkle centred on its own origin.
const SPARK = "M0-5Q.9-.9 5 0Q.9.9 0 5Q-.9.9-5 0Q-.9-.9 0-5Z";

const Bone = ({ x, y, r = 0, s = 1, fill = P.white }: { x: number; y: number; r?: number; s?: number; fill?: string }) => {
  const parts = (
    <>
      <rect x="-7" y="-2" width="14" height="4" />
      <circle cx="-7" cy="-2.2" r="2.6" />
      <circle cx="-7" cy="2.2" r="2.6" />
      <circle cx="7" cy="-2.2" r="2.6" />
      <circle cx="7" cy="2.2" r="2.6" />
    </>
  );
  return (
    <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`} fill={fill}>
      <g strokeWidth={3.6 / s}>{parts}</g>
      <g stroke="none">{parts}</g>
    </g>
  );
};

const gear = (cx: number, cy: number, ro: number, ri: number, n: number) => {
  const pts: string[] = [];
  for (let k = 0; k < n * 4; k++) {
    const a = ((k + 0.5) * Math.PI) / (n * 2);
    const r = k % 4 < 2 ? ro : ri;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return `M${pts.join("L")}Z`;
};
const GEAR1 = gear(16, 64, 10, 7.5, 8);
const GEAR2 = gear(29, 77, 7, 5, 6);

const Coin = ({ x, y, r = 6 }: { x: number; y: number; r?: number }) => (
  <g>
    <circle cx={x} cy={y} r={r} fill={P.sun} />
    <circle cx={x} cy={y} r={r * 0.62} fill="none" stroke={P.caramel} strokeWidth="1.5" />
  </g>
);

/* ------------------------------------------------------------------ 31 */
export const Tile31: TileArt = ({ animate = true, className }) => (
  <Svg
    animate={animate}
    className={className}
    css={mq(
      ".t31-stalk{transform-box:fill-box;transform-origin:50% 100%}",
      "@keyframes t31-peek{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}" +
        "@keyframes t31-shake{0%,62%,100%{transform:translateX(0)}66%,74%,82%{transform:translateX(-.8px)}70%,78%{transform:translateX(.8px)}}" +
        "@keyframes t31-sway{0%,100%{transform:rotate(-3deg)}50%{transform:rotate(3deg)}}" +
        "@keyframes t31-thud{0%,62%,90%,100%{opacity:0}68%,80%{opacity:1}}" +
        ".t31-giant{animation:t31-peek 4s ease-in-out infinite}" +
        ".t31-town{animation:t31-shake 4s ease-in-out infinite}" +
        ".t31-stalk{animation:t31-sway 5s ease-in-out infinite .6s}" +
        ".t31-thud{animation:t31-thud 4s ease-in-out infinite}",
    )}
  >
    <Sky id="t31-sky" a={P.sky} b={P.cream} />
    <g {...ink}>
      <path d="M68 16q0-6 6-6q3-5 9-2q7-1 7 6q3 2 0 4H70q-3 0-2-2Z" fill={P.white} strokeWidth="1.5" />
      <g className="t31-giant">
        <circle cx="35" cy="52" r="5" fill={P.peach} />
        <circle cx="85" cy="52" r="5" fill={P.peach} />
        <circle cx="60" cy="56" r="25" fill={P.peach} />
        <path d="M35 52Q34 28 60 29Q86 28 85 52Q81 40 71 39Q62 45 53 39Q41 40 35 52Z" fill={P.cocoa} />
        <circle cx="51" cy="51" r="3" fill={P.ink} stroke="none" />
        <circle cx="69" cy="51" r="3" fill={P.ink} stroke="none" />
        <circle cx="52" cy="50" r="1" fill={P.white} stroke="none" />
        <circle cx="70" cy="50" r="1" fill={P.white} stroke="none" />
        <ellipse cx="44" cy="58" rx="3.5" ry="2" fill={P.blush} stroke="none" />
        <ellipse cx="76" cy="58" rx="3.5" ry="2" fill={P.blush} stroke="none" />
        <path d="M54 59Q60 65 66 59" fill="none" />
      </g>
      <g className="t31-stalk">
        <path d="M15 100C7 82 22 70 14 52C8 38 20 26 14 8" fill="none" strokeWidth="6.5" />
        <path d="M15 100C7 82 22 70 14 52C8 38 20 26 14 8" fill="none" stroke={P.grassDeep} strokeWidth="3" />
        <ellipse cx="21" cy="66" rx="5.5" ry="2.6" fill={P.grass} transform="rotate(-30 21 66)" />
        <ellipse cx="8" cy="45" rx="5.5" ry="2.6" fill={P.grass} transform="rotate(30 8 45)" />
        <ellipse cx="20" cy="29" rx="5.5" ry="2.6" fill={P.grass} transform="rotate(-30 20 29)" />
        <ellipse cx="9" cy="14" rx="4.5" ry="2.2" fill={P.grass} transform="rotate(30 9 14)" />
      </g>
      <g className="t31-town">
        <rect x="25" y="67" width="21" height="18" fill={P.cream} />
        <path d="M22 68L35.5 55 49 68Z" fill={P.groups.red} />
        <rect x="31" y="72" width="8" height="7" fill={P.sun} />
        <rect x="71" y="65" width="21" height="20" fill={P.cream2} />
        <path d="M68 66L81.5 53 95 66Z" fill={P.groups.blue} />
        <rect x="77.5" y="73" width="8" height="12" fill={P.caramel} />
        <rect x="52" y="75" width="15" height="10" fill={P.sand} />
        <path d="M49 76L59.5 67 70 76Z" fill={P.caramel} />
        <path d="M56 85v-4a3.5 3.5 0 0 1 7 0v4Z" fill={P.ink} />
      </g>
      <g className="t31-thud" fill="none" strokeWidth="1.6">
        <path d="M20 72l-3-2M20 77h-4M97 70l2-2M97 75h2.5" />
      </g>
      <rect x="-2" y="83" width="104" height="20" fill={P.grass} />
      <ellipse cx="30" cy="92" rx="8" ry="3" fill={P.grassDeep} stroke="none" />
      <ellipse cx="78" cy="94" rx="8" ry="3" fill={P.grassDeep} stroke="none" />
    </g>
  </Svg>
);

/* ------------------------------------------------------------------ 32 */
export const Tile32: TileArt = ({ animate = true, className }) => (
  <Svg
    animate={animate}
    className={className}
    css={mq(
      ".t32-w1,.t32-w2{transform-box:fill-box;transform-origin:50% 100%}.t32-tail{transform-origin:0 0}.t32-b{transform-box:fill-box;transform-origin:center}",
      "@keyframes t32-sway{0%,100%{transform:rotate(-6deg)}50%{transform:rotate(6deg)}}" +
        "@keyframes t32-flick{0%,100%{transform:rotate(0)}50%{transform:rotate(-12deg)}}" +
        "@keyframes t32-rise{0%{transform:translateY(0);opacity:0}20%{opacity:1}100%{transform:translateY(-16px);opacity:0}}" +
        ".t32-w1{animation:t32-sway 4s ease-in-out infinite}" +
        ".t32-w2{animation:t32-sway 5s ease-in-out infinite -2s}" +
        ".t32-tail{animation:t32-flick 3s ease-in-out infinite}" +
        ".t32-b{animation:t32-rise 4s ease-in-out infinite}" +
        ".t32-b2{animation-delay:-1.4s}.t32-b3{animation-delay:-2.7s}",
    )}
  >
    <Sky id="t32-sea" a={P.water} b={P.waterDeep} />
    <g {...ink}>
      <rect x="64" y="46" width="24" height="38" fill={P.blush} />
      <path d="M64 47Q76 22 88 47Z" fill={P.purple} />
      <circle cx="76" cy="32" r="2" fill={P.sun} />
      <rect x="56" y="38" width="10" height="46" fill={P.blush} />
      <rect x="86" y="38" width="10" height="46" fill={P.blush} />
      <path d="M55 39Q61 25 67 39Z" fill={P.purple} />
      <path d="M85 39Q91 25 97 39Z" fill={P.purple} />
      <circle cx="61" cy="52" r="2" fill={P.sun} />
      <circle cx="91" cy="52" r="2" fill={P.sun} />
      <path d="M71 84V74a5 5 0 0 1 10 0v10Z" fill={P.waterDeep} />
      <path className="t32-w1" d="M7 94Q1 78 8 66Q14 56 10 44Q19 56 15 67Q10 79 14 94Z" fill={P.grass} />
      <path className="t32-w2" d="M49 94Q44 82 49 72Q53 64 50 56Q58 64 55 73Q52 82 55 94Z" fill={P.grassDeep} />
      <rect x="-2" y="82" width="104" height="20" fill={P.sand} />
      <path d="M74 92Q82 98 92 92Z" fill={P.peach} />
      <path d="M74 91Q76 81 92 85Z" fill={P.peach} />
      <circle cx="83" cy="89.5" r="2.6" fill={P.white} />
      <g transform="translate(29 63)">
        <g className="t32-tail">
          <path d="M-8 0Q-9 14 4 19Q11 21 15 16Q8 15 6 9Q5 4 7 0Z" fill={P.purple} />
          <path d="M-3 7q3 2 6 0M0 13q3 1 5-1" fill="none" strokeWidth="1.3" />
          <path d="M13 17L24 9Q21 18 26 26Z" fill={P.blush} />
        </g>
      </g>
      <ellipse cx="29" cy="59" rx="9" ry="7.5" fill={P.fur} />
      <Face x={29} y={45} s={1.15} />
      <g fill={P.white} fillOpacity="0.6" strokeWidth="1.2">
        <circle className="t32-b" cx="41" cy="30" r="2.6" />
        <circle className="t32-b t32-b2" cx="46" cy="24" r="1.9" />
        <circle className="t32-b t32-b3" cx="37" cy="21" r="1.5" />
      </g>
    </g>
  </Svg>
);

/* ------------------------------------------------------------------ 34 */
export const Tile34: TileArt = ({ animate = true, className }) => (
  <Svg
    animate={animate}
    className={className}
    css={mq(
      ".t34-g1,.t34-g2{transform-box:fill-box;transform-origin:center}.t34-arm{transform-origin:0 0}",
      "@keyframes t34-spin{to{transform:rotate(360deg)}}" +
        "@keyframes t34-wave{0%,100%{transform:rotate(8deg)}50%{transform:rotate(-18deg)}}" +
        "@keyframes t34-blink{0%,100%{opacity:1}45%,55%{opacity:.25}}" +
        ".t34-g1{animation:t34-spin 6s linear infinite}" +
        ".t34-g2{animation:t34-spin 4.3s linear infinite reverse}" +
        ".t34-arm{animation:t34-wave 2.4s ease-in-out infinite}" +
        ".t34-led{animation:t34-blink 2s ease-in-out infinite}",
    )}
  >
    <Sky id="t34-sky" a={P.night} b={P.purple} />
    <g fill={P.white} stroke="none">
      <circle cx="12" cy="14" r="1" />
      <circle cx="36" cy="8" r="0.8" />
      <circle cx="30" cy="30" r="0.8" />
      <circle cx="92" cy="44" r="1" />
    </g>
    <g {...ink}>
      <g transform="rotate(-20 80 20)" fill="none">
        <ellipse cx="80" cy="20" rx="15" ry="4" strokeWidth="4.5" />
        <ellipse cx="80" cy="20" rx="15" ry="4" stroke={P.sun} strokeWidth="2" />
      </g>
      <circle cx="80" cy="20" r="8" fill={P.blush} />
      <g transform="rotate(-20 80 20)" fill="none">
        <path d="M65 20A15 4 0 0 0 95 20" strokeWidth="4.5" />
        <path d="M65 20A15 4 0 0 0 95 20" stroke={P.sun} strokeWidth="2" />
      </g>
      <rect x="-2" y="84" width="104" height="18" fill={P.stone} />
      <ellipse cx="14" cy="93" rx="6" ry="2" fill={P.furShade} strokeWidth="1.5" />
      <ellipse cx="84" cy="92" rx="5" ry="1.8" fill={P.furShade} strokeWidth="1.5" />
      <path className="t34-g1" d={GEAR1} fill={P.caramel} />
      <circle cx="16" cy="64" r="3" fill={P.cream} />
      <path className="t34-g2" d={GEAR2} fill={P.sun} />
      <circle cx="29" cy="77" r="2" fill={P.cream} />
      <rect x="48" y="74" width="6" height="10" fill={P.stone} />
      <rect x="60" y="74" width="6" height="10" fill={P.stone} />
      <rect x="45" y="82" width="11" height="4" rx="2" fill={P.skyDeep} />
      <rect x="58" y="82" width="11" height="4" rx="2" fill={P.skyDeep} />
      <path d="M71 56Q79 62 79 70" fill="none" strokeWidth="7" />
      <path d="M71 56Q79 62 79 70" fill="none" stroke={P.stone} strokeWidth="3.5" />
      <circle cx="79" cy="71" r="3.5" fill={P.sky} />
      <g transform="translate(43 56)">
        <g className="t34-arm">
          <path d="M0 0Q-10-2-12-12" fill="none" strokeWidth="7" />
          <path d="M0 0Q-10-2-12-12" fill="none" stroke={P.stone} strokeWidth="3.5" />
          <circle cx="-12" cy="-14" r="3.5" fill={P.sky} />
        </g>
      </g>
      <rect x="43" y="50" width="28" height="26" rx="4" fill={P.skyDeep} />
      <rect x="49" y="56" width="16" height="12" rx="2" fill={P.cream} />
      <circle cx="53" cy="62" r="1.8" fill={P.berry} strokeWidth="1" />
      <circle cx="57" cy="62" r="1.8" fill={P.sun} strokeWidth="1" />
      <circle cx="61" cy="62" r="1.8" fill={P.grass} strokeWidth="1" />
      <rect x="53" y="46" width="8" height="5" fill={P.stone} />
      <rect x="38" y="31" width="3" height="8" rx="1" fill={P.stone} />
      <rect x="73" y="31" width="3" height="8" rx="1" fill={P.stone} />
      <path d="M57 24v-7" />
      <rect x="41" y="24" width="32" height="23" rx="5" fill={P.white} />
      <rect x="45" y="28" width="24" height="15" rx="3" fill={P.night} />
      <circle cx="52" cy="34" r="2.4" fill={P.sky} stroke="none" />
      <circle cx="62" cy="34" r="2.4" fill={P.sky} stroke="none" />
      <path d="M53 39Q57 42 61 39" fill="none" stroke={P.sky} strokeWidth="1.6" />
      <circle className="t34-led" cx="57" cy="14.5" r="3" fill={P.berry} />
    </g>
  </Svg>
);

/* ------------------------------------------------------------------ 37 */
export const Tile37: TileArt = ({ animate = true, className }) => (
  <Svg
    animate={animate}
    className={className}
    css={mq(
      ".t37-flame{transform-origin:0 0}.t37-s{transform-box:fill-box;transform-origin:center}",
      "@keyframes t37-drift{0%,100%{transform:translate(0,0)}50%{transform:translate(3px,-4px)}}" +
        "@keyframes t37-flick{0%,100%{transform:scaleY(1)}25%{transform:scaleY(.75)}50%{transform:scaleY(1.15)}75%{transform:scaleY(.85)}}" +
        "@keyframes t37-tw{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.3;transform:scale(.6)}}" +
        ".t37-rocket{animation:t37-drift 5s ease-in-out infinite}" +
        ".t37-flame{animation:t37-flick .9s ease-in-out infinite}" +
        ".t37-s{animation:t37-tw 3s ease-in-out infinite}" +
        ".t37-s2{animation-delay:-1s}.t37-s3{animation-delay:-2s}",
    )}
  >
    <Sky id="t37-sky" a={P.night} b={P.purple} />
    <g fill={P.white} stroke="none">
      <circle cx="40" cy="22" r="0.9" />
      <circle cx="66" cy="10" r="0.8" />
      <circle cx="8" cy="56" r="0.9" />
      <circle cx="94" cy="30" r="0.8" />
      <circle cx="70" cy="74" r="0.8" />
    </g>
    <g {...ink}>
      <g fill={P.sun} strokeWidth="1.2">
        <path className="t37-s" d={SPARK} transform="translate(46 9)" />
        <path className="t37-s t37-s2" d={SPARK} transform="translate(88 46) scale(.8)" />
        <path className="t37-s t37-s3" d={SPARK} transform="translate(10 40) scale(.7)" />
      </g>
      <g transform="rotate(-18 20 24)" fill="none">
        <ellipse cx="20" cy="24" rx="15" ry="4" strokeWidth="4.5" />
        <ellipse cx="20" cy="24" rx="15" ry="4" stroke={P.blush} strokeWidth="2" />
      </g>
      <circle cx="20" cy="24" r="9" fill={P.peach} />
      <path d="M14 21q6-2 12 0" fill="none" stroke={P.caramel} strokeWidth="1.5" />
      <g transform="rotate(-18 20 24)" fill="none">
        <path d="M5 24A15 4 0 0 0 35 24" strokeWidth="4.5" />
        <path d="M5 24A15 4 0 0 0 35 24" stroke={P.blush} strokeWidth="2" />
      </g>
      <circle cx="84" cy="16" r="6" fill={P.sky} />
      <circle cx="82" cy="14" r="1.6" fill={P.skyDeep} strokeWidth="1" />
      <path d="M-2 84Q50 74 102 84V102H-2Z" fill={P.stone} />
      <ellipse cx="22" cy="90" rx="6" ry="2" fill={P.furShade} strokeWidth="1.5" />
      <ellipse cx="74" cy="92" rx="8" ry="2.4" fill={P.furShade} strokeWidth="1.5" />
      <g className="t37-rocket">
        <g transform="translate(56 46) rotate(35)">
          <g transform="translate(0 16)">
            <g className="t37-flame">
              <path d="M-5.5 0Q-6.5 9 0 18Q6.5 9 5.5 0Z" fill={P.sun} />
              <path d="M-2.6 0Q-3 6 0 10Q3 6 2.6 0Z" fill={P.groups.orange} stroke="none" />
            </g>
          </g>
          <path d="M-8 2L-16 15-8 12Z" fill={P.berry} />
          <path d="M8 2L16 15 8 12Z" fill={P.berry} />
          <rect x="-6" y="12" width="12" height="4" rx="1" fill={P.stone} />
          <path d="M0-27Q11-15 9 13H-9Q-11-15 0-27Z" fill={P.white} />
          <path d="M0-27Q6-21 7.6-16H-7.6Q-6-21 0-27Z" fill={P.berry} />
          <circle cy="-3" r="7.5" fill={P.sky} />
          <Face x={0} y={-1.5} s={0.52} />
        </g>
      </g>
    </g>
  </Svg>
);

/* ------------------------------------------------------------------ 39 */
export const Tile39: TileArt = ({ animate = true, className }) => (
  <Svg
    animate={animate}
    className={className}
    css={mq(
      ".t39-r{transform-box:fill-box;transform-origin:center}",
      "@keyframes t39-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}" +
        "@keyframes t39-zip{0%{transform:translateX(-40px);opacity:0}15%,80%{opacity:1}100%{transform:translateX(105px);opacity:0}}" +
        "@keyframes t39-pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.12);opacity:.45}}" +
        ".t39-float{animation:t39-bob 4s ease-in-out infinite}" +
        ".t39-plat{animation:t39-bob 3s ease-in-out infinite -1.2s}" +
        ".t39-car{animation:t39-zip 4.5s ease-in-out infinite}" +
        ".t39-r{animation:t39-pulse 2.6s ease-in-out infinite}.t39-r2{animation-delay:-1.3s}",
    )}
  >
    <Sky id="t39-sky" a={P.purple} b={P.blush} />
    <g {...ink}>
      <rect x="28" y="46" width="13" height="40" rx="2" fill={P.night} />
      <rect x="61" y="38" width="13" height="48" rx="2" fill={P.night} />
      <g fill={P.sun} stroke="none">
        <rect x="31" y="51" width="3" height="3" />
        <rect x="35" y="58" width="3" height="3" />
        <rect x="64" y="44" width="3" height="3" />
        <rect x="68" y="52" width="3" height="3" />
        <rect x="64" y="62" width="3" height="3" />
      </g>
      <path d="M51 10v8" />
      <circle cx="51" cy="9" r="2" fill={P.sun} />
      <rect x="44" y="18" width="14" height="68" rx="7" fill={P.skyDeep} />
      <path d="M51 28v42" stroke={P.sky} strokeWidth="2.5" strokeDasharray="3 4" />
      <ellipse className="t39-r" cx="51" cy="38" rx="15" ry="3.6" fill="none" stroke={P.sun} strokeWidth="2.5" />
      <ellipse className="t39-r t39-r2" cx="51" cy="56" rx="17" ry="4" fill="none" stroke={P.sky} strokeWidth="2.5" />
      <g className="t39-float">
        <rect x="78" y="20" width="14" height="22" rx="2" fill={P.sky} />
        <rect x="81" y="24" width="8" height="4" fill={P.white} strokeWidth="1.2" />
        <rect x="81" y="31" width="8" height="4" fill={P.white} strokeWidth="1.2" />
        <path d="M78 42L85 50 92 42Z" fill={P.stone} />
        <ellipse cx="85" cy="53" rx="3" ry="1.4" fill={P.sun} stroke="none" />
      </g>
      <g className="t39-plat">
        <path d="M7 62Q16 46 25 62Z" fill={P.sky} />
        <ellipse cx="16" cy="63" rx="13" ry="3.5" fill={P.stone} />
        <ellipse cx="16" cy="69" rx="4" ry="1.5" fill={P.sun} stroke="none" />
      </g>
      <g className="t39-car">
        <path d="M2 27h5M0 31h6" fill="none" strokeWidth="1.5" />
        <path d="M15 24Q19 17 25 24Z" fill={P.sky} />
        <path d="M10 28Q12 24 20 24Q30 24 32 28Q32 32 28 32H14Q10 32 10 28Z" fill={P.berry} />
        <circle cx="30" cy="28" r="1" fill={P.sun} stroke="none" />
      </g>
      <rect x="-2" y="84" width="104" height="18" fill={P.night} />
      <path d="M4 92H96" stroke={P.sky} strokeWidth="2" strokeDasharray="6 5" />
    </g>
  </Svg>
);

/* ------------------------------------------------------------------ 12 */
const Blade = () => (
  <g className="t12-snip">
    <path d="M-1.6 1Q1-12 7-23Q4.5-9 2 1Z" fill={P.white} />
    <path d="M0 0L-6 10" strokeWidth="3" />
    <circle cx="-8" cy="14.5" r="4.6" fill={P.berry} />
    <circle cx="-8" cy="14.5" r="1.8" fill={P.cream} strokeWidth="1.2" />
  </g>
);
export const Tile12: TileArt = ({ animate = true, className }) => (
  <Svg
    animate={animate}
    className={className}
    css={mq(
      ".t12-snip{transform-origin:0 0}.t12-b{transform-box:fill-box;transform-origin:center}",
      "@keyframes t12-snip{0%,40%,100%{transform:rotate(0)}20%,60%{transform:rotate(14deg)}}" +
        "@keyframes t12-float{0%{transform:translateY(0);opacity:0}25%{opacity:1}100%{transform:translateY(-14px);opacity:0}}" +
        ".t12-snip{animation:t12-snip 2.4s ease-in-out infinite}" +
        ".t12-b{animation:t12-float 4s ease-in-out infinite}.t12-b2{animation-delay:-2s}",
    )}
  >
    <Sky id="t12-sky" a={P.sky} b={P.cream} />
    <g {...ink}>
      <rect x="16" y="32" width="68" height="54" fill={P.cream} />
      <rect x="12" y="22" width="76" height="10" rx="2" fill={P.cocoa} />
      <Face x={50} y={14} s={0.76} />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <path
          key={i}
          d={`M${12 + i * 12.67} 32h12.67v8a6.33 4.5 0 0 1-12.67 0Z`}
          fill={i % 2 ? P.white : P.berry}
        />
      ))}
      <rect x="22" y="52" width="26" height="22" rx="1" fill={P.sky} />
      <path d="M26 57l5-4M26 63l10-8" stroke={P.white} strokeWidth="1.8" />
      <rect x="58" y="52" width="20" height="34" rx="2" fill={P.caramel} />
      <circle cx="68" cy="60" r="4" fill={P.sky} />
      <circle cx="74" cy="70" r="1.3" fill={P.sun} strokeWidth="1" />
      <rect x="-2" y="85" width="104" height="18" fill={P.stone} />
      <g transform="rotate(-8 76 91)">
        <rect x="63" y="87" width="26" height="4.5" rx="2" fill={P.blush} />
        <path d="M66 91.5v4M69.5 91.5v4M73 91.5v4M76.5 91.5v4M80 91.5v4M83.5 91.5v4M87 91.5v3" strokeWidth="1.5" />
      </g>
      <g transform="translate(33 70)">
        <Blade />
        <g transform="scale(-1 1)">
          <Blade />
        </g>
        <circle r="1.7" fill={P.sun} strokeWidth="1.2" />
      </g>
      <g fill={P.white} fillOpacity="0.6" strokeWidth="1.3">
        <circle className="t12-b" cx="85" cy="62" r="3.6" />
        <circle className="t12-b t12-b2" cx="90" cy="52" r="2.6" />
      </g>
    </g>
  </Svg>
);

/* ------------------------------------------------------------------ 28 */
export const Tile28: TileArt = ({ animate = true, className }) => (
  <Svg
    animate={animate}
    className={className}
    css={mq(
      ".t28-heart{transform-box:fill-box;transform-origin:center}.t28-paw{transform-box:fill-box;transform-origin:50% 100%}",
      "@keyframes t28-beat{0%,30%,60%,100%{transform:scale(1)}15%,45%{transform:scale(1.12)}}" +
        "@keyframes t28-ecg{0%,100%{opacity:.35}15%,45%{opacity:1}}" +
        "@keyframes t28-wave{0%,100%{transform:rotate(-6deg)}50%{transform:rotate(6deg)}}" +
        ".t28-heart{animation:t28-beat 2s ease-in-out infinite}" +
        ".t28-ecg{animation:t28-ecg 2s ease-in-out infinite}" +
        ".t28-paw{animation:t28-wave 3.5s ease-in-out infinite}",
    )}
  >
    <Sky id="t28-sky" a={P.sky} b={P.cream} />
    <g {...ink}>
      <path
        className="t28-ecg"
        d="M3 20H14L17 13 21 27 25 16 27 20H73L76 13 80 27 84 16 86 20H97"
        fill="none"
        stroke={P.berry}
        strokeWidth="2"
      />
      <rect x="24" y="40" width="54" height="45" fill={P.white} />
      <rect x="20" y="32" width="62" height="9" rx="2" fill={P.skyDeep} />
      <rect x="29" y="48" width="12" height="11" fill={P.sky} />
      <rect x="61" y="48" width="12" height="11" fill={P.sky} />
      <path d="M35 48v11M29 53.5h12M67 48v11M61 53.5h12" strokeWidth="1.4" />
      <rect x="44" y="62" width="14" height="23" fill={P.sky} />
      <path d="M51 62v23" strokeWidth="1.4" />
      <g className="t28-heart">
        <path
          d="M51 30C37 21 38 10 45 10C48.5 10 51 13.5 51 15C51 13.5 53.5 10 57 10C64 10 65 21 51 30Z"
          fill={P.groups.red}
        />
        <path d="M49 13.5h4v3.5h3.5v4h-3.5v3.5h-4V21h-3.5v-4H49Z" fill={P.white} strokeWidth="1.2" />
      </g>
      <rect x="-2" y="84" width="104" height="18" fill={P.grass} />
      <path d="M6 62Q5 73 12 75Q19 73 18 62" fill="none" strokeWidth="2.2" />
      <path d="M12 75Q12 94 24 94Q34 94 34 88" fill="none" strokeWidth="5" />
      <path d="M12 75Q12 94 24 94Q34 94 34 88" fill="none" stroke={P.groups.blue} strokeWidth="2.4" />
      <circle cx="6" cy="61" r="1.8" fill={P.ink} />
      <circle cx="18" cy="61" r="1.8" fill={P.ink} />
      <circle cx="34" cy="84" r="5" fill={P.stone} />
      <circle cx="34" cy="84" r="2.2" fill={P.white} strokeWidth="1.2" />
      <g className="t28-paw">
        <rect x="79" y="70" width="13" height="26" rx="6" fill={P.fur} />
        <ellipse cx="85.5" cy="70" rx="8.5" ry="7.5" fill={P.fur} />
        <circle cx="80.5" cy="65.5" r="1.6" fill={P.peach} strokeWidth="1" />
        <circle cx="85.5" cy="63.8" r="1.6" fill={P.peach} strokeWidth="1" />
        <circle cx="90.5" cy="65.5" r="1.6" fill={P.peach} strokeWidth="1" />
        <rect x="78" y="72" width="15" height="7" rx="1.5" fill={P.white} />
        <path d="M82 72v7M86 72v7M90 72v7" stroke={P.stone} strokeWidth="1.2" />
      </g>
    </g>
  </Svg>
);

/* --------------------------------------------------------- treasure */
export const TileTreasure: TileArt = ({ animate = true, className }) => (
  <Svg
    animate={animate}
    className={className}
    css={mq(
      ".ttr-lid{transform-origin:0 0}.ttr-s{transform-box:fill-box;transform-origin:center}",
      "@keyframes ttr-rock{0%,100%{transform:rotate(-2.5deg)}50%{transform:rotate(2.5deg)}}" +
        "@keyframes ttr-tw{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.2;transform:scale(.5)}}" +
        ".ttr-lid{animation:ttr-rock 4s ease-in-out infinite}" +
        ".ttr-s{animation:ttr-tw 2.6s ease-in-out infinite}" +
        ".ttr-s2{animation-delay:-.9s}.ttr-s3{animation-delay:-1.8s}",
    )}
  >
    <Blob />
    <g {...ink}>
      <g transform="translate(50 56)">
        <g className="ttr-lid">
          <path d="M-28 0L-26-24Q0-36 26-24L28 0Z" fill={P.caramel} />
          <path d="M-23-2L-21.5-20Q0-30 21.5-20L23-2Z" fill={P.cocoa} />
        </g>
      </g>
      <path d="M24 58Q28 42 50 42Q72 42 76 58Z" fill={P.sun} />
      <Bone x={42} y={42} r={-30} />
      <Coin x={33} y={51} r={5} />
      <Coin x={52} y={47} r={5} />
      <circle cx="66" cy="48" r="5.5" fill={P.peach} />
      <path d="M63.5 46h.1M68.5 46.5h.1M66 49.5h.1M63 51h.1M69 51h.1" stroke={P.cocoa} strokeWidth="1.8" />
      <Coin x={70} y={54} r={4} />
      <rect x="22" y="57" width="56" height="29" rx="3" fill={P.caramel} />
      <rect x="20" y="54" width="60" height="6" rx="2" fill={P.cocoa} />
      <rect x="30" y="60" width="6" height="26" fill={P.cocoa} />
      <rect x="64" y="60" width="6" height="26" fill={P.cocoa} />
      <rect x="44" y="60" width="12" height="12" rx="2" fill={P.sun} />
      <path d="M50 64.5v3.5" strokeWidth="2.4" />
      <Coin x={16} y={84} r={5} />
      <Bone x={84} y={85} r={20} s={0.8} />
      <g fill={P.sun} strokeWidth="1.2">
        <path className="ttr-s" d={SPARK} transform="translate(18 26)" />
        <path className="ttr-s ttr-s2" d={SPARK} transform="translate(83 22) scale(.8)" />
        <path className="ttr-s ttr-s3" d={SPARK} transform="translate(88 50) scale(.6)" />
      </g>
    </g>
  </Svg>
);

/* ---------------------------------------------------------- toy bag */
export const TileToyBag: TileArt = ({ animate = true, className }) => (
  <Svg
    animate={animate}
    className={className}
    css={mq(
      ".tbag-s{transform-box:fill-box;transform-origin:center}.tbag-duck{transform-box:fill-box;transform-origin:50% 100%}",
      "@keyframes tbag-bob{0%,100%{transform:translateY(0) rotate(-4deg)}50%{transform:translateY(-4px) rotate(4deg)}}" +
        "@keyframes tbag-tw{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.25;transform:scale(.55)}}" +
        "@keyframes tbag-wob{0%,100%{transform:rotate(-5deg)}50%{transform:rotate(5deg)}}" +
        ".tbag-q{animation:tbag-bob 3s ease-in-out infinite;transform-box:fill-box;transform-origin:center}" +
        ".tbag-s{animation:tbag-tw 2.8s ease-in-out infinite}.tbag-s2{animation-delay:-1.4s}" +
        ".tbag-duck{animation:tbag-wob 3.6s ease-in-out infinite -1s}",
    )}
  >
    <Blob />
    <g {...ink}>
      <path d="M30 56Q12 70 21 84Q28 93 50 93Q72 93 79 84Q88 70 70 56Z" fill={P.sand} />
      <path d="M30 76q4 6 10 4M64 82q6-1 9-6" fill="none" stroke={P.furDeep} strokeWidth="1.6" />
      <ellipse cx="50" cy="56" rx="22" ry="5" fill={P.cocoa} />
      <g transform="rotate(-18 47 40)">
        <rect x="43.5" y="24" width="7" height="32" rx="3.5" fill={P.white} />
        <path d="M44 31l6-3M44 38l6-3M44 45l6-3" stroke={P.berry} strokeWidth="2.2" />
        <ellipse cx="47" cy="23" rx="5" ry="3.6" fill={P.berry} />
        <path d="M44.5 19.5l-1.5-4M47 19.5v-4.5M49.5 19.5l1.5-4" strokeWidth="1.6" />
      </g>
      <circle cx="34" cy="49" r="9" fill={P.groups.blue} />
      <path d="M26 46Q34 52 42 45" fill="none" stroke={P.white} strokeWidth="2.2" />
      <g className="tbag-duck">
        <ellipse cx="64" cy="50" rx="9" ry="6.5" fill={P.sun} />
        <circle cx="62" cy="40" r="5.5" fill={P.sun} />
        <path d="M57 40.5L51.5 42 57 43.5Z" fill={P.groups.orange} />
        <circle cx="61" cy="39" r="1.1" fill={P.ink} stroke="none" />
        <path d="M63 50q4 3 7-1" fill="none" strokeWidth="1.5" />
      </g>
      <path d="M28 56Q50 66 72 56Q71 63 50 65Q29 63 28 56Z" fill={P.sand} />
      <path d="M30 61Q50 70 70 61" fill="none" stroke={P.berry} strokeWidth="2.4" />
      <path d="M50 66Q42 60 43 66Q44 72 50 66Q56 60 57 66Q56 72 50 66Z" fill={P.berry} strokeWidth="1.5" />
      <path d="M49 67l-3 7M51 67l3 7" strokeWidth="1.8" />
      <g transform="translate(0 4)">
      <g className="tbag-q">
        <path d="M74 15Q74 6 82 6Q90 6 90 13Q90 18 84 20Q82 21 82 26" fill="none" strokeWidth="8" />
        <path d="M74 15Q74 6 82 6Q90 6 90 13Q90 18 84 20Q82 21 82 26" fill="none" stroke={P.purple} strokeWidth="4" />
        <circle cx="82" cy="33" r="3.2" fill={P.purple} />
      </g>
      </g>
      <g fill={P.sun} strokeWidth="1.2">
        <path className="tbag-s" d={SPARK} transform="translate(18 24)" />
        <path className="tbag-s tbag-s2" d={SPARK} transform="translate(30 12) scale(.7)" />
      </g>
    </g>
  </Svg>
);

/* ------------------------------------------------------- tax: bath */
export const TileTaxBath: TileArt = ({ animate = true, className }) => (
  <Svg
    animate={animate}
    className={className}
    css={mq(
      ".ttx4-d,.ttx4-bub{transform-box:fill-box;transform-origin:center}",
      "@keyframes ttx4-drip{0%{transform:translateY(0);opacity:0}15%{opacity:1}80%{opacity:1}100%{transform:translateY(24px);opacity:0}}" +
        "@keyframes ttx4-float{0%,100%{transform:translate(0,0)}50%{transform:translate(3px,-5px)}}" +
        ".ttx4-d{animation:ttx4-drip 2.4s ease-in infinite}" +
        ".ttx4-d2{animation-delay:-.8s}.ttx4-d3{animation-delay:-1.6s}" +
        ".ttx4-bub{animation:ttx4-float 4s ease-in-out infinite}",
    )}
  >
    <Blob />
    <g {...ink}>
      <path d="M8 6V10Q8 15 15 15H24V20" fill="none" strokeWidth="7" />
      <path d="M8 6V10Q8 15 15 15H24V20" fill="none" stroke={P.stone} strokeWidth="3.5" />
      <rect x="3" y="3" width="10" height="4" rx="1.5" fill={P.stone} />
      <path d="M18 19H30L37 28H11Z" fill={P.stone} />
      <path d="M16 31h.1M24 31h.1M32 31h.1" strokeWidth="2" />
      <g fill={P.water} strokeWidth="1.4">
        <path className="ttx4-d" d="M16 33Q19 37 16 39Q13 37 16 33Z" />
        <path className="ttx4-d ttx4-d2" d="M24 33Q27 37 24 39Q21 37 24 33Z" />
        <path className="ttx4-d ttx4-d3" d="M32 33Q35 37 32 39Q29 37 32 33Z" />
      </g>
      <path d="M67 30V22H76" fill="none" strokeWidth="3" />
      <rect x="60" y="30" width="15" height="8" rx="2" fill={P.berry} />
      <rect x="54" y="38" width="27" height="48" rx="8" fill={P.blush} />
      <rect x="59" y="50" width="17" height="21" rx="2" fill={P.white} />
      <circle cx="65" cy="62" r="3.2" fill={P.sky} strokeWidth="1.4" />
      <circle cx="70.5" cy="57" r="2.2" fill={P.sky} strokeWidth="1.4" />
      <g transform="rotate(-14 31 72)">
        <path d="M16 62Q16 60 18 60H39L46 71 39 82H18Q16 82 16 80Z" fill={P.peach} />
        <circle cx="40.5" cy="71" r="1.8" fill={P.cream} />
        <Coin x={27} y={71} r={7} />
      </g>
      <g className="ttx4-bub">
        <circle cx="44" cy="44" r="6.5" fill={P.white} fillOpacity="0.55" strokeWidth="1.5" />
        <path d="M40.5 42.5a4 4 0 0 1 3-2.5" fill="none" stroke={P.white} strokeWidth="1.6" />
      </g>
      <circle className="ttx4-bub" cx="88" cy="28" r="3" fill={P.white} fillOpacity="0.55" strokeWidth="1.3" style={{ animationDelay: "-2s" }} />
    </g>
  </Svg>
);

/* -------------------------------------------------------- tax: vet */
export const TileTaxVet: TileArt = ({ animate = true, className }) => (
  <Svg
    animate={animate}
    className={className}
    css={mq(
      ".ttx38-cross{transform-box:fill-box;transform-origin:center}",
      "@keyframes ttx38-pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.18);opacity:.7}}" +
        "@keyframes ttx38-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-2.5px)}}" +
        ".ttx38-cross{animation:ttx38-pulse 2.2s ease-in-out infinite}" +
        ".ttx38-coin{animation:ttx38-bob 3s ease-in-out infinite -.7s}",
    )}
  >
    <Blob />
    <g {...ink}>
      <g transform="rotate(-6 42 48)">
        <path d="M22 14H60V78l-4.75 4-4.75-4-4.75 4-4.75-4-4.75 4-4.75-4-4.75 4L22 78Z" fill={P.white} />
        <path d="M28 24H54M28 32H48M28 40H54M28 48H44" stroke={P.stone} strokeWidth="2.4" />
        <g className="ttx38-coin">
          <Coin x={34} y={64} r={7} />
        </g>
      </g>
      <rect x="58" y="40" width="25" height="9" rx="2" fill={P.white} />
      <rect x="60" y="49" width="21" height="37" rx="4" fill={P.caramel} />
      <rect x="60" y="57" width="21" height="17" fill={P.white} />
      <path d="M69 61.5h3v3h3v3h-3v3h-3v-3h-3v-3h3Z" fill={P.berry} strokeWidth="1" />
      <g transform="rotate(-28 30 80)">
        <rect x="14" y="76" width="36" height="8" rx="4" fill={P.white} />
        <rect x="17" y="78.8" width="20" height="2.4" fill={P.groups.red} stroke="none" />
        <path d="M30 76v2.5M36 76v2.5M42 76v2.5" strokeWidth="1.3" />
        <circle cx="14" cy="80" r="5.5" fill={P.groups.red} />
      </g>
      <g transform="rotate(25 88 88)">
        <rect x="81" y="85" width="14" height="6" rx="3" fill={P.white} />
        <path d="M88 85h4a3 3 0 0 1 0 6h-4Z" fill={P.berry} />
      </g>
      <path
        className="ttx38-cross"
        d="M77 12h6v6h6v6h-6v6h-6v-6h-6v-6h6Z"
        fill={P.groups.red}
      />
    </g>
  </Svg>
);
