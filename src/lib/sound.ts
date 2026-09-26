// The attic's sound, synthesised with Web Audio: nothing to download, nothing to license.
// Typewriter keys and the carriage-return bell, pins pressed into cork, paper balled up and
// rustling, string pulled taut, the steel drawer, and a low room tone.
//
// Browsers only allow audio after a user gesture, so the context starts on the first click or key.
// Muting (the switch by the view tabs, or M) is remembered in this browser.

const KEY = "detective-wall/sound";
type Listener = (on: boolean) => void;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;
let on = readPref();
const listeners = new Set<Listener>();

function readPref(): boolean {
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}

export const soundOn = () => on;

export function setSound(next: boolean) {
  on = next;
  try {
    localStorage.setItem(KEY, next ? "on" : "off");
  } catch {
    /* storage unavailable */
  }
  if (master && ctx) master.gain.setTargetAtTime(next ? 0.9 : 0, ctx.currentTime, 0.08);
  if (next) void start();
  listeners.forEach((l) => l(next));
}

export function onSoundChange(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Creates (or resumes) the audio context. Called from a user gesture. */
async function start() {
  if (!on) return;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.9;
    // A gentle compressor keeps a burst of keys or a crumple from spiking.
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 3;
    master.connect(comp).connect(ctx.destination);
    noiseBuf = makeNoise(ctx);
    startRoomTone();
  }
  if (ctx.state === "suspended") await ctx.resume().catch(() => {});
}

if (typeof window !== "undefined") {
  const wake = () => void start();
  window.addEventListener("pointerdown", wake, { passive: true });
  window.addEventListener("keydown", wake);
}

function makeNoise(c: AudioContext): AudioBuffer {
  const b = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}

/** Everything plays through here: nothing happens while muted or before the first gesture. */
function ready(): AudioContext | null {
  return on && ctx && master && ctx.state === "running" ? ctx : null;
}

const rnd = (a: number, b: number) => a + Math.random() * (b - a);

function noise(c: AudioContext, at: number, dur: number, filter: BiquadFilterType, freq: number, q: number, gain: number, dest: AudioNode = master!) {
  const src = c.createBufferSource();
  src.buffer = noiseBuf;
  src.playbackRate.value = rnd(0.8, 1.2);
  const f = c.createBiquadFilter();
  f.type = filter;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(gain, at + Math.min(0.004, dur / 4));
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  src.connect(f).connect(g).connect(dest);
  src.start(at, rnd(0, 1.5));
  src.stop(at + dur + 0.02);
  return { f, g };
}

function tone(c: AudioContext, at: number, freq: number, dur: number, gain: number, type: OscillatorType = "sine", toFreq?: number) {
  const o = c.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, at);
  if (toFreq) o.frequency.exponentialRampToValueAtTime(toFreq, at + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(gain, at + 0.003);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(g).connect(master!);
  o.start(at);
  o.stop(at + dur + 0.02);
}

// ───────────────────────── the sounds ─────────────────────────

let lastKey = 0;
/** One typewriter key: the typebar's snap on the platen, and the thump of the key bottoming out. */
export function key(volume = 1) {
  const c = ready();
  if (!c) return;
  const t = c.currentTime;
  if (t - lastKey < 0.035) return; // a burst of keys never becomes a buzz
  lastKey = t;
  const v = volume * rnd(0.75, 1);
  noise(c, t, 0.028, "bandpass", rnd(2600, 3600), 1.6, 0.5 * v);
  noise(c, t + 0.004, 0.05, "lowpass", 700, 0.8, 0.35 * v);
  tone(c, t, rnd(130, 170), 0.06, 0.18 * v, "triangle", 70);
}

/** Return: the margin bell, then the carriage ratcheting back. */
export function carriage() {
  const c = ready();
  if (!c) return;
  const t = c.currentTime;
  for (const [f, g] of [
    [2093, 0.16],
    [4186, 0.05],
    [5320, 0.03],
  ] as const)
    tone(c, t, f, 1.1, g);
  for (let i = 0; i < 7; i++) noise(c, t + 0.12 + i * 0.028, 0.02, "bandpass", 2200, 3, 0.22);
  noise(c, t + 0.34, 0.09, "lowpass", 500, 1, 0.4);
}

/** A pin pressed home: the point through the paper, then the head seating in cork. */
export function pin() {
  const c = ready();
  if (!c) return;
  const t = c.currentTime;
  noise(c, t, 0.018, "highpass", 3500, 0.7, 0.25);
  tone(c, t + 0.012, 110, 0.11, 0.4, "sine", 55);
  noise(c, t + 0.012, 0.08, "lowpass", 380, 1, 0.35);
}

/** Paper balled up and dropped in the bin. */
export function crumple() {
  const c = ready();
  if (!c) return;
  const t = c.currentTime;
  const n = 26;
  for (let i = 0; i < n; i++) {
    const at = t + Math.pow(i / n, 1.3) * 0.42 + rnd(0, 0.02);
    noise(c, at, rnd(0.012, 0.035), "bandpass", rnd(1800, 6500), rnd(0.8, 2.5), rnd(0.12, 0.3));
  }
  // It lands in the basket.
  noise(c, t + 0.62, 0.07, "lowpass", 900, 1, 0.25);
}

/** A sheet going up on the wall, or lifted off it. */
export function rustle(volume = 1) {
  const c = ready();
  if (!c) return;
  const t = c.currentTime;
  const { f, g } = noise(c, t, 0.28, "bandpass", 2800, 0.9, 0.001);
  g.gain.cancelScheduledValues(t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.16 * volume, t + 0.07);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
  f.frequency.setValueAtTime(1800, t);
  f.frequency.exponentialRampToValueAtTime(4200, t + 0.25);
}

/** String pulled taut between two pins: a short, low pluck. */
export function pluck() {
  const c = ready();
  if (!c) return;
  const t = c.currentTime;
  tone(c, t, 196, 0.35, 0.14, "triangle", 185);
  tone(c, t, 392, 0.18, 0.05, "sine");
  noise(c, t, 0.02, "bandpass", 3000, 2, 0.12);
}

/** The steel drawer on its runners, then the stop. */
export function drawer(opening: boolean) {
  const c = ready();
  if (!c) return;
  const t = c.currentTime;
  const dur = opening ? 0.42 : 0.3;
  const { f, g } = noise(c, t, dur, "bandpass", 900, 6, 0.001);
  g.gain.cancelScheduledValues(t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.12, t + 0.05);
  g.gain.setValueAtTime(0.12, t + dur - 0.08);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  f.frequency.setValueAtTime(opening ? 700 : 1100, t);
  f.frequency.linearRampToValueAtTime(opening ? 1100 : 650, t + dur);
  // the stop: a dull metal clunk
  tone(c, t + dur, opening ? 120 : 95, 0.22, 0.32, "sine", 70);
  noise(c, t + dur, 0.12, "bandpass", 1400, 4, 0.18);
}

/** A card slipping out of its folder: the case opening. */
export function thump() {
  const c = ready();
  if (!c) return;
  const t = c.currentTime;
  tone(c, t, 70, 0.5, 0.35, "sine", 45);
  noise(c, t, 0.3, "lowpass", 300, 0.7, 0.2);
}

/** The room itself: a low, steady air, barely there. */
function startRoomTone() {
  if (!ctx || !master || !noiseBuf) return;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = true;
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 170;
  const room = ctx.createGain();
  room.gain.value = 0.045;
  src.connect(lp).connect(room).connect(master);
  src.start();
}
