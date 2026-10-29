// Tile artwork set A: the four corners (0, 10, 20, 30) and properties 1, 3, 6, 8, 9, 11, 13, 14.
import { P } from "~/art/palette";
import type { TileArt } from "~/art/types";

const INK = { stroke: P.ink, strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const SVG = { viewBox: "0 0 100 100", width: "100%", height: "100%", preserveAspectRatio: "xMidYMid meet" } as const;
const TAU = Math.PI * 2;
const r1 = (n: number) => Math.round(n * 10) / 10;

/** Wraps CSS rules so they only run when motion is allowed. */
const motion = (css: string) => <style>{`@media (prefers-reduced-motion: no-preference){${css}}`}</style>;

/** Scalloped circle (fluff, petals). Peaks reach r, valleys sit at ri. */
const scallop = (cx: number, cy: number, r: number, ri: number, n: number) => {
  const rc = 2 * r - ri * Math.cos(Math.PI / n);
  const pt = (rad: number, a: number) => `${r1(cx + rad * Math.cos(a))} ${r1(cy + rad * Math.sin(a))}`;
  let d = `M${pt(ri, 0)}`;
  for (let i = 0; i < n; i++) d += `Q${pt(rc, ((i + 0.5) / n) * TAU)} ${pt(ri, ((i + 1) / n) * TAU)}`;
  return d + "Z";
};

/** Four-point sparkle. */
const star4 = (x: number, y: number, r: number) =>
  `M${x} ${y - r}Q${x} ${y} ${x + r} ${y}Q${x} ${y} ${x} ${y + r}Q${x} ${y} ${x - r} ${y}Q${x} ${y} ${x} ${y - r}Z`;

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

const HEAD = scallop(0, 0, 12, 10.2, 13);

/** Dimsam's head, centred on (x, y), radius about 12 * s. */
const Pom = ({ x, y, s = 1, mood = "happy" }: { x: number; y: number; s?: number; mood?: "happy" | "grumpy" | "shock" }) => {
  const thin = 1.1 / s;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} strokeWidth={2 / s}>
      <path d="M-10 -3L-9 -17L-1.5 -9Z" fill={P.peach} />
      <path d="M10 -3L9 -17L1.5 -9Z" fill={P.peach} />
      <path d={HEAD} fill={P.fur} />
      <ellipse cx="0" cy="4.2" rx="5" ry="3.6" fill={P.cream} stroke="none" />
      <ellipse cx="-7.2" cy="3" rx="1.9" ry="1.1" fill={P.blush} stroke="none" />
      <ellipse cx="7.2" cy="3" rx="1.9" ry="1.1" fill={P.blush} stroke="none" />
      {mood === "shock" ? (
        <g strokeWidth={thin}>
          <circle cx="-4.4" cy="-1.5" r="2.7" fill={P.white} />
          <circle cx="4.4" cy="-1.5" r="2.7" fill={P.white} />
          <circle cx="-4.2" cy="-1.3" r="1.2" fill={P.ink} stroke="none" />
          <circle cx="4.2" cy="-1.3" r="1.2" fill={P.ink} stroke="none" />
          <ellipse cx="0" cy="6.2" rx="1.5" ry="1.9" fill={P.cocoa2} />
        </g>
      ) : (
        <g stroke="none" fill={P.ink}>
          <circle cx="-4.3" cy="-1.2" r="2" />
          <circle cx="4.3" cy="-1.2" r="2" />
          <circle cx="-3.7" cy="-1.9" r="0.7" fill={P.white} />
          <circle cx="4.9" cy="-1.9" r="0.7" fill={P.white} />
        </g>
      )}
      {mood === "grumpy" && (
        <g strokeWidth={thin * 1.3} fill="none">
          <path d="M-7 -3.6H-1.8M1.8 -3.6H7" stroke={P.fur} strokeWidth={2.4 / s} />
          <path d="M-7 -6L-2.2 -4.2M7 -6L2.2 -4.2" />
          <path d="M-2.2 7Q0 5.6 2.2 7" />
        </g>
      )}
      <ellipse cx="0" cy="2.6" rx="1.8" ry="1.3" fill={P.ink} stroke="none" />
      {mood === "happy" && (
        <g strokeWidth={thin}>
          <path d="M-1.1 5.3Q0 9 1.1 5.3Z" fill={P.tongue} />
          <path d="M-2.6 4.6Q-1.3 6 0 4.4Q1.3 6 2.6 4.6" fill="none" />
        </g>
      )}
    </g>
  );
};

/** Paw print centred on its pad. */
const Paw = ({ fill }: { fill: string }) => (
  <g fill={fill} stroke="none">
    <ellipse cx="0" cy="1.6" rx="3" ry="2.5" />
    <circle cx="-3.3" cy="-2.2" r="1.3" />
    <circle cx="-1.1" cy="-3.7" r="1.3" />
    <circle cx="1.3" cy="-3.7" r="1.3" />
    <circle cx="3.4" cy="-2.1" r="1.3" />
  </g>
);

