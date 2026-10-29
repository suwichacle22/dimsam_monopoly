// Tile artwork set B: orange 16 18 19, red 21 23 24, yellow 26 27 29 and the special items 5 15 25 35.
import type { ReactNode } from "react";
import { P } from "~/art/palette";
import type { TileArt } from "~/art/types";

const r1 = (n: number) => Math.round(n * 10) / 10;
const RM = "@media (prefers-reduced-motion: no-preference){";
/** Base rules always apply; motion rules are gated behind prefers-reduced-motion. */
const css = (base: string, motion: string) => `${base}${RM}${motion}}`;

const Frame = ({ className, animate, styles, children }: { className?: string; animate: boolean; styles: string; children: ReactNode }) => (
  <svg
    viewBox="0 0 100 100"
    width="100%"
    height="100%"
    preserveAspectRatio="xMidYMid meet"
    className={className}
    stroke={P.ink}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {animate && <style>{styles}</style>}
    {children}
  </svg>
);

const Sky = ({ id, a = P.sky, b = P.cream }: { id: string; a?: string; b?: string }) => (
  <>
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={a} />
        <stop offset="1" stopColor={b} />
      </linearGradient>
    </defs>
    <rect width="100" height="100" fill={`url(#${id})`} stroke="none" />
  </>
);

/** Plain backdrop for the special-item tiles. */
const Plain = () => (
  <>
    <rect width="100" height="100" fill={P.cream} stroke="none" />
    <circle cx="50" cy="52" r="42" fill={P.cream2} stroke="none" />
  </>
);

/** Scalloped wave band from x=-20 to 120, period 20. */
const wave = (y: number, a: number) => `M-20 ${y}q5 -${a} 10 0${"t10 0".repeat(13)}V102H-20Z`;

/** Four-point sparkle. */
const spark = (x: number, y: number, r: number) => {
  const k = r * 0.2;
  return `M${x} ${r1(y - r)}Q${r1(x + k)} ${r1(y - k)} ${r1(x + r)} ${y}Q${r1(x + k)} ${r1(y + k)} ${x} ${r1(y + r)}Q${r1(x - k)} ${r1(y + k)} ${r1(x - r)} ${y}Q${r1(x - k)} ${r1(y - k)} ${x} ${r1(y - r)}Z`;
};

/** Five-point star. */
const star5 = (x: number, y: number, r: number) => {
  let d = "";
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 ? r * 0.45 : r;
    d += `${i ? "L" : "M"}${r1(x + rad * Math.cos(a))} ${r1(y + rad * Math.sin(a))}`;
  }
  return d + "Z";
};

/** Fluffy cloud, about 24 x 14, anchored at its bottom-left. */
const CLOUD = "M0 0H22A5 5 0 0 0 22 -10A7 7 0 0 0 10 -14A6 6 0 0 0 0 -10A5 5 0 0 0 0 0Z";

/** Paw print centred on its pad. */
const Paw = ({ x, y, s = 1, fill }: { x: number; y: number; s?: number; fill: string }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} fill={fill} stroke="none">
    <ellipse cx="0" cy="2.5" rx="5" ry="4" />
    <circle cx="-5.6" cy="-3.2" r="2.2" />
    <circle cx="-2" cy="-6.6" r="2.3" />
    <circle cx="2" cy="-6.6" r="2.3" />
    <circle cx="5.6" cy="-3.2" r="2.2" />
  </g>
);

/* ---------------------------------------------------------------- 16 */
const c16 = css(
  ".t16-fly,.t16-w,.t16-g,.t16-sn{transform-box:fill-box;transform-origin:center}.t16-g{transform-origin:50% 100%}",
  ".t16-fly{animation:t16-fly 4s ease-in-out infinite}.t16-w{animation:t16-flap 2s ease-in-out infinite}" +
    ".t16-g{animation:t16-sway 3.5s ease-in-out infinite alternate}.t16-sn{animation:t16-sn 5s ease-in-out infinite alternate}" +
    "@keyframes t16-fly{0%,100%{transform:translate(0,0)}50%{transform:translate(4px,-4px)}}" +
    "@keyframes t16-flap{0%,25%,50%,100%{transform:scaleX(1)}12%,37%{transform:scaleX(.35)}}" +
    "@keyframes t16-sway{from{transform:rotate(-4deg)}to{transform:rotate(4deg)}}" +
    "@keyframes t16-sn{from{transform:translateX(0)}to{transform:translateX(-3px)}}",
);

export const Tile16: TileArt = ({ animate = true, className }) => (
  <Frame className={className} animate={animate} styles={c16}>
    <Sky id="t16-sky" />
    <circle cx="84" cy="15" r="7" fill={P.sun} />
    <path d="M-2 76Q25 70 50 75T102 74V102H-2Z" fill={P.grass} />
    <g className="t16-g" fill={P.grassDeep}>
      <path d="M5 84Q1 58 11 38Q10 60 15 84Z" />
      <path d="M13 84Q17 62 28 52Q20 66 22 84Z" />
    </g>
    <rect x="75" y="60" width="10" height="19" rx="4" fill={P.cream} />
    <path d="M63 62Q80 36 97 62Q80 67 63 62Z" fill={P.berry} />
    <g fill={P.white} stroke="none">
      <circle cx="73" cy="54" r="2.6" />
      <circle cx="83" cy="49" r="2.2" />
      <circle cx="89" cy="57" r="2" />
    </g>
    <path d="M34 77l-3 5M46 78v5M58 77l3 5" fill="none" />
    <path d="M26 78Q26 52 46 52Q66 52 66 78Z" fill={P.groups.red} />
    <path d="M46 52Q42 65 46 78" fill="none" />
    <g fill={P.ink} stroke="none">
      <circle cx="36" cy="63" r="3.3" />
      <circle cx="55" cy="61" r="3.3" />
      <circle cx="58" cy="71" r="2.5" />
      <circle cx="36" cy="72" r="2.3" />
    </g>
    <path d="M21 64Q18 56 12 55M26 63Q27 55 23 50" fill="none" />
    <circle cx="12" cy="55" r="1.8" fill={P.ink} />
    <circle cx="23" cy="50" r="1.8" fill={P.ink} />
    <circle cx="24" cy="71" r="8" fill={P.ink} />
    <circle cx="21" cy="69" r="2.7" fill={P.white} stroke="none" />
    <circle cx="20.5" cy="69.3" r="1.3" fill={P.ink} stroke="none" />
    <circle cx="26.5" cy="74.5" r="1.6" fill={P.blush} stroke="none" />
    <g className="t16-sn">
      <path d="M69 94Q69 85 73 85Q76 85 76 89L92 92Q94 95 90 95H70Q69 95 69 94Z" fill={P.peach} />
      <path d="M71 86L69 81M74 86L75 81" fill="none" strokeWidth="1.5" />
      <circle cx="84" cy="86.5" r="6.5" fill={P.caramel} />
      <path d="M84 87a1.6 1.6 0 1 1 1.6 -1.6a3.4 3.4 0 1 1 -3.4 -3.4" fill="none" strokeWidth="1.5" />
    </g>
    <g className="t16-fly">
      <g className="t16-w">
        <ellipse cx="23" cy="21" rx="7" ry="6" fill={P.groups.orange} />
        <ellipse cx="37" cy="21" rx="7" ry="6" fill={P.groups.orange} />
        <ellipse cx="24" cy="30" rx="5" ry="4.5" fill={P.sun} />
        <ellipse cx="36" cy="30" rx="5" ry="4.5" fill={P.sun} />
      </g>
      <ellipse cx="30" cy="25" rx="2" ry="8" fill={P.cocoa} />
      <path d="M29 17Q27 12 24 11M31 17Q33 12 36 11" fill="none" strokeWidth="1.5" />
    </g>
  </Frame>
);

