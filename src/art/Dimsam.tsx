import { P } from "~/art/palette";

export type DimsamMood = "idle" | "happy" | "sad" | "sleep" | "walk" | "think" | "soggy";
export type DimsamVariant = "blue" | "pink";
type Mood = DimsamMood;
type Base = { variant?: DimsamVariant; className?: string; animate?: boolean };

const PI = Math.PI;
const r1 = (n: number) => Math.round(n * 10) / 10;
const at = (i: number, n: number) => -PI / 2 + (i / n) * 2 * PI;
const pt = (cx: number, cy: number, rx: number, ry: number, t: number) => `${r1(cx + rx * Math.cos(t))} ${r1(cy + ry * Math.sin(t))}`;

/** Scalloped ellipse: n round tufts of fur. */
function fluff(cx: number, cy: number, rx: number, ry: number, n: number, b = 0.55) {
  const r = r1(((PI * (rx + ry)) / n) * b);
  let d = `M${pt(cx, cy, rx, ry, at(0, n))}`;
  for (let i = 1; i <= n; i++) d += `A${r} ${r} 0 0 1 ${pt(cx, cy, rx, ry, at(i, n))}`;
  return d + "Z";
}

/** Wet fur: flat on top, clumps hanging down at the bottom. */
function wet(cx: number, cy: number, rx: number, ry: number, n: number) {
  let d = `M${pt(cx, cy, rx, ry, at(0, n))}`;
  for (let i = 0; i < n; i++) {
    const t = at(i + 0.5, n), s = Math.max(0, Math.sin(t)), k = 1.02 + 0.07 * s, q = 0.97;
    d += `Q${pt(cx, cy, rx * q, ry * q, t - 0.12)} ${pt(cx, cy + s * s * 10, rx * k, ry * k, t)}`;
    d += `Q${pt(cx, cy, rx * q, ry * q, t + 0.12)} ${pt(cx, cy, rx, ry, at(i + 1, n))}`;
  }
  return d + "Z";
}

const BODY = fluff(100, 146, 60, 42, 18), MANE = fluff(100, 90, 60, 53, 22);
const WBODY = wet(100, 148, 46, 38, 12), WMANE = wet(100, 90, 50, 46, 16);
const TAIL = fluff(20, -26, 22, 28, 9, 0.6), WTAIL = wet(18, -22, 16, 22, 7);
const W_BODY = fluff(98, 126, 52, 32, 18), W_HEAD = fluff(142, 92, 38, 36, 17), W_TAIL = fluff(-6, -18, 22, 22, 10, 0.6);
const DROP = "M0 0C3 4 4.5 7 4.5 9A4.5 4.5 0 0 1 -4.5 9C-4.5 7 -3 4 0 0Z";
const HEART = "M0 4C-6 -1 -6 -7 -2.5 -7C-1 -7 0 -6 0 -4.5C0 -6 1 -7 2.5 -7C6 -7 6 -1 0 4Z";
const SPARK = "M0 -7Q1 -1 7 0Q1 1 0 7Q-1 1 -7 0Q-1 -1 0 -7Z";
const PAW = "q0-6 10-6t10 6q0 8-10 8t-10-8z";
/** Several ellipses [cx, cy, rx, ry = rx] as a single path. */
const ov = (...e: number[][]) =>
  e.map(([x, y, rx, ry = rx]) => `M${x - rx} ${y}a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0 ${-2 * rx} 0`).join("");

const K = { stroke: P.ink, strokeWidth: 2.5, strokeLinejoin: "round", strokeLinecap: "round" } as const;
const L = { ...K, fill: "none" } as const;
const F = { ...K, fill: P.fur } as const;
const dl = (s: number) => ({ animationDelay: `${s}s` });