/** Outlined tube along a path (cactus, neck, stems). */
const Tube = ({ d, w, fill }: { d: string; w: number; fill: string }) => (
  <g fill="none" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} stroke={P.ink} strokeWidth={w + 4} />
    <path d={d} stroke={fill} strokeWidth={w} />
  </g>
);

const Bone = ({ fill }: { fill: string }) => (
  <g>
    <circle cx="-20" cy="-4.2" r="5" fill={fill} />
    <circle cx="-20" cy="4.2" r="5" fill={fill} />
    <circle cx="20" cy="-4.2" r="5" fill={fill} />
    <circle cx="20" cy="4.2" r="5" fill={fill} />
    <rect x="-20" y="-4" width="40" height="8" fill={fill} stroke="none" />
    <path d="M-17 -4H17M-17 4H17" />
  </g>
);

/* ---------------------------------------------------------------- corners */

const css00 = `.t00-tail{transform-box:fill-box;transform-origin:10% 90%;animation:t00-wag 2s ease-in-out infinite}
@keyframes t00-wag{0%,100%{transform:rotate(-14deg)}50%{transform:rotate(16deg)}}
.t00-head{animation:t00-peek 3.6s ease-in-out .4s infinite}
@keyframes t00-peek{0%,100%{transform:translateY(0)}50%{transform:translateY(-1.6px)}}
.t00-arrow{animation:t00-go 2.4s ease-in-out infinite}
@keyframes t00-go{0%,100%{transform:translateX(-2px)}50%{transform:translateX(3px)}}`;

export const Tile00: TileArt = ({ animate = true, className }) => (
  <svg {...SVG} className={className}>
    {animate && motion(css00)}
    <rect width="100" height="100" fill={P.sky} />
    <rect y="76" width="100" height="24" fill={P.grass} />
    <g {...INK}>
      <circle cx="13" cy="13" r="6.5" fill={P.sun} />
      <path className="t00-tail" d={scallop(78, 56, 7.5, 6, 9)} fill={P.fur} />
      <rect x="22" y="43" width="46" height="37" rx="2" fill={P.caramel} />
      <path d="M13 47L45 18L77 47Z" fill={P.berry} />
      <path d="M33 80V63A12 12 0 0 1 57 63V80Z" fill={P.cocoa2} />
      <g transform="translate(45 36)"><Paw fill={P.cream} /></g>
      <g className="t00-head"><Pom x={45} y={69} s={0.86} /></g>
      <path className="t00-arrow" d="M14 84H62V79L80 88.5L62 98V93H14Z" fill={P.groups.red} />
    </g>
  </svg>
);

const css10 = `.t10-b{animation:t10-rise 4s ease-in-out infinite}
.t10-b2{animation-delay:1.3s;animation-duration:4.6s}.t10-b3{animation-delay:2.6s;animation-duration:5.2s}
@keyframes t10-rise{0%{transform:translateY(0);opacity:0}20%{opacity:.95}100%{transform:translateY(-26px);opacity:0}}
.t10-duck{transform-box:fill-box;transform-origin:50% 100%;animation:t10-bob 3s ease-in-out infinite}
@keyframes t10-bob{0%,100%{transform:rotate(-8deg) translateY(0)}50%{transform:rotate(8deg) translateY(-1.5px)}}`;

export const Tile10: TileArt = ({ animate = true, className }) => (
  <svg {...SVG} className={className}>
    {animate && motion(css10)}
    <rect width="100" height="100" fill={P.sky} />
    <path d="M0 20H100M0 40H100M0 60H100M25 0V76M50 0V76M75 0V76" stroke={P.white} strokeOpacity=".55" strokeWidth="1" />
    <rect y="76" width="100" height="24" fill={P.stone} />
    <g {...INK}>
      <Pom x={48} y={40} s={1.15} mood="grumpy" />
      <path d="M33 28Q31 32 33 33Q35 32 33 28Z" fill={P.water} strokeWidth="1.2" />
      <circle className="t10-b" cx="28" cy="40" r="3.4" fill={P.white} strokeWidth="1.4" />
      <circle className="t10-b t10-b2" cx="68" cy="36" r="2.6" fill={P.white} strokeWidth="1.4" />
      <circle className="t10-b t10-b3" cx="20" cy="30" r="2.2" fill={P.white} strokeWidth="1.4" />
      <circle cx="26" cy="86" r="3.2" fill={P.caramel} />
      <circle cx="74" cy="86" r="3.2" fill={P.caramel} />
      <path d="M14 57H86V66Q86 83 69 83H31Q14 83 14 66Z" fill={P.white} />
      <path d="M22 64H78" stroke={P.water} strokeWidth="1.4" />
      <rect x="10" y="51" width="80" height="7" rx="3.5" fill={P.white} />
      <g fill={P.white} strokeWidth="1.5">
        <circle cx="19" cy="50" r="4.5" /><circle cx="27" cy="48" r="4" /><circle cx="35" cy="50" r="3.6" />
        <circle cx="60" cy="50" r="3.6" /><circle cx="67" cy="48.5" r="4" />
      </g>
      <g className="t10-duck">
        <ellipse cx="80" cy="46" rx="6.5" ry="4" fill={P.sun} />
        <circle cx="83" cy="40" r="3.6" fill={P.sun} />
        <path d="M86.4 39.6L90 40.6L86.4 42Z" fill={P.caramel} strokeWidth="1.2" />
        <circle cx="83.8" cy="39.2" r=".8" fill={P.ink} stroke="none" />
      </g>
    </g>
  </svg>
);