/* ---------------------------------------------------------------- 18 */
const c18 = css(
  ".t18-ship{transform-box:view-box;transform-origin:44px 74px}.t18-flag{transform-box:fill-box;transform-origin:0 50%}.t18-tw{transform-box:fill-box;transform-origin:center}",
  ".t18-ship{animation:t18-rock 4s ease-in-out infinite}.t18-wv{animation:t18-wv 3s ease-in-out infinite alternate}" +
    ".t18-flag{animation:t18-flag 2s ease-in-out infinite alternate}.t18-tw{animation:t18-tw 2.5s ease-in-out infinite}" +
    "@keyframes t18-rock{0%,100%{transform:rotate(-4deg)}50%{transform:rotate(4deg) translateY(-1px)}}" +
    "@keyframes t18-wv{from{transform:translateX(0)}to{transform:translateX(10px)}}" +
    "@keyframes t18-flag{from{transform:scaleX(1)}to{transform:scaleX(.82)}}" +
    "@keyframes t18-tw{0%,100%{opacity:.2;transform:scale(.6)}50%{opacity:1;transform:scale(1)}}",
);

export const Tile18: TileArt = ({ animate = true, className }) => (
  <Frame className={className} animate={animate} styles={c18}>
    <Sky id="t18-sky" />
    <circle cx="86" cy="15" r="7" fill={P.sun} />
    <path d="M-2 66H102V102H-2Z" fill={P.water} />
    <g className="t18-ship">
      <rect x="42.5" y="7" width="3" height="54" fill={P.cocoa2} />
      <path className="t18-flag" d="M45.5 7H62L58 11.5L62 16H45.5Z" fill={P.ink} />
      <path d="M49 9l6 5M55 9l-6 5" fill="none" stroke={P.white} strokeWidth="1.3" />
      <path d="M28 22Q44 18 60 22Q63 36 60 50Q44 46 28 50Q25 36 28 22Z" fill={P.cream} />
      <Paw x={44} y={37} s={1.25} fill={P.groups.orange} />
      <path d="M12 61L6 56" fill="none" strokeWidth="2.5" />
      <path d="M10 59H78Q74 76 60 76H28Q14 76 10 59Z" fill={P.cocoa} />
      <path d="M13 65H75" fill="none" stroke={P.sand} strokeWidth="2.5" />
      <circle cx="30" cy="70" r="2.2" fill={P.sun} strokeWidth="1.5" />
      <circle cx="44" cy="70" r="2.2" fill={P.sun} strokeWidth="1.5" />
      <circle cx="58" cy="70" r="2.2" fill={P.sun} strokeWidth="1.5" />
    </g>
    <path className="t18-wv" d={wave(77, 4)} fill={P.skyDeep} />
    <path d="M64 102Q68 84 84 84Q100 84 104 102Z" fill={P.sand} />
    <g fill={P.sun} strokeWidth="1.5">
      <circle cx="79" cy="79" r="2.6" />
      <circle cx="84" cy="78" r="2.6" />
      <circle cx="89" cy="79" r="2.6" />
    </g>
    <path d="M74 80H94V90Q94 92 92 92H76Q74 92 74 90Z" fill={P.caramel} />
    <path d="M74 80V78Q74 74 78 74H90Q94 74 94 78V80" fill={P.cocoa} />
    <rect x="81.5" y="78" width="5" height="5" rx="1" fill={P.sun} strokeWidth="1.5" />
    <path className="t18-tw" d={spark(92, 69, 4)} fill={P.white} strokeWidth="1.5" />
  </Frame>
);

/* ---------------------------------------------------------------- 19 */
const RAYS = Array.from({ length: 12 }, (_, i) => {
  const a = (i * Math.PI) / 6;
  const p = (d: number) => `${r1(50 + 95 * Math.cos(a + d))} ${r1(30 + 95 * Math.sin(a + d))}`;
  return `M50 30L${p(-0.13)}L${p(0.13)}Z`;
}).join("");
const LEAVES = [-50, -15, 20, 55, 125, 160, 195, 230].map((deg) => {
  const a = (deg * Math.PI) / 180;
  return { x: r1(50 + 7.5 * Math.cos(a)), y: r1(27 + 7.5 * Math.sin(a)), r: deg + 90 };
});
const c19 = css(
  ".t19-rays{transform-box:view-box;transform-origin:50px 30px}.t19-lid,.t19-tw{transform-box:fill-box;transform-origin:center}.t19-lid{transform-origin:50% 0;transform:scaleY(0)}",
  ".t19-rays{animation:t19-spin 6s linear infinite}.t19-lid{animation:t19-blink 4s ease-in-out infinite}" +
    ".t19-tw{animation:t19-tw 3s ease-in-out infinite}.t19-tw+.t19-tw{animation-delay:-1.5s}" +
    "@keyframes t19-spin{to{transform:rotate(30deg)}}" +
    "@keyframes t19-blink{0%,88%,100%{transform:scaleY(0)}94%{transform:scaleY(1)}}" +
    "@keyframes t19-tw{0%,100%{opacity:.25;transform:scale(.6)}50%{opacity:1;transform:scale(1)}}",
);