// [name, keyframes, duration, extra declarations]; transform/opacity only.
const ANIMS: [string, string, string, string?][] = [
  ["breath", "50%{transform:scale(1.02)}", "3.6s", "transform-origin:50% 100%"],
  ["blink", "0%,93%,100%{transform:none}96%{transform:scaleY(.1)}", "4s"],
  ["tail", "0%,100%{transform:rotate(-6deg)}50%{transform:rotate(8deg)}", "2.4s", "transform-origin:20% 100%"],
  ["bounce", "50%{transform:translateY(-5px)}", ".6s"],
  ["perk", "50%{transform:rotate(-8deg) scale(1.06)}", ".6s", "transform-origin:50% 100%"],
  ["pop", "0%{opacity:0;transform:scale(.2)}25%{opacity:1;transform:none}75%{opacity:1;transform:translateY(-6px)}100%{opacity:0;transform:translateY(-12px) scale(.8)}", "1.8s"],
  ["fall", "0%{opacity:0;transform:translateY(-3px)}15%{opacity:1}100%{opacity:0;transform:translateY(18px)}", "2.4s"],
  ["z", "0%{opacity:0;transform:translateY(6px) scale(.6)}25%{opacity:1}100%{opacity:0;transform:translate(10px,-20px) scale(1.1)}", "3.6s"],
  ["dot", "0%,100%{opacity:.3;transform:scale(.8)}50%{opacity:1;transform:scale(1.2)}", "1.2s"],
  ["leg", "0%,100%{transform:rotate(22deg)}50%{transform:rotate(-22deg)}", ".5s", "transform-origin:50% 0"],
];
const CSS = `@media (prefers-reduced-motion: no-preference){[class^=dz-]{transform-box:fill-box;transform-origin:50% 50%}${ANIMS.map(
  ([n, k, t, x = ""]) => `.dz-${n}{animation:dz-${n} ${t} ease-in-out infinite;${x}}@keyframes dz-${n}{${k}}`,
).join("")}.dz-slow{animation-duration:5s}.dz-fast{animation-duration:.4s}.dz-bob{animation:dz-bounce .25s infinite}.dz-leg2{animation-delay:-.25s}}`;