const css20 = `.t20-dog{animation:t20-trot 2s ease-in-out infinite}
@keyframes t20-trot{0%,100%{transform:translateY(0)}25%,75%{transform:translateY(-1.6px)}50%{transform:translateY(0)}}
.t20-tree{transform-box:fill-box;transform-origin:50% 100%;animation:t20-sway 5s ease-in-out infinite}
@keyframes t20-sway{0%,100%{transform:rotate(-2deg)}50%{transform:rotate(2deg)}}
.t20-fly{animation:t20-drift 6s ease-in-out infinite}
@keyframes t20-drift{0%,100%{transform:translate(0,0)}33%{transform:translate(6px,-5px)}66%{transform:translate(-4px,-2px)}}
.t20-wing{transform-box:fill-box;transform-origin:50% 50%;animation:t20-flap 2s ease-in-out infinite}
@keyframes t20-flap{0%,50%,100%{transform:scaleX(1)}25%,75%{transform:scaleX(.35)}}`;

export const Tile20: TileArt = ({ animate = true, className }) => (
  <svg {...SVG} className={className}>
    {animate && motion(css20)}
    <rect width="100" height="100" fill={P.sky} />
    <rect y="74" width="100" height="26" fill={P.grass} />
    <path d="M30 100Q44 88 64 82Q82 78 100 79V87Q84 87 70 91Q56 95 52 100Z" fill={P.sand} />
    <g {...INK}>
      <g className="t20-tree">
        <rect x="13" y="50" width="7" height="30" rx="2" fill={P.cocoa} />
        <path d={scallop(16.5, 38, 15, 12.5, 9)} fill={P.grassDeep} />
      </g>
      <g className="t20-fly">
        <g className="t20-wing">
          <path d="M44 22Q37 14 36 22Q37 28 44 24Q51 28 52 22Q51 14 44 22Z" fill={P.blush} strokeWidth="1.4" />
        </g>
        <path d="M44 19V27" strokeWidth="1.6" />
      </g>
      <path d="M68 63Q78 44 94 2" fill="none" stroke={P.groups.red} strokeWidth="2.6" />
      <g className="t20-dog">
        <rect x="44" y="70" width="5" height="10" rx="2.5" fill={P.furShade} />
        <rect x="62" y="70" width="5" height="10" rx="2.5" fill={P.furShade} />
        <path d={scallop(41, 60, 7, 5.6, 9)} fill={P.fur} />
        <ellipse cx="55" cy="67" rx="15" ry="9" fill={P.fur} />
        <rect x="49" y="71" width="5" height="10" rx="2.5" fill={P.fur} />
        <rect x="57" y="71" width="5" height="10" rx="2.5" fill={P.fur} />
        <Pom x={70} y={54} s={0.78} />
        <path d="M63 61Q69 65 76 61" fill="none" stroke={P.groups.red} strokeWidth="2.6" />
        <circle cx="69" cy="65" r="2" fill={P.sun} strokeWidth="1.2" />
      </g>
    </g>
  </svg>
);

const css30 = `.t30-d{animation:t30-fall 2s ease-in infinite}
.t30-d2{animation-delay:.7s}.t30-d3{animation-delay:1.4s}
@keyframes t30-fall{0%{transform:translateY(0);opacity:0}15%{opacity:1}80%{opacity:1}100%{transform:translateY(16px);opacity:0}}
.t30-pup{transform-box:fill-box;transform-origin:50% 80%;animation:t30-wobble 2.4s ease-in-out infinite}
@keyframes t30-wobble{0%,100%{transform:rotate(-4deg)}50%{transform:rotate(4deg)}}
.t30-arrow{animation:t30-go 2.4s ease-in-out infinite}
@keyframes t30-go{0%,100%{transform:translateX(2px)}50%{transform:translateX(-3px)}}`;