export const Tile19: TileArt = ({ animate = true, className }) => (
  <Frame className={className} animate={animate} styles={c19}>
    <Sky id="t19-sky" />
    <path className="t19-rays" d={RAYS} fill={P.sun} opacity=".55" stroke="none" />
    <path className="t19-tw" d={spark(14, 16, 5)} fill={P.white} strokeWidth="1.5" />
    <path className="t19-tw" d={spark(87, 15, 4)} fill={P.white} strokeWidth="1.5" />
    <path d="M-2 80Q50 76 102 80V102H-2Z" fill={P.grass} />
    <rect x="12" y="44" width="76" height="26" fill={P.sand} />
    <rect x="37" y="46" width="26" height="24" rx="3" fill={P.cocoa} />
    {[14, 26, 66, 78].map((x) => (
      <g key={x}>
        <rect x={x} y="44" width="8" height="26" fill={P.white} />
        <path d={`M${x + 4} 47V67`} fill="none" stroke={P.stone} strokeWidth="1.5" />
      </g>
    ))}
    <path d="M8 36L50 12L92 36Z" fill={P.cream} />
    <rect x="10" y="36" width="80" height="8" rx="1.5" fill={P.white} />
    <g fill={P.grassDeep} stroke="none">
      {LEAVES.map((l) => (
        <ellipse key={l.r} cx={l.x} cy={l.y} rx="3.4" ry="1.8" transform={`rotate(${l.r} ${l.x} ${l.y})`} />
      ))}
    </g>
    <path d="M47 34.5L50 33L53 34.5" fill="none" stroke={P.groups.orange} />
    <rect x="6" y="70" width="88" height="5" rx="1" fill={P.stone} />
    <rect x="2" y="75" width="96" height="5" rx="1" fill={P.stone} />
    <path d="M42 51L41 44L46 48M58 51L59 44L54 48" fill={P.caramel} />
    <ellipse cx="50" cy="58" rx="10" ry="12" fill={P.caramel} />
    <ellipse cx="50" cy="62" rx="6" ry="7" fill={P.cream} stroke="none" />
    <circle cx="45.5" cy="54" r="4.2" fill={P.white} />
    <circle cx="54.5" cy="54" r="4.2" fill={P.white} />
    <circle cx="45.5" cy="54" r="2" fill={P.ink} stroke="none" />
    <circle cx="54.5" cy="54" r="2" fill={P.ink} stroke="none" />
    {animate && (
      <g fill={P.caramel} stroke="none">
        <ellipse className="t19-lid" cx="45.5" cy="54" rx="4.4" ry="4.4" />
        <ellipse className="t19-lid" cx="54.5" cy="54" rx="4.4" ry="4.4" />
      </g>
    )}
    <path d="M48.5 58L50 61L51.5 58Z" fill={P.sun} strokeWidth="1.5" />
  </Frame>
);

/* ---------------------------------------------------------------- 21 */
const c21 = css(
  ".t21-palm{transform-box:view-box;transform-origin:44px 76px}",
  ".t21-palm{animation:t21-sway 4s ease-in-out infinite alternate}.t21-wv{animation:t21-wv 3s ease-in-out infinite alternate}" +
    ".t21-gull{animation:t21-gull 6s ease-in-out infinite}" +
    "@keyframes t21-sway{from{transform:rotate(-3deg)}to{transform:rotate(3deg)}}" +
    "@keyframes t21-wv{from{transform:translateX(0)}to{transform:translateX(10px)}}" +
    "@keyframes t21-gull{0%,100%{transform:translate(0,0)}50%{transform:translate(10px,-4px)}}",
);

export const Tile21: TileArt = ({ animate = true, className }) => (
  <Frame className={className} animate={animate} styles={c21}>
    <Sky id="t21-sky" />
    <circle cx="82" cy="17" r="9" fill={P.sun} />
    <path className="t21-gull" d="M10 24Q13 20 16 24Q19 20 22 24" fill="none" />
    <path d="M-2 62H102V102H-2Z" fill={P.water} />
    <path d="M12 84Q50 54 90 84Z" fill={P.sand} />
    <path d="M74 80V48" fill="none" />
    <path d="M60 50Q74 34 88 50Q81 46 74 50Q67 46 60 50Z" fill={P.groups.red} />
    <path d="M74 37Q71 43 69 48Q72 47 74 50Q76 47 79 48Q77 43 74 37Z" fill={P.white} strokeWidth="1.5" />
    <g className="t21-palm">
      <path d="M44 78Q40 52 52 30" fill="none" strokeWidth="8" />
      <path d="M44 78Q40 52 52 30" fill="none" stroke={P.caramel} strokeWidth="4.5" />
      <path d="M52 30Q38 16 26 25Q40 24 52 30Z" fill={P.grassDeep} />
      <path d="M52 30Q36 30 33 45Q42 34 52 30Z" fill={P.grass} />
      <path d="M52 30Q66 16 78 25Q64 24 52 30Z" fill={P.grassDeep} />
      <path d="M52 30Q68 30 71 45Q62 34 52 30Z" fill={P.grass} />
      <path d="M52 30Q44 18 55 11Q57 20 52 30Z" fill={P.grass} />
      <circle cx="49" cy="34" r="3" fill={P.cocoa} />
      <circle cx="55" cy="34" r="3" fill={P.cocoa} />
    </g>
    <path className="t21-wv" d={wave(86, 4)} fill={P.skyDeep} />
  </Frame>
);

