// Tiny synthesized sound effects (Web Audio, no files). Unlocked on the first
// user gesture; muted state is remembered in localStorage.
export type Sfx = "roll" | "step" | "buy" | "cash" | "pay" | "card" | "build" | "jail" | "win" | "lose" | "tap" | "prize" | "penalty" | "tab";

const KEY = "dimsam.muted";
let ctx: AudioContext | null = null;
let muted = typeof window !== "undefined" && localStorage.getItem(KEY) === "1";

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

export function unlockAudio() {
  ac();
}

export function isMuted() {
  return muted;
}

export function setMuted(m: boolean) {
  muted = m;
  localStorage.setItem(KEY, m ? "1" : "0");
}

function tone(c: AudioContext, opts: { f: number; f2?: number; t: number; dur: number; type?: OscillatorType; gain?: number }) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = opts.type ?? "sine";
  o.frequency.setValueAtTime(opts.f, opts.t);
  if (opts.f2) o.frequency.exponentialRampToValueAtTime(opts.f2, opts.t + opts.dur);
  g.gain.setValueAtTime(0.0001, opts.t);
  g.gain.exponentialRampToValueAtTime(opts.gain ?? 0.18, opts.t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, opts.t + opts.dur);
  o.connect(g).connect(c.destination);
  o.start(opts.t);
  o.stop(opts.t + opts.dur + 0.02);
}

function noise(c: AudioContext, t: number, dur: number, gain = 0.12, hp = 1800) {
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = "highpass";
  f.frequency.value = hp;
  const g = c.createGain();
  g.gain.value = gain;
  src.connect(f).connect(g).connect(c.destination);
  src.start(t);
}

export function play(name: Sfx) {
  if (muted) return;
  const c = ac();
  if (!c) return;
  const t = c.currentTime;
  switch (name) {
    case "roll": // rattling dice in a cup
      for (let i = 0; i < 9; i++) noise(c, t + i * 0.09 + Math.random() * 0.02, 0.05, 0.1, 2500);
      tone(c, { f: 900, f2: 500, t: t + 0.85, dur: 0.12, type: "triangle", gain: 0.12 });
      return;
    case "step":
      tone(c, { f: 520, f2: 380, t, dur: 0.07, type: "triangle", gain: 0.07 });
      return;
    case "tap":
      tone(c, { f: 700, t, dur: 0.05, type: "square", gain: 0.04 });
      return;
    case "buy":
      [523, 659, 784].forEach((f, i) => tone(c, { f, t: t + i * 0.09, dur: 0.18, type: "triangle", gain: 0.14 }));
      return;
    case "cash": // coins
      [1319, 1760, 2093].forEach((f, i) => tone(c, { f, t: t + i * 0.07, dur: 0.16, type: "sine", gain: 0.12 }));
      return;
    case "pay":
      tone(c, { f: 420, f2: 220, t, dur: 0.28, type: "sawtooth", gain: 0.08 });
      return;
    case "card":
      noise(c, t, 0.12, 0.08, 1200);
      tone(c, { f: 880, f2: 1320, t: t + 0.1, dur: 0.18, type: "sine", gain: 0.1 });
      return;
    case "build": // hammer taps
      [0, 0.14, 0.28].forEach((d) => noise(c, t + d, 0.04, 0.14, 900));
      tone(c, { f: 660, t: t + 0.42, dur: 0.15, type: "triangle", gain: 0.1 });
      return;
    case "jail": // splash + sad woof
      noise(c, t, 0.35, 0.16, 600);
      tone(c, { f: 300, f2: 180, t: t + 0.25, dur: 0.35, type: "sawtooth", gain: 0.1 });
      return;
    case "prize": // jackpot: rising arpeggio + coin shower
      [523, 659, 784, 1047, 1319].forEach((f, i) => tone(c, { f, t: t + i * 0.08, dur: 0.3, type: "triangle", gain: 0.14 }));
      for (let i = 0; i < 10; i++) tone(c, { f: 1760 + (i % 3) * 220, t: t + 0.45 + i * 0.09, dur: 0.12, type: "sine", gain: 0.08 });
      return;
    case "penalty": // womp womp
      tone(c, { f: 330, f2: 300, t, dur: 0.3, type: "sawtooth", gain: 0.09 });
      tone(c, { f: 300, f2: 270, t: t + 0.32, dur: 0.3, type: "sawtooth", gain: 0.09 });
      tone(c, { f: 270, f2: 180, t: t + 0.64, dur: 0.7, type: "sawtooth", gain: 0.09 });
      return;
    case "tab": // pencil scribble on a notepad
      for (let i = 0; i < 5; i++) noise(c, t + i * 0.07, 0.05, 0.07, 2200);
      tone(c, { f: 660, f2: 880, t: t + 0.4, dur: 0.18, type: "triangle", gain: 0.1 });
      return;
    case "win":
      [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(c, { f, t: t + i * 0.12, dur: 0.22, type: "triangle", gain: 0.14 }));
      return;
    case "lose":
      [392, 349, 311, 262].forEach((f, i) => tone(c, { f, t: t + i * 0.18, dur: 0.3, type: "triangle", gain: 0.12 }));
      return;
  }
}