export const Tile30: TileArt = ({ animate = true, className }) => (
  <svg {...SVG} className={className}>
    {animate && motion(css30)}
    <rect width="100" height="100" fill={P.cream2} />
    <path d="M0 25H100M0 50H100M25 0V76M50 0V76M75 0V76" stroke={P.white} strokeWidth="1" />
    <rect y="76" width="100" height="24" fill={P.stone} />
    <g {...INK}>
      <path d="M90 0V8Q90 12 86 12H72" fill="none" stroke={P.ink} strokeWidth="6" />
      <path d="M90 0V8Q90 12 86 12H72" fill="none" stroke={P.stone} strokeWidth="2.5" />
      <path d="M60 13H82L78 21H64Z" fill={P.stone} />
      <path className="t30-d" d="M65 24Q63 28 65 29Q67 28 65 24Z" fill={P.water} strokeWidth="1.2" />
      <path className="t30-d t30-d2" d="M71 25Q69 29 71 30Q73 29 71 25Z" fill={P.water} strokeWidth="1.2" />
      <path className="t30-d t30-d3" d="M77 24Q75 28 77 29Q79 28 77 24Z" fill={P.water} strokeWidth="1.2" />
      <g className="t30-pup">
        <Pom x={44} y={45} s={1.05} mood="shock" />
        <path d="M22 58Q44 50 66 58Q70 74 44 76Q20 74 22 58Z" fill={P.blush} />
        <path d="M30 63Q44 59 58 63" fill="none" stroke={P.berry} strokeWidth="1.4" />
        <path d="M100 60H68Q61 60 61 66Q61 72 68 72H100Z" fill={P.peach} />
        <rect x="84" y="57" width="18" height="18" rx="2" fill={P.skyDeep} />
      </g>
      <path d="M22 34L18 30M25 30L23 25M66 36L71 33" fill="none" strokeWidth="1.6" />
      <path className="t30-arrow" d="M86 84H38V79L20 88.5L38 98V93H86Z" fill={P.groups.red} />
    </g>
  </svg>
);

/* ------------------------------------------------------------ properties */

const css01 = `.t01-neck{transform-box:fill-box;transform-origin:15% 100%;animation:t01-sway 4s ease-in-out infinite}
@keyframes t01-sway{0%,100%{transform:rotate(-4deg)}50%{transform:rotate(4deg)}}
.t01-p{transform-box:fill-box;transform-origin:center;animation:t01-puff 3.6s ease-out infinite}
.t01-p2{animation-delay:1.2s}.t01-p3{animation-delay:2.4s}
@keyframes t01-puff{0%{transform:translate(0,0) scale(.5);opacity:0}25%{opacity:.95}100%{transform:translate(4px,-16px) scale(1.25);opacity:0}}`;

export const Tile01: TileArt = ({ animate = true, className }) => (
  <svg {...SVG} className={className}>
    {animate && motion(css01)}
    <rect width="100" height="100" fill={P.sky} />
    <rect y="76" width="100" height="24" fill={P.grass} />
    <g {...INK}>
      <circle className="t01-p" cx="24" cy="30" r="4.5" fill={P.white} strokeWidth="1.5" />
      <circle className="t01-p t01-p2" cx="28" cy="22" r="4" fill={P.white} strokeWidth="1.5" />
      <circle className="t01-p t01-p3" cx="23" cy="13" r="3.4" fill={P.white} strokeWidth="1.5" />
      <path d="M2 78L18 38H30L46 78Z" fill={P.cocoa} />
      <path d="M18 38H30L28.5 44L26 41L23.5 45L21 41L19.5 43Z" fill={P.caramel} />
      <path d="M38 72Q24 74 14 84Q30 82 42 78Z" fill={P.purple} />
      <g className="t01-neck">
        <Tube d="M66 64Q66 42 78 28" w={9} fill={P.purple} />
        <ellipse cx="81" cy="26" rx="8" ry="5.5" fill={P.purple} />
        <circle cx="83" cy="24.5" r="1.3" fill={P.ink} stroke="none" />
        <path d="M84 28.5Q86.5 29 88 27" fill="none" strokeWidth="1.3" />
      </g>
      <rect x="40" y="72" width="7" height="13" rx="3" fill={P.purple} />
      <rect x="64" y="72" width="7" height="13" rx="3" fill={P.purple} />
      <ellipse cx="56" cy="68" rx="20" ry="12" fill={P.purple} />
      <rect x="47" y="74" width="7" height="12" rx="3" fill={P.purple} />
      <rect x="70" y="73" width="7" height="12" rx="3" fill={P.purple} />
      <g fill={P.groups.purple} stroke="none">
        <circle cx="50" cy="63" r="2.6" /><circle cx="58" cy="60" r="2" /><circle cx="56" cy="68" r="1.8" />
      </g>
      <g fill={P.grassDeep}>
        <ellipse cx="88" cy="80" rx="2.6" ry="9" transform="rotate(-28 88 88)" />
        <ellipse cx="92" cy="79" rx="2.6" ry="9" />
        <ellipse cx="96" cy="80" rx="2.6" ry="9" transform="rotate(28 96 88)" />
        <ellipse cx="8" cy="86" rx="2.4" ry="7.5" transform="rotate(-25 8 93)" />
        <ellipse cx="12" cy="85" rx="2.4" ry="7.5" transform="rotate(20 12 92)" />
      </g>
    </g>
  </svg>
);

const css03 = `.t03-f{transform-box:fill-box;transform-origin:50% 100%;animation:t03-flick 2s ease-in-out infinite}
.t03-f2{animation-duration:2.6s;animation-delay:.3s}
@keyframes t03-flick{0%,100%{transform:scale(1,1)}30%{transform:scale(.92,1.1)}60%{transform:scale(1.06,.92)}}
.t03-spark{animation:t03-up 3s ease-out infinite}
@keyframes t03-up{0%{transform:translate(0,0);opacity:0}20%{opacity:1}100%{transform:translate(-3px,-18px);opacity:0}}`;