/* ---------------------------------------------------------------- 23 */
const c23 = css(
  ".t23-w{transform-box:fill-box;transform-origin:70% 20%}.t23-w2{transform-origin:30% 20%}",
  ".t23-b1{animation:t23-fly 4s ease-in-out infinite}.t23-b2{animation:t23-fly 5s ease-in-out -2s infinite}" +
    ".t23-w{animation:t23-flap 2s ease-in-out infinite}.t23-w2{animation-delay:-.7s}.t23-fe{animation:t23-fe 5s ease-in-out infinite}" +
    "@keyframes t23-fly{0%,100%{transform:translate(0,0)}50%{transform:translate(5px,-3px)}}" +
    "@keyframes t23-flap{0%,30%,60%,100%{transform:rotate(15deg)}15%,45%{transform:rotate(-35deg)}}" +
    "@keyframes t23-fe{0%{opacity:0;transform:translate(0,-6px) rotate(-20deg)}20%{opacity:1}50%{transform:translate(4px,4px) rotate(20deg)}80%{opacity:1}100%{opacity:0;transform:translate(0,14px) rotate(-20deg)}}",
);

export const Tile23: TileArt = ({ animate = true, className }) => (
  <Frame className={className} animate={animate} styles={c23}>
    <Sky id="t23-sky" />
    <path d={CLOUD} transform="translate(56 50) scale(.9)" fill={P.white} />
    <path d={CLOUD} transform="translate(8 16) scale(.7)" fill={P.white} />
    <path d="M-2 80Q50 74 102 80V102H-2Z" fill={P.grass} />
    <g transform="translate(58 44)">
      <g className="t23-fe">
        <path d="M0 -7Q5 -2 0 7Q-5 -2 0 -7Z" fill={P.sun} strokeWidth="1.5" />
        <path d="M0 -4V9" fill="none" strokeWidth="1.5" />
      </g>
    </g>
    <ellipse cx="50" cy="70" rx="31" ry="6" fill={P.cocoa} />
    <ellipse cx="39" cy="64" rx="6" ry="8" fill={P.sky} />
    <ellipse cx="62" cy="65" rx="5.5" ry="7.5" fill={P.blush} />
    <ellipse cx="51" cy="62" rx="6.5" ry="8.5" fill={P.cream} />
    <g fill={P.cocoa} stroke="none">
      <circle cx="49" cy="59" r="1" />
      <circle cx="53" cy="63" r="1.2" />
      <circle cx="37" cy="61" r="1" />
      <circle cx="63" cy="62" r="1" />
    </g>
    <path d="M17 70Q50 80 83 70Q80 92 50 92Q20 92 17 70Z" fill={P.caramel} />
    <path d="M26 78Q36 84 46 82M54 84Q66 84 74 78M32 86Q50 90 68 86" fill="none" stroke={P.cocoa} strokeWidth="1.5" />
    <path d="M14 68L20 72M86 67L80 72" fill="none" />
    <g className="t23-b1">
      <path d="M18 32L9 28L11 37Z" fill={P.groups.red} />
      <circle cx="26" cy="33" r="8" fill={P.groups.red} />
      <circle cx="29.5" cy="30.5" r="1.6" fill={P.ink} stroke="none" />
      <path d="M33.5 32L38.5 34L33.5 36Z" fill={P.sun} strokeWidth="1.5" />
      <ellipse className="t23-w" cx="23" cy="34" rx="5" ry="3.5" fill={P.blush} />
    </g>
    <g className="t23-b2">
      <path d="M79 22L87 18L86 26Z" fill={P.groups.blue} />
      <circle cx="73" cy="23" r="6.5" fill={P.groups.blue} />
      <circle cx="70" cy="21" r="1.4" fill={P.ink} stroke="none" />
      <path d="M66.8 22L62.5 24L66.8 26Z" fill={P.sun} strokeWidth="1.5" />
      <ellipse className="t23-w t23-w2" cx="75.5" cy="24" rx="4" ry="3" fill={P.sky} />
    </g>
  </Frame>
);

/* ---------------------------------------------------------------- 24 */
const c24 = css(
  ".t24-sp{transform-box:fill-box;transform-origin:50% 100%}",
  ".t24-wh{animation:t24-bob 4s ease-in-out infinite}.t24-sp{animation:t24-sp 2s ease-in-out infinite}" +
    ".t24-fish{animation:t24-fish 5s ease-in-out infinite alternate}.t24-bub{animation:t24-bub 3s ease-in-out infinite}.t24-bub+.t24-bub{animation-delay:-1.5s}" +
    "@keyframes t24-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(2px)}}" +
    "@keyframes t24-sp{0%,100%{transform:scale(.8,.6);opacity:.6}50%{transform:scale(1,1.1);opacity:1}}" +
    "@keyframes t24-fish{from{transform:translateX(4px)}to{transform:translateX(-8px)}}" +
    "@keyframes t24-bub{0%{transform:translateY(0);opacity:0}20%{opacity:1}100%{transform:translateY(-18px);opacity:0}}",
);

export const Tile24: TileArt = ({ animate = true, className }) => (
  <Frame className={className} animate={animate} styles={c24}>
    <defs>
      <linearGradient id="t24-sea" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={P.water} />
        <stop offset="1" stopColor={P.waterDeep} />
      </linearGradient>
    </defs>
    <rect width="100" height="100" fill={P.sky} stroke="none" />
    <path d={`M-20 17q5 -3 10 0${"t10 0".repeat(13)}V102H-20Z`} fill="url(#t24-sea)" />
    <path d="M-2 86Q30 81 50 85T102 84V102H-2Z" fill={P.sand} />
    <path d="M12 94V80M12 86L6 78V74M12 84L18 76V72" fill="none" strokeWidth="7" />
    <path d="M12 94V80M12 86L6 78V74M12 84L18 76V72" fill="none" stroke={P.blush} strokeWidth="3.5" />
    <path d="M90 95Q85 86 89 78Q93 70 89 62" fill="none" strokeWidth="6" />
    <path d="M90 95Q85 86 89 78Q93 70 89 62" fill="none" stroke={P.grassDeep} strokeWidth="2.5" />
    <g className="t24-wh">
      <g className="t24-sp" fill={P.white} strokeWidth="1.5">
        <path d="M34 23Q33 13 36 5Q39 13 38 23Z" />
        <path d="M36 9Q28 3 21 9Q28 8 35 13Z" />
        <path d="M36 9Q44 3 51 9Q44 8 37 13Z" />
      </g>
      <path d="M12 42Q12 22 38 22Q60 22 70 38L83 26Q90 29 86 38Q92 42 88 48L72 46Q62 58 38 58Q12 58 12 42Z" fill={P.purple} />
      <path d="M16 49Q26 56 40 56Q57 56 65 49Q42 53 16 49Z" fill={P.cream} strokeWidth="1.5" />
      <path d="M40 50Q44 59 51 57Q47 50 40 50Z" fill={P.purple} />
      <circle cx="25" cy="39" r="2.3" fill={P.ink} stroke="none" />
      <circle cx="24.3" cy="38.3" r=".8" fill={P.white} stroke="none" />
      <path d="M17 45Q21 48 26 46" fill="none" strokeWidth="1.5" />
      <ellipse cx="30" cy="44.5" rx="2.6" ry="1.5" fill={P.blush} stroke="none" />
    </g>
    <g className="t24-fish" strokeWidth="1.5">
      <path d="M71 68L77 64V72Z" fill={P.sun} />
      <ellipse cx="66" cy="68" rx="6" ry="4" fill={P.sun} />
      <circle cx="63.5" cy="67" r=".9" fill={P.ink} stroke="none" />
      <path d="M58 77L63 73.5V80.5Z" fill={P.groups.orange} />
      <ellipse cx="53" cy="77" rx="5" ry="3.5" fill={P.groups.orange} />
      <circle cx="51" cy="76" r=".9" fill={P.ink} stroke="none" />
    </g>
    <g fill="none" stroke={P.white} strokeWidth="1.5">
      <circle className="t24-bub" cx="28" cy="70" r="2.6" />
      <circle className="t24-bub" cx="34" cy="78" r="1.9" />
    </g>
  </Frame>
);