function Ear({ x, y, rot, flip, cls, bow }: { x: number; y: number; rot: number; flip?: boolean; cls?: string; bow?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -1 : 1} 1) rotate(${rot})`}>
      <g className={cls}>
        <path d="M-13 6Q-12 -16 -2 -22Q8 -13 13 4Z" fill={P.furShade} {...K} />
        <path d="M-7 0Q-6 -11 -2 -15Q4 -9 7 -1Z" fill={P.furDeep} />
        {bow && <Bow x={2} y={-14} />}
      </g>
    </g>
  );
}

const Bow = ({ x, y, s = 1 }: { x: number; y: number; s?: number }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} {...K} strokeWidth={2}>
    <path d="M0 0L-12 -8Q-15 0 -12 8ZM0 0L12 -8Q15 0 12 8Z" fill={P.groups.pink} />
    <circle r={4} fill={P.berry} />
  </g>
);

const Collar = ({ d, x, y, s = 1 }: { d: string; x: number; y: number; s?: number }) => (
  <g strokeLinecap="round" fill="none">
    <path d={d} stroke={P.ink} strokeWidth={8 * s} />
    <path d={d} stroke={P.groups.blue} strokeWidth={4.5 * s} />
    <circle cx={x} cy={y} r={6 * s} fill={P.sun} stroke={P.ink} strokeWidth={2 * s} />
    <circle cx={x} cy={y} r={1.6 * s} fill={P.caramel} />
  </g>
);

const Nose = ({ x = 100, y = 101 }: { x?: number; y?: number }) => (
  <g transform={`translate(${x} ${y})`}>
    <path d="M-6 -2Q0 -6 6 -2Q5 4 0 4Q-5 4 -6 -2Z" fill={P.ink} {...K} strokeWidth={1.5} />
    <path d={ov([-1.5, -2.4, 2, 1])} fill={P.white} opacity={0.7} />
  </g>
);

const Tongue = ({ h }: { h: number }) => <path d={`M95 110v${h}a5 5 0 0 0 10 0v-${h}z`} fill={P.tongue} {...K} strokeWidth={2} />;

const LINE_EYES: Partial<Record<Mood, string>> = { happy: "M81 92q6-8 12 0M107 92q6-8 12 0", sleep: "M81 90q6 5 12 0M107 90q6 5 12 0" };
const BROWS: Partial<Record<Mood, string>> = { sad: "M80 82l11-5M120 82l-11-5", think: "M80 79q6-5 12-2M108 75q6-3 12 1" };
const MOUTH: Partial<Record<Mood, string>> = { idle: "M90 107q5 5 10 1q5 4 10-1", sad: "M93 114q7-6 14 0", sleep: "M95 109q5 3 10 0", think: "M96 111q5-2 9 1", soggy: "M93 111h14" };

function Face({ m }: { m: Mood }) {
  const look = m === "think", hl = m === "sad" ? 2.4 : 1.8;
  return (
    <g>
      {LINE_EYES[m] && <path d={LINE_EYES[m]} {...L} strokeWidth={3} />}
      {BROWS[m] && <path d={BROWS[m]} {...L} />}
      {!LINE_EYES[m] && (
        <g className={m === "soggy" || look ? undefined : "dz-blink"}>
          {look && <path d={ov([87, 90, 6.5], [113, 90, 6.5])} fill={P.white} {...K} strokeWidth={2} />}
          <path d={look ? ov([89.4, 87.4, 3.6], [115.4, 87.4, 3.6]) : ov([87, 90, 5.6], [113, 90, 5.6])} fill={P.ink} />
          <path d={look ? ov([90.4, 86.2, 1.1], [116.4, 86.2, 1.1]) : ov([85.2, 88, hl], [111.2, 88, hl])} fill={P.white} />
        </g>
      )}
      {m === "soggy" && <path d="M80 89.5h14v-8H80zM106 89.5h14v-8h-14z" fill={P.cream} />}
      {m === "soggy" && <path d="M80 89.5h14M106 89.5h14" {...L} />}
      {m === "happy" && <path d="M89 107q11 14 22 0q-11 4-22 0z" fill={P.cocoa2} {...K} />}
      {(m === "happy" || m === "idle") && <Tongue h={m === "happy" ? 6 : 2} />}
      {MOUTH[m] && <path d={`M100 105v3${MOUTH[m]}`} {...L} />}
      <Nose />
    </g>
  );
}

/** Mood props floating around the dog: hearts, tear, Zs, thought bubble, drips. */
function Extras({ m }: { m: Mood }) {
  if (m === "happy")
    return (
      <g {...K} strokeWidth={2}>
        {([[36, 46, HEART, 0], [166, 58, HEART, -0.9], [160, 26, SPARK, -0.5], [42, 22, SPARK, -1.3]] as const).map(([x, y, p, t]) => (
          <g key={x} transform={`translate(${x} ${y})`}>
            <path className="dz-pop" style={dl(t)} d={p} fill={p === HEART ? P.blush : P.sun} />
          </g>
        ))}
      </g>
    );
  if (m === "sleep")
    return (
      <g {...L} strokeWidth={2.8}>
        {[[138, 60, 0.9, 0], [152, 46, 1.1, -1.2], [166, 30, 1.3, -2.4]].map(([x, y, s, t]) => (
          <g key={x} transform={`translate(${x} ${y}) scale(${s})`}>
            <path className="dz-z" style={dl(t)} d="M0 0h8l-8 9h8" />
          </g>
        ))}
      </g>
    );
  if (m === "think")
    return (
      <g>
        <path d={ov([142, 52, 3], [151, 40, 4.5]) + fluff(170, 21, 24, 14, 9, 0.62)} fill={P.white} {...K} strokeWidth={2} />
        {[160, 170, 180].map((x, i) => <path key={x} className="dz-dot" style={dl(i * 0.2)} d={ov([x, 22, 2.6])} fill={P.ink} />)}
        <path d={ov([117, 121, 11, 8.5])} {...F} />
        <path d="M113 114v5M119 114v5" {...L} strokeWidth={1.8} />
      </g>
    );
  const drops = m === "sad" ? [[116, 97, 0]] : m === "soggy" ? [[66, 40, 0], [138, 36, -0.8], [72, 190, -0.4], [126, 190, -1.2], [156, 150, -1.5]] : [];
  return (
    <g fill={P.water} stroke={P.waterDeep} strokeWidth={1.5}>
      {drops.map(([x, y, t]) => (
        <g key={x} transform={`translate(${x} ${y}) scale(.85)`}>
          <path className="dz-fall" style={dl(t)} d={DROP} />
        </g>
      ))}
    </g>
  );
}

const EARS: Partial<Record<Mood, [number, string]>> = { happy: [-6, "dz-perk"], sad: [-36, ""], sleep: [-22, ""], soggy: [-58, ""] };

function Sitting({ m, v }: { m: Mood; v: DimsamVariant }) {
  const soggy = m === "soggy", think = m === "think";
  const [er, ec] = EARS[m] ?? [-14, ""];
  const head = `translate(0 ${m === "sad" ? 5 : soggy ? 3 : 0})`;
  const body = soggy ? WBODY : BODY, mane = soggy ? WMANE : MANE;
  const anim = m === "happy" ? "dz-bounce" : m === "sad" ? undefined : m === "sleep" ? "dz-breath dz-slow" : "dz-breath";
  const strands = { ...L, stroke: P.furDeep, strokeWidth: 2 };
  return (
    <g>
      <path d={ov([100, 190, 58, 6])} fill={P.ink} opacity={0.12} />
      <g className={anim}>
        <g transform="translate(140 132)">
          <g className={m === "happy" ? "dz-tail dz-fast" : "dz-tail"}>
            <path d={soggy ? WTAIL : TAIL} {...F} />
            <path d={ov([20, -22, 9, 14])} fill={P.furShade} opacity={0.8} />
          </g>
        </g>
        <path d={ov([62, 183, 13, 7], [138, 183, 13, 7])} {...F} />
        <path d={body} {...F} />
        <g transform={head}>
          <Ear x={73} y={50} rot={er} cls={ec} />
          <Ear x={127} y={50} rot={er} cls={ec} flip bow={v === "pink"} />
          <path d={mane} {...F} />
        </g>
        {/* refill both shapes without stroke so head + body read as one fluff ball */}
        <path d={body} fill={P.fur} />
        <path d={mane} fill={P.fur} transform={head} />
        <path d={ov([100, 162, 30, 17])} fill={P.furShade} opacity={0.5} />
        {soggy && <path d="M72 150q2 14-1 24M128 150q-2 14 1 24M100 160v18" {...strands} />}
        <path d={`M76 176${PAW}${think ? "" : "m28 0" + PAW}`} {...F} />
        <path d={`M82 180v3M90 180v3${think ? "" : "M110 180v3M118 180v3"}`} {...L} strokeWidth={1.6} />
        <g transform={head}>
          <path d="M52 102q6 26 48 36q42-10 48-36q-4 34-48 42q-44-8-48-42z" fill={P.furShade} />
          {soggy && <path d="M62 66q-4 10-2 22M138 66q4 10 2 22" {...strands} />}
          <path d={ov([100, 96, 32, 25])} fill={P.cream} />
          {v === "blue" && <Collar d="M66 128Q100 146 134 128" x={100} y={142} />}
          <path d={ov([76, 104, 7, 4.5], [124, 104, 7, 4.5])} fill={P.blush} opacity={0.45} />
          <Face m={m} />
        </g>
      </g>
      <Extras m={m} />
    </g>
  );
}

const Leg = ({ x, far, cls }: { x: number; far?: boolean; cls: string }) => (
  <g transform={`translate(${x} 138)`}>
    <path className={cls} d="M-8 0V30Q-8 37 0 37Q11 37 11 31Q11 28 8 27L8 0Z" {...F} fill={far ? P.furShade : P.fur} />
  </g>
);

/** 3/4 side-view trot, facing right. */
const Walking = ({ v }: { v: DimsamVariant }) => (
  <g>
    <path d={ov([104, 180, 62, 6])} fill={P.ink} opacity={0.12} />
    <g className="dz-bob">
      <Leg x={84} far cls="dz-leg dz-leg2" />
      <Leg x={140} far cls="dz-leg" />
      <g transform="translate(66 108)">
        <g className="dz-tail dz-fast" style={{ transformOrigin: "80% 100%" }}>
          <path d={W_TAIL} {...F} />
          <path d={ov([-6, -18, 10, 11])} fill={P.furShade} opacity={0.8} />
        </g>
      </g>
      <Leg x={68} cls="dz-leg" />
      <Leg x={124} cls="dz-leg dz-leg2" />
      <path d={W_BODY} {...F} />
      <path d={ov([92, 138, 34, 12])} fill={P.furShade} opacity={0.5} />
      <Ear x={160} y={56} rot={14} flip />
      <Ear x={128} y={56} rot={-12} bow={v === "pink"} />
      <path d={W_HEAD} {...F} />
      <path d="M108 104q6 20 28 26q-22 2-28-26z" fill={P.furShade} />
      <path d={ov([152, 100, 24, 19])} fill={P.cream} />
      {v === "blue" && <Collar d="M116 118Q136 134 162 122" x={140} y={130} />}
      <path d={ov([132, 106, 6, 4], [172, 106, 4])} fill={P.blush} opacity={0.45} />
      <g className="dz-blink">
        <path d={ov([143, 93, 5.4], [165, 92, 4.6])} fill={P.ink} />
        <path d={ov([141.4, 91, 1.7], [163.6, 90.4, 1.4])} fill={P.white} />
      </g>
      <path d="M150 112q8 10 18-1q-9 3-18 1z" fill={P.cocoa2} {...K} />
      <path d="M154 114v4a4.5 4.5 0 0 0 9 0v-4z" fill={P.tongue} {...K} strokeWidth={2} />
      <Nose x={161} y={104} />
    </g>
  </g>
);

/** Dimsam the Pomeranian, full body, sitting front view (`walk` is a side-view trot for board movement). */
export function Dimsam({ mood = "idle", variant = "blue", className, animate = true }: Base & { mood?: DimsamMood }) {
  return (
    <svg viewBox="0 0 200 200" width="100%" height="100%" className={className} role="img" aria-label="Dimsam">
      {animate !== false && <style>{CSS}</style>}
      {mood === "walk" ? <Walking v={variant} /> : <Sitting m={mood} v={variant} />}
    </svg>
  );
}

const TOKEN_CSS = `@media (prefers-reduced-motion: no-preference){.dz-tb{transform-box:fill-box;transform-origin:50% 50%;animation:dz-tb 4.5s infinite}@keyframes dz-tb{0%,93%,100%{transform:none}96%{transform:scaleY(.1)}}}`;
const TOKEN_HEAD = fluff(30, 30, 23, 21, 11);

/** Head-only board piece, readable down to ~28 px. */
export function DimsamToken({ variant = "blue", className, animate = true }: Base) {
  const t = { ...K, strokeWidth: 2.2 };
  return (
    <svg viewBox="0 0 60 60" width="100%" height="100%" className={className} role="img" aria-label="Dimsam token">
      {animate !== false && <style>{TOKEN_CSS}</style>}
      <path d="M8 18Q9 4 17 1Q22 7 24 14ZM52 18Q51 4 43 1Q38 7 36 14Z" fill={P.furShade} {...t} />
      <path d="M12 14Q13 7 16.5 5Q19 9 20 13ZM48 14Q47 7 43.5 5Q41 9 40 13Z" fill={P.furDeep} />
      <path d={TOKEN_HEAD} {...t} fill={P.fur} />
      <path d={ov([30, 34, 14, 11])} fill={P.cream} />
      <path d={ov([18, 38, 3.5, 2.2], [42, 38, 3.5, 2.2])} fill={P.blush} opacity={0.55} />
      <g className={animate !== false ? "dz-tb" : undefined}>
        <path d={ov([23.2, 31, 4], [36.8, 31, 4])} fill={P.ink} />
        <path d={ov([22, 29.7, 1], [35.6, 29.7, 1])} fill={P.white} />
      </g>
      <path d="M26.3 36Q30 33.4 33.7 36Q33 39.6 30 39.6Q27 39.6 26.3 36Z" fill={P.ink} />
      <path d="M28 41.5v2a2 2 0 0 0 4 0v-2z" fill={P.tongue} stroke={P.ink} strokeWidth={1.2} />
      <path d="M26 40.5q2 2 4 .5q2 1.5 4-.5" {...t} fill="none" strokeWidth={1.5} />
      {variant === "blue" ? <Collar d="M15 49Q30 57 45 49" x={30} y={54} s={0.7} /> : <Bow x={47} y={11} s={0.62} />}
    </svg>
  );
}

/** Paw print icon; fill follows currentColor. */
export function DimsamPaw({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" width="100%" height="100%" className={className} fill="currentColor" aria-hidden="true">
      <path d="M20 19c6 0 11 6 11 11c0 4-3 6-6 6c-2 0-3-1-5-1s-3 1-5 1c-3 0-6-2-6-6c0-5 5-11 11-11zM4.24 18.52a3.6 4.6 -25 1 0 6.53 -3.04a3.6 4.6 -25 1 0 -6.53 3.04M11.24 9.53a3.8 5 -8 1 0 7.53 -1.06a3.8 5 -8 1 0 -7.53 1.06M21.24 8.47a3.8 5 8 1 0 7.53 1.06a3.8 5 8 1 0 -7.53 -1.06M29.24 15.48a3.6 4.6 25 1 0 6.53 3.04a3.6 4.6 25 1 0 -6.53 -3.04" />
    </svg>
  );
}