export const Tile03: TileArt = ({ animate = true, className }) => (
  <svg {...SVG} className={className}>
    {animate && motion(css03)}
    <rect width="100" height="100" fill={P.cream2} />
    <rect y="76" width="100" height="24" fill={P.sand} />
    <g {...INK}>
      <circle cx="86" cy="14" r="7" fill={P.sun} />
      <path d="M-2 78Q0 22 38 20Q72 22 74 78Z" fill={P.stone} />
      <path d="M18 78Q20 48 36 47Q52 48 54 78Z" fill={P.cocoa2} />
      <path d="M8 46Q14 44 18 47M54 34Q60 33 63 37" fill="none" strokeWidth="1.5" />
      <path className="t03-spark" d="M83 50h.1" strokeWidth="2.4" stroke={P.caramel} />
      <path className="t03-f" d="M82 77C70 77 71 64 79 53C79 59 83 60 84 56C91 62 93 77 82 77Z" fill={P.caramel} />
      <path className="t03-f t03-f2" d="M82 77C76 77 76 70 80 65C81 68 84 68 84 66C88 70 87 77 82 77Z" fill={P.sun} strokeWidth="1.5" />
      <rect x="70" y="75" width="24" height="5" rx="2.5" fill={P.cocoa} transform="rotate(-12 82 77)" />
      <rect x="70" y="75" width="24" height="5" rx="2.5" fill={P.cocoa} transform="rotate(12 82 77)" />
      <g transform="translate(42 84) rotate(-6) scale(1.2)" strokeWidth="1.7">
        <Bone fill={P.cream} />
      </g>
    </g>
  </svg>
);

const css06 = `.t06-hat{transform-box:fill-box;transform-origin:50% 80%;animation:t06-tip 4s ease-in-out infinite}
@keyframes t06-tip{0%,100%{transform:rotate(-4deg) translateY(0)}50%{transform:rotate(4deg) translateY(-2px)}}
.t06-weed{transform-box:fill-box;transform-origin:center;animation:t06-roll 6s linear infinite}
@keyframes t06-roll{0%{transform:translateX(-20px) rotate(0);opacity:0}10%,90%{opacity:1}100%{transform:translateX(92px) rotate(720deg);opacity:0}}
.t06-rays{transform-box:fill-box;transform-origin:center;animation:t06-spin 6s ease-in-out infinite}
@keyframes t06-spin{0%,100%{transform:rotate(0) scale(1)}50%{transform:rotate(20deg) scale(1.08)}}`;

export const Tile06: TileArt = ({ animate = true, className }) => (
  <svg {...SVG} className={className}>
    {animate && motion(css06)}
    <rect width="100" height="100" fill={P.sky} />
    <rect y="76" width="100" height="24" fill={P.sand} />
    <g {...INK}>
      <path className="t06-rays" d="M15 1V5M15 25V29M1 15H5M25 15H29M5 5L8 8M22 22L25 25M5 25L8 22M22 8L25 5" stroke={P.caramel} strokeWidth="2" />
      <circle cx="15" cy="15" r="6.5" fill={P.sun} />
      <Tube d="M89 84V52M89 73H83V65M89 65H95V58" w={7} fill={P.grassDeep} />
      <g className="t06-hat">
        <g transform="translate(-4 0)">
          <path d="M30 57C27 38 31 24 38 24C42 24 44 29 47 29C50 29 52 24 56 24C63 24 67 38 64 57Z" fill={P.caramel} />
          <path d="M29.4 47Q47 51 64.6 47L64.2 55Q47 59 29.8 55Z" fill={P.groups.red} />
          <path d="M8 44Q12 56 30 57Q47 61 64 57Q82 56 86 44Q92 60 70 64Q47 69 24 64Q2 60 8 44Z" fill={P.caramel} />
          <path d={star5(47, 38, 4.5)} fill={P.sun} strokeWidth="1.2" />
        </g>
      </g>
      <path d="M58 82H64M30 92H35M74 94H80" fill="none" stroke={P.caramel} strokeWidth="1.6" />
      <g className="t06-weed">
        <circle cx="14" cy="86" r="6.5" fill={P.furDeep} />
        <path d="M10 83Q15 88 18 83M10 89Q14 84 18 90M12 86H17" fill="none" stroke={P.cocoa} strokeWidth="1.3" />
      </g>
    </g>
  </svg>
);

const PETALS_L = scallop(50, 36, 17, 10, 12);
const PETALS_S = scallop(0, 0, 11, 6.5, 11);

const css08 = `.t08-f{transform-box:fill-box;transform-origin:50% 100%;animation:t08-sway 4s ease-in-out infinite}
.t08-f2{animation-delay:-1.3s;animation-duration:4.6s}.t08-f3{animation-delay:-2.4s;animation-duration:5s}
@keyframes t08-sway{0%,100%{transform:rotate(-3deg)}50%{transform:rotate(3deg)}}
.t08-bee{animation:t08-buzz 5s ease-in-out infinite}
@keyframes t08-buzz{0%,100%{transform:translate(0,0)}25%{transform:translate(-8px,4px)}50%{transform:translate(-14px,-2px)}75%{transform:translate(-5px,-5px)}}`;