/* ---------------------------------------------------------------- 26 */
const c26 = css(
  ".t26-lp{transform-box:fill-box;transform-origin:50% 100%}",
  ".t26-st{animation:t26-st 4s ease-in-out infinite}.t26-sp{animation:t26-tw 2.5s ease-in-out infinite}.t26-sp2{animation-delay:-1.25s}" +
    ".t26-lp{animation:t26-lp 4s ease-in-out infinite alternate}.t26-lp+.t26-lp{animation-delay:-2s}" +
    "@keyframes t26-st{0%{transform:translateY(2px);opacity:0}30%{opacity:1}100%{transform:translateY(-8px);opacity:0}}" +
    "@keyframes t26-tw{0%,100%{opacity:1}50%{opacity:.2}}" +
    "@keyframes t26-lp{from{transform:rotate(-4deg)}to{transform:rotate(4deg)}}",
);

const SWIRL = (x: number, y: number) => `M${x} ${y}A2.5 2.5 0 0 1 ${x + 5} ${y}A5 5 0 0 1 ${x - 5} ${y}A6 6 0 0 1 ${x + 7} ${y}`;

export const Tile26: TileArt = ({ animate = true, className }) => (
  <Frame className={className} animate={animate} styles={c26}>
    <Sky id="t26-sky" />
    <path d="M-2 78Q50 74 102 78V102H-2Z" fill={P.grass} />
    <path d="M44 78L38 102H62L56 78Z" fill={P.sand} />
    <g className="t26-lp">
      <rect x="10.5" y="54" width="3" height="27" fill={P.white} />
      <circle cx="12" cy="49" r="9" fill={P.berry} />
      <path d={SWIRL(12, 49)} fill="none" stroke={P.white} />
    </g>
    <g className="t26-lp">
      <rect x="86.5" y="58" width="3" height="23" fill={P.white} />
      <circle cx="88" cy="53" r="8" fill={P.groups.yellow} />
      <path d={SWIRL(87, 53)} fill="none" stroke={P.groups.orange} />
    </g>
    <g transform="translate(64 21)">
      <g className="t26-st" fill="none">
        <path d="M0 0Q-4 -4 0 -8Q4 -12 0 -16" strokeWidth="5" />
        <path d="M0 0Q-4 -4 0 -8Q4 -12 0 -16" stroke={P.white} strokeWidth="2.6" />
      </g>
    </g>
    <rect x="60" y="27" width="8" height="16" fill={P.berry} />
    <rect x="58.5" y="23" width="11" height="5" rx="2.5" fill={P.white} />
    <rect x="28" y="47" width="44" height="31" fill={P.caramel} />
    <path d="M20 50L50 21L80 50Z" fill={P.blush} />
    <path d={`M22 48H78V51${"q-3.5 4 -7 0".repeat(8)}Z`} fill={P.white} />
    <g strokeWidth="2.2">
      <path className="t26-sp" d="M38 40l2.5 -1.5M58 36l2 2M47 31l2.5 1" fill="none" stroke={P.sun} />
      <path className="t26-sp t26-sp2" d="M43 42l2.5 1M53 41l2 -2M64 43l2.5 1M50 26v2.5" fill="none" stroke={P.skyDeep} />
    </g>
    <circle cx="37" cy="61" r="5" fill={P.sun} />
    <circle cx="63" cy="61" r="5" fill={P.sun} />
    <path d="M32 61h10M37 56v10M58 61h10M63 56v10" fill="none" stroke={P.cocoa} strokeWidth="1.5" />
    <path d="M43 78V67Q43 60 50 60Q57 60 57 67V78Z" fill={P.furDeep} />
    <g fill={P.cocoa} stroke="none">
      <circle cx="47.5" cy="66" r="1.3" />
      <circle cx="53" cy="68" r="1.3" />
      <circle cx="48" cy="73" r="1.3" />
      <circle cx="53.5" cy="74.5" r="1.1" />
    </g>
    <path className="t26-sp" d={spark(90, 18, 4.5)} fill={P.white} strokeWidth="1.5" />
  </Frame>
);

/* ---------------------------------------------------------------- 27 */
const c27 = css(
  ".t27-bot,.t27-top{transform-box:fill-box;transform-origin:50% 100%}.t27-key{transform-box:view-box;transform-origin:73px 69px}.t27-sh{transform-box:fill-box;transform-origin:center}",
  ".t27-bot{animation:t27-wad 2s ease-in-out infinite alternate}.t27-key{animation:t27-key 3s ease-in-out infinite}" +
    ".t27-ball{animation:t27-ball 2s ease-in-out infinite}.t27-sh{animation:t27-sh 2s ease-in-out infinite}.t27-top{animation:t27-top 2.4s ease-in-out infinite}" +
    "@keyframes t27-wad{from{transform:rotate(-3deg)}to{transform:rotate(3deg)}}" +
    "@keyframes t27-key{to{transform:rotate(360deg)}}" +
    "@keyframes t27-ball{0%,100%{transform:translateY(0)}50%{transform:translateY(-20px)}}" +
    "@keyframes t27-sh{0%,100%{transform:scale(1);opacity:.3}50%{transform:scale(.5);opacity:.12}}" +
    "@keyframes t27-top{0%,100%{transform:rotate(-7deg)}50%{transform:rotate(7deg)}}",
);