export const Tile08: TileArt = ({ animate = true, className }) => (
  <svg {...SVG} className={className}>
    {animate && motion(css08)}
    <defs>
      <linearGradient id="t08-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={P.skyDeep} />
        <stop offset="1" stopColor={P.sky} />
      </linearGradient>
    </defs>
    <rect width="100" height="100" fill="url(#t08-sky)" />
    <rect y="78" width="100" height="22" fill={P.grass} />
    <g {...INK}>
      <g className="t08-f t08-f2">
        <Tube d="M17 96V60" w={3} fill={P.grassDeep} />
        <path d={PETALS_S} transform="translate(17 56) scale(.85)" fill={P.sun} strokeWidth="2.3" />
        <circle cx="17" cy="56" r="4.2" fill={P.cocoa} />
      </g>
      <g className="t08-f t08-f3">
        <Tube d="M83 96V56" w={3} fill={P.grassDeep} />
        <path d={PETALS_S} transform="translate(83 51)" fill={P.sun} />
        <circle cx="83" cy="51" r="5" fill={P.cocoa} />
      </g>
      <g className="t08-f">
        <Tube d="M50 98V48" w={4} fill={P.grassDeep} />
        <path d="M50 74Q38 64 32 70Q40 78 50 74ZM50 66Q62 56 68 62Q60 70 50 66Z" fill={P.grassDeep} />
        <path d={PETALS_L} fill={P.sun} />
        <circle cx="50" cy="36" r="8" fill={P.cocoa} />
        <g fill={P.cocoa2} stroke="none">
          <circle cx="47" cy="34" r="1" /><circle cx="52" cy="33" r="1" /><circle cx="50" cy="38.5" r="1" />
        </g>
      </g>
      <path d="M6 96L8 90L10 96M30 96L32 89L34 96M66 98L68 91L70 98M90 97L92 91L94 97" fill="none" stroke={P.grassDeep} strokeWidth="1.6" />
      <g className="t08-bee">
        <ellipse cx="80" cy="16" rx="3.4" ry="2.6" fill={P.white} fillOpacity=".85" strokeWidth="1.2" transform="rotate(-25 80 16)" />
        <ellipse cx="80" cy="22" rx="5" ry="3.6" fill={P.sun} strokeWidth="1.5" />
        <path d="M79 18.6V25.4M82 19V25" strokeWidth="1.5" />
        <circle cx="76.6" cy="21.4" r=".7" fill={P.ink} stroke="none" />
      </g>
    </g>
  </svg>
);

const css09 = `.t09-carpet{animation:t09-glide 5s ease-in-out infinite}
@keyframes t09-glide{0%,100%{transform:translate(0,0) rotate(0)}50%{transform:translate(3px,-4px) rotate(-3deg)}}
.t09-s{transform-box:fill-box;transform-origin:center;animation:t09-twinkle 3s ease-in-out infinite}
.t09-s2{animation-delay:1s}.t09-s3{animation-delay:2s}
@keyframes t09-twinkle{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(.45);opacity:.4}}`;

export const Tile09: TileArt = ({ animate = true, className }) => (
  <svg {...SVG} className={className}>
    {animate && motion(css09)}
    <defs>
      <linearGradient id="t09-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={P.night} />
        <stop offset="1" stopColor={P.groups.deepblue} />
      </linearGradient>
    </defs>
    <rect width="100" height="100" fill="url(#t09-sky)" />
    <g {...INK}>
      <path d="M86 6A12 12 0 0 0 86 30A15 15 0 0 1 86 6Z" fill={P.sun} />
      <g fill={P.sun} strokeWidth="1">
        <path className="t09-s" d={star4(12, 12, 4)} />
        <path className="t09-s t09-s2" d={star4(50, 9, 3)} />
        <path className="t09-s t09-s3" d={star4(30, 26, 3)} />
      </g>
      <rect x="6" y="62" width="34" height="22" fill={P.purple} />
      <path d="M13 62Q11 52 23 43Q35 52 33 62Z" fill={P.groups.purple} />
      <path d="M23 43V37" />
      <rect x="66" y="66" width="26" height="18" fill={P.purple} />
      <path d="M71 66Q70 59 79 53Q88 59 87 66Z" fill={P.groups.purple} />
      <g fill={P.sun} strokeWidth="1.2">
        <path d="M18 76V71A2 2 0 0 1 22 71V76ZM26 76V71A2 2 0 0 1 30 71V76ZM77 78V73A2 2 0 0 1 81 73V78Z" />
      </g>
      <path d="M0 84Q26 76 52 84Q76 91 100 80V100H0Z" fill={P.sand} />
      <path d="M0 94Q30 88 60 95Q80 99 100 92V100H0Z" fill={P.caramel} />
      <g className="t09-carpet">
        <path d="M46 42Q46 35 53 35Q60 35 60 42Z" fill={P.sun} />
        <path d="M59 39Q66 39 69 33Q66 42 59.5 41.5" fill={P.sun} strokeWidth="1.5" />
        <path d="M47 38Q42 36 43 40Q44 42 47 41" fill="none" strokeWidth="1.5" />
        <circle cx="53" cy="33.5" r="2" fill={P.sun} strokeWidth="1.5" />
        <path d="M18 44Q34 37 50 44Q66 51 82 44L78 55Q62 62 46 55Q30 48 14 55Z" fill={P.berry} />
        <path d="M22 48Q34 43 48 48.5Q62 54 74 49" fill="none" stroke={P.sun} strokeWidth="1.6" />
        <path d="M18 44L14 42M16 50L12 49M82 44L86 42M80 50L84 50" fill="none" stroke={P.sun} strokeWidth="1.6" />
      </g>
    </g>
  </svg>
);

const css11 = `.t11-a{animation:t11-glow 5s ease-in-out infinite}
.t11-a2{animation-delay:-2.5s}
@keyframes t11-glow{0%,100%{opacity:.35;transform:translateX(-3px)}50%{opacity:.85;transform:translateX(3px)}}
.t11-sn{animation:t11-fall 5s linear infinite}
.t11-sn2{animation-delay:1.6s}.t11-sn3{animation-delay:3.2s}
@keyframes t11-fall{0%{transform:translateY(0);opacity:0}10%,85%{opacity:1}100%{transform:translateY(60px);opacity:0}}
.t11-peng{transform-box:fill-box;transform-origin:50% 100%;animation:t11-waddle 2.4s ease-in-out infinite}
@keyframes t11-waddle{0%,100%{transform:rotate(-6deg)}50%{transform:rotate(6deg)}}`;

export const Tile11: TileArt = ({ animate = true, className }) => (
  <svg {...SVG} className={className}>
    {animate && motion(css11)}
    <defs>
      <linearGradient id="t11-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={P.night} />
        <stop offset="1" stopColor={P.waterDeep} />
      </linearGradient>
    </defs>
    <rect width="100" height="100" fill="url(#t11-sky)" />
    <g fill="none" strokeLinecap="round">
      <path className="t11-a" d="M-4 26Q20 10 44 24Q68 38 104 16" stroke={P.groups.green} strokeWidth="7" />
      <path className="t11-a t11-a2" d="M-4 40Q26 26 52 38Q76 48 104 32" stroke={P.blush} strokeWidth="5" />
    </g>
    <g fill={P.white}>
      <circle className="t11-sn" cx="12" cy="8" r="1.6" />
      <circle className="t11-sn t11-sn2" cx="60" cy="4" r="1.6" />
      <circle className="t11-sn t11-sn3" cx="88" cy="10" r="1.6" />
    </g>
    <g {...INK}>
      <path d="M-2 76Q30 68 60 75Q80 79 102 72V102H-2Z" fill={P.white} />
      <path d="M8 82A24 24 0 0 1 56 82Z" fill={P.white} />
      <path d="M11 72H53M18 63H46M24 82V72M40 82V72M32 72V63M24 63V58.5M40 63V58.5" fill="none" stroke={P.sky} strokeWidth="1.3" />
      <path d="M8 82A24 24 0 0 1 56 82" fill="none" />
      <path d="M24 82V76A8 8 0 0 1 40 76V82Z" fill={P.waterDeep} />
      <g className="t11-peng">
        <ellipse cx="72" cy="85" rx="3.2" ry="1.8" fill={P.sun} strokeWidth="1.4" />
        <ellipse cx="82" cy="85" rx="3.2" ry="1.8" fill={P.sun} strokeWidth="1.4" />
        <ellipse cx="77" cy="70" rx="10" ry="14" fill={P.night} />
        <path d="M67.5 66Q62 72 65 78M86.5 66Q92 72 89 78" fill="none" />
        <ellipse cx="77" cy="74" rx="6.4" ry="9" fill={P.white} stroke="none" />
        <circle cx="73.8" cy="63.5" r="2.4" fill={P.white} stroke="none" />
        <circle cx="80.2" cy="63.5" r="2.4" fill={P.white} stroke="none" />
        <circle cx="74.2" cy="63.8" r="1.1" fill={P.ink} stroke="none" />
        <circle cx="79.8" cy="63.8" r="1.1" fill={P.ink} stroke="none" />
        <path d="M74.8 67H79.2L77 70Z" fill={P.sun} strokeWidth="1.2" />
        <ellipse cx="71.5" cy="68.5" rx="1.5" ry=".9" fill={P.blush} stroke="none" />
        <ellipse cx="82.5" cy="68.5" rx="1.5" ry=".9" fill={P.blush} stroke="none" />
      </g>
    </g>
  </svg>
);