export const Tile27: TileArt = ({ animate = true, className }) => (
  <Frame className={className} animate={animate} styles={c27}>
    <Sky id="t27-sky" />
    <path d="M-2 78H102V102H-2Z" fill={P.sand} />
    <path d="M-2 89H102M30 78L26 89M70 78L74 89M50 89L48 102" fill="none" stroke={P.caramel} strokeWidth="1.5" />
    <rect x="5" y="62" width="17" height="17" rx="2" fill={P.groups.red} />
    <rect x="22" y="63" width="16" height="16" rx="2" fill={P.groups.blue} />
    <rect x="13" y="46" width="16" height="16" rx="2" fill={P.groups.yellow} />
    <g fill={P.white} stroke="none">
      <path d={star5(13.5, 71, 5)} />
      <circle cx="30" cy="71" r="4" />
      <path d="M21 50L26 58H16Z" />
    </g>
    <g className="t27-bot">
      <path d="M53 34V27" fill="none" />
      <circle cx="53" cy="25" r="2.6" fill={P.groups.red} />
      <rect x="44" y="73" width="6" height="7" rx="1" fill={P.stone} />
      <rect x="56" y="73" width="6" height="7" rx="1" fill={P.stone} />
      <rect x="34" y="55" width="6" height="11" rx="3" fill={P.stone} />
      <g className="t27-key">
        <path d="M66 69H73" fill="none" />
        <ellipse cx="73" cy="65" rx="2.6" ry="3.6" fill={P.sun} />
        <ellipse cx="73" cy="73" rx="2.6" ry="3.6" fill={P.sun} />
      </g>
      <rect x="39" y="52" width="28" height="23" rx="4" fill={P.white} />
      <rect x="46" y="58" width="14" height="8" rx="2" fill={P.sky} />
      <circle cx="50" cy="62" r="1.6" fill={P.groups.red} stroke="none" />
      <circle cx="56" cy="62" r="1.6" fill={P.groups.yellow} stroke="none" />
      <rect x="42" y="34" width="22" height="18" rx="5" fill={P.stone} />
      <circle cx="48" cy="42" r="3.2" fill={P.white} />
      <circle cx="58" cy="42" r="3.2" fill={P.white} />
      <circle cx="48" cy="42.3" r="1.5" fill={P.ink} stroke="none" />
      <circle cx="58" cy="42.3" r="1.5" fill={P.ink} stroke="none" />
      <path d="M49 48h8" fill="none" />
    </g>
    <ellipse className="t27-sh" cx="86" cy="85" rx="7" ry="1.8" fill={P.ink} opacity=".3" stroke="none" />
    <g className="t27-ball">
      <circle cx="86" cy="77" r="7" fill={P.groups.pink} />
      <path d="M79.5 75Q86 79 92.5 75" fill="none" stroke={P.white} strokeWidth="2.2" />
    </g>
    <g className="t27-top">
      <rect x="25.5" y="78" width="3" height="5" rx="1" fill={P.cocoa} />
      <path d="M16 88Q27 76 38 88Q33 93 27 98Q21 93 16 88Z" fill={P.purple} />
      <path d="M18 88Q27 83 36 88" fill="none" stroke={P.sun} strokeWidth="2.2" />
    </g>
  </Frame>
);

/* ---------------------------------------------------------------- 29 */
const fluff = (cx: number, cy: number, r: number, ri: number, n: number) => {
  const rc = 2 * r - ri * Math.cos(Math.PI / n);
  const pt = (rad: number, a: number) => `${r1(cx + rad * Math.cos(a))} ${r1(cy + rad * Math.sin(a))}`;
  let d = `M${pt(ri, 0)}`;
  for (let i = 0; i < n; i++) d += `Q${pt(rc, ((i + 0.5) / n) * Math.PI * 2)} ${pt(ri, ((i + 1) / n) * Math.PI * 2)}`;
  return d + "Z";
};
const HEAD29 = fluff(70, 71, 12, 10.3, 13);
const c29 = css(
  ".t29-glow,.t29-puff{transform-box:fill-box;transform-origin:center}.t29-lan{transform-box:view-box;transform-origin:34px 38px}",
  ".t29-glow{animation:t29-fl 2.2s ease-in-out infinite}.t29-lan{animation:t29-sw 4s ease-in-out infinite alternate}" +
    ".t29-pom{animation:t29-peek 4s ease-in-out infinite}.t29-puff{animation:t29-puff 2s ease-in-out infinite}.t29-puff+.t29-puff{animation-delay:-1s}" +
    "@keyframes t29-fl{0%,100%{opacity:.3;transform:scale(.9)}40%{opacity:.5;transform:scale(1)}70%{opacity:.38}}" +
    "@keyframes t29-sw{from{transform:rotate(-6deg)}to{transform:rotate(6deg)}}" +
    "@keyframes t29-peek{0%,100%{transform:translateY(5px)}35%,75%{transform:translateY(0)}}" +
    "@keyframes t29-puff{0%{opacity:0;transform:scale(.4)}40%{opacity:.9}100%{opacity:0;transform:scale(1.3) translateY(-3px)}}",
);