const css13 = `.t13-s{transform-box:fill-box;transform-origin:center;animation:t13-tw 3s ease-in-out infinite}
.t13-s2{animation-delay:1.5s}
@keyframes t13-tw{0%,100%{transform:scale(1) rotate(0);opacity:1}50%{transform:scale(.5) rotate(45deg);opacity:.5}}
.t13-star{transform-box:fill-box;transform-origin:center;animation:t13-spin 4s ease-in-out infinite}
@keyframes t13-spin{0%,100%{transform:rotate(-12deg) scale(1)}50%{transform:rotate(12deg) scale(1.15)}}
.t13-b{animation:t13-up 2.6s ease-out infinite}
.t13-b2{animation-delay:1.3s}
@keyframes t13-up{0%{transform:translateY(0);opacity:0}20%{opacity:1}100%{transform:translateY(-14px);opacity:0}}`;

export const Tile13: TileArt = ({ animate = true, className }) => (
  <svg {...SVG} className={className}>
    {animate && motion(css13)}
    <defs>
      <linearGradient id="t13-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={P.purple} />
        <stop offset="1" stopColor={P.blush} />
      </linearGradient>
    </defs>
    <rect width="100" height="100" fill="url(#t13-sky)" />
    <rect y="80" width="100" height="20" fill={P.grass} />
    <g {...INK}>
      <path d="M37 86L40 38H58L61 86Z" fill={P.stone} />
      <path d="M40 54H58M39 70H59M49 38V54M45 54V70M54 54V70M49 70V86" fill="none" stroke={P.cocoa} strokeOpacity=".45" strokeWidth="1.2" />
      <path d="M44 86V79A5 5 0 0 1 54 79V86Z" fill={P.cocoa} />
      <path d="M45 52V47A4 4 0 0 1 53 47V52Z" fill={P.sun} />
      <path d="M33 41L49 4L65 41Z" fill={P.groups.purple} />
      <path d="M33 41Q49 47 65 41" fill="none" />
      <path d={star4(48, 26, 3)} fill={P.sun} strokeWidth="1" />
      <g fill={P.white} strokeWidth="1">
        <path className="t13-s" d={star4(18, 20, 5)} />
        <path className="t13-s t13-s2" d={star4(80, 14, 4)} />
      </g>
      <circle className="t13-b" cx="17" cy="62" r="1.8" fill={P.white} strokeWidth="1.2" />
      <circle className="t13-b t13-b2" cx="20" cy="64" r="1.4" fill={P.white} strokeWidth="1.2" />
      <path d="M15 64V70Q6 74 6 82Q6 92 18 92Q30 92 30 82Q30 74 21 70V64Z" fill={P.white} />
      <path d="M7 81Q18 78 29 81Q29 91 18 91Q7 91 7 81Z" fill={P.berry} stroke="none" />
      <path d="M15 64V70Q6 74 6 82Q6 92 18 92Q30 92 30 82Q30 74 21 70V64Z" fill="none" />
      <rect x="13.5" y="61" width="9" height="4" rx="1.5" fill={P.cocoa} />
      <Tube d="M70 94L86 66" w={3.4} fill={P.cocoa2} />
      <path d="M84 69.5L86 66" stroke={P.white} strokeWidth="3.4" />
      <path className="t13-star" d={star5(87, 62, 8)} fill={P.sun} />
    </g>
  </svg>
);

const css14 = `.t14-halo{transform-box:fill-box;transform-origin:center;animation:t14-heat 3s ease-in-out infinite}
@keyframes t14-heat{0%,100%{transform:scale(1);opacity:.45}50%{transform:scale(1.18);opacity:.15}}
.t14-paw{animation:t14-step 4s ease-in-out infinite}
.t14-p2{animation-delay:.6s}.t14-p3{animation-delay:1.2s}.t14-p4{animation-delay:1.8s}
@keyframes t14-step{0%,100%{opacity:0}15%,60%{opacity:1}}`;

export const Tile14: TileArt = ({ animate = true, className }) => (
  <svg {...SVG} className={className}>
    {animate && motion(css14)}
    <rect width="100" height="100" fill={P.cream2} />
    <circle className="t14-halo" cx="80" cy="20" r="15" fill={P.sun} />
    <g {...INK}>
      <circle cx="80" cy="20" r="9" fill={P.sun} />
      <path d="M52 76L68 50L84 76Z" fill={P.sand} />
      <path d="M68 50L84 76H72Z" fill={P.caramel} />
      <path d="M8 78L34 34L40 78Z" fill={P.sand} />
      <path d="M34 34L62 78H40Z" fill={P.caramel} />
      <path d="M-2 80Q28 70 58 79Q80 85 102 76V102H-2Z" fill={P.sand} />
      <path d="M44 102Q70 88 102 89V102Z" fill={P.furShade} />
      <Tube d="M90 82V58M90 72H84V64M90 67H96V61" w={5} fill={P.grassDeep} />
    </g>
    {[
      [12, 94, 60, ""],
      [26, 87, 70, " t14-p2"],
      [42, 92, 60, " t14-p3"],
      [56, 85, 70, " t14-p4"],
    ].map(([x, y, a, c]) => (
      <g key={c} transform={`translate(${x} ${y}) rotate(${a}) scale(.8)`}>
        <g className={`t14-paw${c}`}><Paw fill={P.cocoa} /></g>
      </g>
    ))}
  </svg>
);