export const Tile29: TileArt = ({ animate = true, className }) => (
  <Frame className={className} animate={animate} styles={c29}>
    <rect width="100" height="14" fill={P.sky} stroke="none" />
    <rect x="-2" y="17" width="104" height="86" fill={P.caramel} stroke="none" />
    <path d="M-2 12H102V18H-2Z" fill={P.grassDeep} />
    <path d="M8 12l-1 -4M12 12l1 -5M46 12l-1 -4M50 12l1 -5M88 12l-1 -4M92 12l1 -5" fill="none" stroke={P.grassDeep} />
    <path d="M22 18Q20 26 24 31Q27 35 22 40M60 18Q62 24 58 30M84 18Q82 25 86 31M84 24l4 2" fill="none" stroke={P.cocoa} />
    <g fill={P.stone} strokeWidth="1.5">
      <ellipse cx="10" cy="28" rx="4" ry="2.6" />
      <ellipse cx="72" cy="26" rx="3.2" ry="2.2" />
      <ellipse cx="18" cy="94" rx="4.5" ry="2.8" />
      <ellipse cx="48" cy="95" rx="3" ry="2" />
    </g>
    <path d="M-2 42Q20 34 50 38Q80 34 102 42V86Q50 92 -2 86Z" fill={P.cocoa2} />
    <circle className="t29-glow" cx="34" cy="53" r="17" fill={P.sun} opacity=".4" stroke="none" />
    <circle cx="34" cy="52" r="10" fill={P.sun} opacity=".3" stroke="none" />
    <ellipse cx="70" cy="87" rx="14" ry="4.5" fill={P.ink} />
    <g className="t29-pom">
      <path d="M61 66Q57 56 60 52Q65 55 67 61Z" fill={P.peach} />
      <path d="M79 66Q83 56 80 52Q75 55 73 61Z" fill={P.peach} />
      <path d={HEAD29} fill={P.fur} />
      <ellipse cx="70" cy="75" rx="4.8" ry="3.4" fill={P.cream} stroke="none" />
      <circle cx="65.6" cy="70" r="2" fill={P.ink} stroke="none" />
      <circle cx="74.4" cy="70" r="2" fill={P.ink} stroke="none" />
      <circle cx="65" cy="69.4" r=".7" fill={P.white} stroke="none" />
      <circle cx="73.8" cy="69.4" r=".7" fill={P.white} stroke="none" />
      <ellipse cx="70" cy="73.6" rx="1.7" ry="1.2" fill={P.ink} stroke="none" />
      <path d="M69.2 76.6Q70 80 70.8 76.6Z" fill={P.tongue} strokeWidth="1" />
      <path d="M67.8 76Q70 77.6 72.2 76" fill="none" strokeWidth="1.3" />
      <ellipse cx="63" cy="74.5" rx="1.9" ry="1.1" fill={P.blush} stroke="none" />
      <ellipse cx="77" cy="74.5" rx="1.9" ry="1.1" fill={P.blush} stroke="none" />
    </g>
    <path d="M-2 86Q50 92 102 86V102H-2Z" fill={P.caramel} />
    <g fill={P.fur} stroke="none">
      <circle className="t29-puff" cx="54" cy="84" r="3.2" />
      <circle className="t29-puff" cx="87" cy="83" r="2.8" />
    </g>
    <g className="t29-lan">
      <path d="M34 38V44" fill="none" stroke={P.furShade} />
      <rect x="29.5" y="44" width="9" height="3" rx="1" fill={P.cocoa} stroke={P.furShade} strokeWidth="1.5" />
      <rect x="30.5" y="47" width="7" height="10" rx="1.5" fill={P.sun} />
      <rect x="29.5" y="57" width="9" height="3" rx="1" fill={P.cocoa} stroke={P.furShade} strokeWidth="1.5" />
    </g>
  </Frame>
);

/* ---------------------------------------------------------------- 05 */
const c05 = css(
  ".t05-ball{transform-box:fill-box;transform-origin:50% 100%}.t05-sh{transform-box:fill-box;transform-origin:center}",
  ".t05-ball{animation:t05-b 2s ease-in-out infinite}.t05-sh{animation:t05-sh 2s ease-in-out infinite}.t05-sq{animation:t05-sq 2s ease-in-out infinite}" +
    "@keyframes t05-b{0%,100%{transform:translateY(0) scale(1.08,.9)}12%,88%{transform:translateY(-4px) scale(1)}50%{transform:translateY(-20px) scale(.97,1.03)}}" +
    "@keyframes t05-sh{0%,100%{transform:scale(1);opacity:.3}50%{transform:scale(.55);opacity:.12}}" +
    "@keyframes t05-sq{0%,100%{opacity:1}20%,80%{opacity:0}}",
);

export const Tile05: TileArt = ({ animate = true, className }) => (
  <Frame className={className} animate={animate} styles={c05}>
    <Plain />
    <ellipse className="t05-sh" cx="50" cy="83" rx="17" ry="3.5" fill={P.cocoa} opacity=".3" stroke="none" />
    <path className="t05-sq" d="M27 70l-6 -3M26 77h-7M73 70l6 -3M74 77h7" fill="none" strokeWidth="2.2" />
    <g className="t05-ball">
      <circle cx="50" cy="62" r="19" fill={P.groups.red} strokeWidth="2.4" />
      <path d="M31.5 66Q50 74 68.5 66" fill="none" stroke={P.white} strokeWidth="3" />
      <path d={star5(50, 59, 8.5)} fill={P.white} strokeWidth="1.5" />
      <ellipse cx="41" cy="50" rx="4.5" ry="2.4" fill={P.white} opacity=".7" stroke="none" transform="rotate(-35 41 50)" />
    </g>
  </Frame>
);

/* ---------------------------------------------------------------- 15 */
const BONE = (
  <>
    <rect x="26" y="45" width="48" height="14" rx="4" />
    <circle cx="26" cy="45" r="8" />
    <circle cx="26" cy="59" r="8" />
    <circle cx="74" cy="45" r="8" />
    <circle cx="74" cy="59" r="8" />
  </>
);
const c15 = css(
  ".t15-bone,.t15-tw{transform-box:fill-box;transform-origin:center}",
  ".t15-bone{animation:t15-rock 3s ease-in-out infinite}.t15-tw{animation:t15-tw 2.4s ease-in-out infinite}" +
    ".t15-d1{animation-delay:-.8s}.t15-d2{animation-delay:-1.6s}" +
    "@keyframes t15-rock{0%,100%{transform:rotate(-7deg)}50%{transform:rotate(7deg) translateY(-2px)}}" +
    "@keyframes t15-tw{0%,100%{opacity:.2;transform:scale(.5)}50%{opacity:1;transform:scale(1)}}",
);

export const Tile15: TileArt = ({ animate = true, className }) => (
  <Frame className={className} animate={animate} styles={c15}>
    <Plain />
    <Paw x={20} y={82} s={0.9} fill={P.furDeep} />
    <ellipse cx="52" cy="80" rx="26" ry="3.5" fill={P.cocoa} opacity=".2" stroke="none" />
    <g transform="rotate(-18 50 52)">
      <g className="t15-bone">
        <g fill={P.ink} strokeWidth="4.6">{BONE}</g>
        <g fill={P.white} stroke="none">{BONE}</g>
        <path d="M32 55H66M20 42Q22 39 25 39M80 42Q78 39 75 39" fill="none" stroke={P.furShade} strokeWidth="2" />
      </g>
    </g>
    <path className="t15-tw" d={spark(80, 24, 6)} fill={P.sun} strokeWidth="1.5" />
    <path className="t15-tw t15-d1" d={spark(22, 28, 4.5)} fill={P.sun} strokeWidth="1.5" />
    <path className="t15-tw t15-d2" d={spark(84, 74, 3.5)} fill={P.white} strokeWidth="1.5" />
  </Frame>
);

/* ---------------------------------------------------------------- 25 */
const c25 = css(
  ".t25-h{transform-box:fill-box;transform-origin:center}",
  ".t25-k{animation:t25-drop 3s ease-in infinite}.t25-st{animation:t25-st 4s ease-in-out infinite}.t25-st2{animation-delay:-2s}.t25-h{animation:t25-h 2s ease-in-out infinite}" +
    "@keyframes t25-drop{0%{transform:translateY(-30px);opacity:0}15%{opacity:1}45%{transform:translateY(0);animation-timing-function:ease-out}55%{transform:translateY(-4px)}65%{transform:translateY(0);opacity:1}90%,100%{transform:translateY(0);opacity:0}}" +
    "@keyframes t25-st{0%{transform:translateY(2px);opacity:0}30%{opacity:.9}100%{transform:translateY(-8px);opacity:0}}" +
    "@keyframes t25-h{0%,100%{transform:scale(1)}50%{transform:scale(1.15)}}",
);

export const Tile25: TileArt = ({ animate = true, className }) => (
  <Frame className={className} animate={animate} styles={c25}>
    <Plain />
    <ellipse cx="50" cy="84" rx="28" ry="3.5" fill={P.cocoa} opacity=".2" stroke="none" />
    <g fill="none" stroke={P.stone} strokeWidth="2.5">
      <path className="t25-st" d="M30 40Q26 36 30 32Q34 28 30 24" />
      <path className="t25-st t25-st2" d="M71 40Q67 36 71 32Q75 28 71 24" />
    </g>
    <ellipse cx="50" cy="60" rx="29" ry="7" fill={P.skyDeep} />
    <path d="M26 61Q30 47 50 46Q70 47 74 61Z" fill={P.caramel} />
    <g strokeWidth="1.5">
      <circle cx="36" cy="55" r="3.3" fill={P.cocoa} />
      <circle cx="44" cy="50" r="3.3" fill={P.caramel} />
      <circle cx="53" cy="49" r="3.3" fill={P.cocoa} />
      <circle cx="61" cy="52" r="3.3" fill={P.caramel} />
      <circle cx="67" cy="57" r="3.3" fill={P.cocoa} />
      <circle cx="47" cy="57" r="3.3" fill={P.cocoa} />
      <circle cx="56" cy="57" r="3.3" fill={P.caramel} />
    </g>
    <g transform="translate(49 43)">
      <g className="t25-k">
        <circle r="3.4" fill={P.cocoa} strokeWidth="1.5" />
      </g>
    </g>
    <path d="M21 60Q50 72 79 60L73 82Q50 89 27 82Z" fill={P.groups.blue} />
    <path className="t25-h" d="M50 82C42 77 42 70 46.5 70C48.5 70 50 72 50 72C50 72 51.5 70 53.5 70C58 70 58 77 50 82Z" fill={P.blush} strokeWidth="1.8" />
  </Frame>
);

/* ---------------------------------------------------------------- 35 */
const ZED = "M0 0H7L0 8H7";
const c35 = css(
  ".t35-bed{transform-box:fill-box;transform-origin:50% 100%}",
  ".t35-bed{animation:t35-br 4s ease-in-out infinite}.t35-z{animation:t35-z 4.5s ease-in-out infinite}" +
    ".t35-z1{animation-delay:-1.5s}.t35-z2{animation-delay:-3s}" +
    "@keyframes t35-br{0%,100%{transform:scale(1)}50%{transform:scale(1.03,1.05)}}" +
    "@keyframes t35-z{0%{opacity:0;transform:translate(0,4px)}25%{opacity:1}100%{opacity:0;transform:translate(6px,-10px)}}",
);

export const Tile35: TileArt = ({ animate = true, className }) => (
  <Frame className={className} animate={animate} styles={c35}>
    <Plain />
    <path d="M24.1 14.2A8 8 0 1 0 33.8 23.9A7 7 0 0 1 24.1 14.2Z" fill={P.sun} strokeWidth="1.5" />
    <ellipse cx="50" cy="85" rx="36" ry="3.5" fill={P.cocoa} opacity=".2" stroke="none" />
    <g className="t35-bed">
      <ellipse cx="50" cy="62" rx="38" ry="16" fill={P.purple} />
      <ellipse cx="50" cy="61" rx="27" ry="8.5" fill={P.cream} />
      <path d="M27 64Q33 46 52 47Q70 46 74 62Q50 70 27 64Z" fill={P.blush} />
      <path d="M40 52Q50 50 62 53" fill="none" stroke={P.white} strokeWidth="1.5" strokeDasharray="2 3" />
      <path d="M12 62Q12 84 50 84Q88 84 88 62Q86 73 50 73Q14 73 12 62Z" fill={P.purple} />
      <path d="M24 77q3 -2 6 0M46 80q3 -2 6 0M68 77q3 -2 6 0" fill="none" stroke={P.white} strokeWidth="1.5" />
    </g>
    <g fill="none" strokeWidth="2.2">
      <g transform="translate(60 36) scale(.7)">
        <path className="t35-z" d={ZED} />
      </g>
      <g transform="translate(68 25) scale(.9)">
        <path className="t35-z t35-z1" d={ZED} />
      </g>
      <g transform="translate(78 12) scale(1.15)">
        <path className="t35-z t35-z2" d={ZED} />
      </g>
    </g>
  </Frame>
);
