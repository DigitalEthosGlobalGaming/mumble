/* The two-person scene, drawn onto a canvas: backdrop, two characters, speech bubbles and name tags. The live page and the
   video export both draw through this, so what you see while playing is what the exported file contains. A frame is a pure
   function of the clock `t` and the timeline, so the page can play it from the audio clock and the export can step it. */
import {createCharacter, lookFor, type Character} from "./character";
import {CLAMP} from "./mumble-core";
import {makeBackdrop} from "./backdrop";

export type Side = "L" | "R";
export interface SceneVoice { name: string; color: string; look?: string }

export const W = 1280, H = 720;
// MessageChannel hops are not throttled in background tabs the way setTimeout is
export const hop = (() => { const ch = new MessageChannel(); const q: (() => void)[] = []; ch.port1.onmessage = () => q.shift()?.(); return () => new Promise<void>(r => { q.push(r); ch.port2.postMessage(0); }); })();
const START_DELAY = 0.05; // the page starts each line this long after it is queued
export const LEAD = 0.6, GAP = 0.38, TAIL = 1.2;
const GROUND = 0.6;
const COL_W = 580, COL_X: Record<Side, number> = {L: 40, R: 660};
const PX_MAX: Record<Mood, number> = {plain: 32, ask: 32, shout: 38, whisper: 24}; // biggest letter size a line may use
const BUBBLE_MIN_W = 200;
const BUBBLE_BOTTOM = 250, BUBBLE_MIN = 120, BUBBLE_PAD = 18, TEXT_MAX_H = 176;
const ACTOR_W = 245, VB = [-20, -24, 240, 316];
const ACTOR_H = ACTOR_W * VB[3] / VB[2], ACTOR_TOP = 644 - ACTOR_H; // feet stay on the same line whatever the size
const CHAR_CSS = `.ch *{stroke:#1a1a1a;stroke-opacity:.38;stroke-width:1;stroke-linejoin:round}.ch .ns,.ch .ns *{stroke:none}.ch text{font-family:"Arial Black",Arial,sans-serif;font-weight:900}`;


export type Mood = "plain" | "ask" | "shout" | "whisper";
interface Beat { t: number; kind: "q" | "caps" | "ex" }
export interface Timed { side: Side; text: string; synth: any; start: number; end: number; offset: number; mood: Mood; beats: Beat[] }
interface Laid { px: number; lh: number; width: number; chars: {c: string; x: number; y: number; w: number; i: number}[]; height: number }


/* Synthesise every line (a minute of speech takes seconds) and lay the lines out one after another. */
export async function buildTimeline(lines: {side: Side; text: string}[], synthFor: (text: string, side: Side) => any,
  opt: {hop: () => Promise<void>; check?: () => void; progress?: (f: number, label: string) => void}): Promise<{timed: Timed[]; total: number}> {
  const timed: Timed[] = [];
  let cursor = LEAD;
  for (let i = 0; i < lines.length; i++){
    opt.check?.(); opt.progress?.(i / lines.length, `Synthesising line ${i + 1} of ${lines.length}`);
    const synth = synthFor(lines[i].text, lines[i].side);
    while (!synth.done){ synth.next(200); await opt.hop(); opt.check?.(); }
    const offset = cursor + START_DELAY, end = offset + synth.plan.dur;
    timed.push({...lines[i], synth, start: cursor, end, offset, ...emphasis(synth.plan.chars)});
    cursor = end + GAP;
  }
  return {timed, total: timed.length ? timed[timed.length - 1].end + TAIL : 0};
}

export interface Scene {
  canvas: HTMLCanvasElement;
  readonly backdrop: string;
  readonly seed: number;
  /** swap in a different random backdrop */
  reroll(): void;
  /** the characters, so the page can restyle them while nothing is playing */
  cast: Record<Side, {ch: Character}>;
  setVoice(side: Side, v: SceneVoice): void;
  /** the lines to show; pass [] for the idle scene */
  setTimeline(timed: Timed[]): void;
  /** draw the frame at clock time `t`; the timeline starts at `origin` (the page runs on a free-running clock, the export starts at 0) */
  render(t: number, origin?: number): Promise<void>;
}

/* `tags: false` leaves the name tags out of the picture (the page draws its own, editable ones on top). */
export function createScene(o: {voices: Record<Side, SceneVoice>; backdrop?: string; seed?: number; tags: boolean; canvas?: HTMLCanvasElement}): Scene {
  const canvas = o.canvas || document.createElement("canvas"); canvas.width = W; canvas.height = H;
  const g = canvas.getContext("2d", {alpha: false})!;
  const css = getComputedStyle(document.documentElement), cv = (n: string) => css.getPropertyValue(n).trim();
  const pal = {skyTop: cv("--sky-top"), skyBot: cv("--sky-bot"), snow: cv("--snow"), pine: cv("--pine"), edge: cv("--soft-edge"), teal: cv("--teal"), tealDk: cv("--teal-dk"), accent: cv("--accent")};
  const face = cv("--pixel") || "system-ui, sans-serif";
  let bg = makeBackdrop({W, H, ground: GROUND}, pal, o.backdrop, o.seed);
  const voices = {...o.voices};

  let clock = 0; // seconds; drives gestures
  const cast = {} as Record<Side, {ch: Character; host: HTMLElement; img: HTMLImageElement | null; key: string}>;
  for (const side of ["L", "R"] as Side[]){
    const host = document.createElement("div"), v = voices[side];
    const ch = createCharacter(host, side === "R", () => clock * 1000);
    ch.setLook(lookFor(v.look || v.name, v.color));
    cast[side] = {ch, host, img: null, key: ""};
  }
  let timed: Timed[] = [], layouts = new Map<Timed, Laid>();

  return {
    canvas, cast,
    get backdrop(){ return bg.name; }, get seed(){ return bg.seed; },
    reroll(){ bg = makeBackdrop({W, H, ground: GROUND}, pal); },
    setVoice(side, v){ voices[side] = v; },
    setTimeline(list){
      timed = list; layouts = new Map();
      for (const t of list) layouts.set(t, layout(g, t.synth.plan.chars, face, PX_MAX[t.mood]));
    },
    async render(clock_, origin = 0){
      clock = clock_; const t = clock_ - origin;
      const state = {} as Record<Side, {line: Timed | null; talking: boolean; shown: number}>;
      for (const side of ["L", "R"] as Side[]) state[side] = {line: null, talking: false, shown: 0};
      for (const tl of timed){
        if (tl.start > t) break;
        const s = state[tl.side], local = t - tl.offset;
        s.line = tl; s.talking = t < tl.end;
        const chars = tl.synth.plan.chars; let n = 0;
        while (n < chars.length && chars[n].t <= local) n++;
        s.shown = n;
      }
      for (const side of ["L", "R"] as Side[]){
        const s = state[side], c = cast[side];
        c.ch.setOpen(s.talking && s.line ? mouth(s.line, t - s.line.offset) : 0);
        c.ch.setTilt(s.line ? tilt(s.line, t - s.line.offset, side) : 0);
        const svg = c.host.firstElementChild as SVGSVGElement;
        const eyes = svg.querySelector<SVGGElement>(".eyes");
        // blink: closed for 0.1 s every 4.6 s, offset so the two people don't blink together
        if (eyes){
          const shut = ((clock_ + (side === "R" ? 2.1 : 0)) % 4.6) > 4.5;
          eyes.style.cssText = "transform-box:fill-box;transform-origin:center" + (shut ? ";transform:scaleY(.1)" : "");
        }
        const key = new XMLSerializer().serializeToString(svg);
        if (key !== c.key){ c.key = key; c.img = await rasterise(key); }
      }
      bg.draw(g, clock_);
      for (const side of ["L", "R"] as Side[]) drawSide(g, side, state[side], t, layouts, cast[side].img, voices[side], pal, face, o.tags);
    },
  };
}

/* What a line is doing, read from its text and the time each character appears: a question, a shout (a "!" or an
   ALL-CAPS word) or a whisper. Each question or emphasised word becomes a beat, which the head tilt and the bubble react to. */
function emphasis(chars: {c: string; t: number; w: number}[]): {mood: Mood; beats: Beat[]} {
  const beats: Beat[] = [];
  let word = 0, shout = false, letters = 0, quiet = 0;
  for (let i = 0; i <= chars.length; i++){
    const c = i < chars.length ? chars[i].c : " ";
    if (c !== " ") continue;
    const w = chars.slice(word, i), text = w.map(x => x.c).join(""), at = w.length ? w[0].t : 0;
    const alpha = text.replace(/[^A-Za-z]/g, "");
    if (alpha.length >= 2 && alpha === alpha.toUpperCase()){ beats.push({t: at, kind: "caps"}); shout = true; }
    if (/\?+$/.test(text)) beats.push({t: at, kind: "q"});
    else if (/!+$/.test(text)){ beats.push({t: at, kind: "ex"}); shout = true; }
    word = i + 1;
  }
  for (const ch of chars) if (ch.c !== " "){ letters++; if (ch.w) quiet++; }
  const last = chars.length ? chars[chars.length - 1].c : "";
  const mood: Mood = letters && quiet / letters > 0.6 ? "whisper" : shout ? "shout" : last === "?" ? "ask" : "plain";
  return {mood, beats: beats.sort((a, b) => a.t - b.t)};
}

/* Head tilt in degrees at `local` seconds into a line, stepped to whole 2 degrees on 15 fps so it moves like cut paper.
   A question tips the head towards the other person and holds it until just after the line ends; emphasis is a
   quick lean one way then back, alternating sides. */
function tilt(tl: Timed, local: number, side: Side): number {
  const q = Math.floor(local * 15) / 15, lean = side === "L" ? 1 : -1, over = tl.end - tl.offset;
  let a = 0;
  tl.beats.forEach((b, i) => {
    const d = q - b.t; if (d < 0) return;
    if (b.kind === "q"){
      const rise = Math.min(1, d / 0.2), release = 1 - CLAMP((q - over - 0.45) / 0.25, 0, 1);
      a += lean * 10 * (1 - (1 - rise) * (1 - rise)) * release;
    } else if (d < 0.45) a += (i % 2 ? -1 : 1) * (b.kind === "caps" ? 6 : 4) * Math.sin(Math.PI * d / 0.45);
  });
  return Math.round(a / 2) * 2;
}

/* A beat makes the bubble swell and settle; a new line pops in with a little overshoot. */
function bubbleScale(tl: Timed, local: number, t: number): number {
  const age = t - tl.start, p = CLAMP(age / 0.25, 0, 1), c1 = 1.9, c3 = c1 + 1;
  let s = 0.3 + 0.7 * (1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2)); // ease-out-back
  for (const b of tl.beats){ const d = local - b.t; if (d >= 0 && d < 0.5) s += 0.07 * Math.exp(-d / 0.14); }
  if (tl.mood === "shout" && t < tl.end) s *= 1 + 0.015 * Math.sin(t * 24);
  return s;
}

/* How open the mouth is at `local` seconds into a line: the same maths as the live animation loop. */
function mouth(t: Timed, local: number): number {
  const tr = t.synth.track, i = Math.floor(Math.max(0, local) / tr.step);
  if (i >= tr.F1.length) return 0;
  const amp = Math.min(1, tr.amp[i]); if (amp <= 0.04) return 0;
  const open = CLAMP((tr.F1[i] / t.synth.sc - 260) / 520, 0, 1);
  const sy = 0.14 + 1.05 * open * Math.min(1, amp * 1.6);
  return CLAMP((sy - 0.14) / 0.9, 0, 1);
}

async function rasterise(svg: string): Promise<HTMLImageElement> {
  const src = svg.replace(/^<svg([^>]*)>/, `<svg$1 width="${ACTOR_W}" height="${Math.round(ACTOR_H)}"><style>${CHAR_CSS}</style>`);
  const img = new Image();
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(src);
  await img.decode();
  return img;
}

/* Wrap a line's final text once, so the bubble keeps its size while the letters appear in it. */
function layout(g: CanvasRenderingContext2D, chars: {c: string; w: boolean}[], face: string, pxMax: number): Laid {
  const maxW = COL_W - 2 * BUBBLE_PAD - 8;
  let out: Laid | null = null;
  for (let px = pxMax; px >= 16; px -= 2){
    const lh = Math.round(px * 1.4), font = (w: boolean) => `${w ? "italic " : ""}700 ${px}px ${face}`;
    const width = chars.map(ch => { g.font = font(!!ch.w); return g.measureText(ch.c).width; });
    const placed: Laid["chars"] = []; let x = 0, row = 0, i = 0, wide = 0;
    while (i < chars.length){
      let j = i; // a word plus the spaces after it
      while (j < chars.length && chars[j].c !== " ") j++;
      while (j < chars.length && chars[j].c === " ") j++;
      let ww = 0, trailing = 0;
      for (let k = i; k < j; k++){ ww += width[k]; trailing = chars[k].c === " " ? trailing + width[k] : 0; }
      if (x > 0 && x + ww - trailing > maxW){ row++; x = 0; }
      for (let k = i; k < j; k++){
        if (x + width[k] > maxW && x > 0 && chars[k].c !== " "){ row++; x = 0; } // a word longer than a line
        placed.push({c: chars[k].c, x, y: row * lh, w: chars[k].w ? 1 : 0, i: k}); x += width[k]; if (chars[k].c !== " ") wide = Math.max(wide, x);
      }
      i = j;
    }
    out = {px, lh, width: wide, chars: placed, height: (row + 1) * lh};
    if (out.height <= TEXT_MAX_H) break;
  }
  return out!;
}

/* a spiky outline for shouted lines: teeth alternate in and out around the edge of the box */
function burst(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number){
  const tooth = 7, step = 20, pts: [number, number][] = [];
  const edge = (x0: number, y0: number, dx: number, dy: number, len: number) => {
    const n = Math.max(2, Math.round(len / step));
    for (let i = 0; i < n; i++){ const a = i / n, b = (i + 0.5) / n, nx = dy, ny = -dx; // outward normal
      pts.push([x0 + dx * len * a, y0 + dy * len * a], [x0 + dx * len * b + nx * tooth, y0 + dy * len * b + ny * tooth]); }
  };
  edge(x, y, 1, 0, w); edge(x + w, y, 0, 1, h); edge(x + w, y + h, -1, 0, w); edge(x, y + h, 0, -1, h);
  g.beginPath(); pts.forEach(([px, py], i) => i ? g.lineTo(px, py) : g.moveTo(px, py)); g.closePath();
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number){
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

function drawSide(g: CanvasRenderingContext2D, side: Side, s: {line: Timed | null; talking: boolean; shown: number}, t: number,
  layouts: Map<Timed, Laid>, img: HTMLImageElement | null, voice: SceneVoice, pal: Record<string, string>, face: string, tags: boolean){
  const x0 = COL_X[side], cx = x0 + COL_W / 2;
  // character, swaying a degree or two while they talk (two steps every 0.36 s, like the page)
  if (img){
    g.save();
    if (s.talking){ g.translate(cx, ACTOR_TOP + ACTOR_H / 2); g.rotate((Math.floor(t / 0.18) % 2 ? 1.4 : -1.4) * Math.PI / 180); g.translate(-cx, -(ACTOR_TOP + ACTOR_H / 2)); }
    g.drawImage(img, cx - ACTOR_W / 2, ACTOR_TOP, ACTOR_W, ACTOR_H);
    g.restore();
  }
  // name tag (the page draws its own, so it can be renamed)
  if (tags){
    g.font = `700 26px ${face}`;
    const label = voice.name, tw = Math.min(COL_W - 40, g.measureText(label).width), bw = tw + 32, bh = 40, by = 654;
    roundRect(g, cx - bw / 2, by, bw, bh, 4); g.fillStyle = pal.teal; g.fill(); g.lineWidth = 2; g.strokeStyle = pal.tealDk; g.stroke();
    g.fillStyle = "#fff"; g.textBaseline = "middle"; g.textAlign = "center"; g.fillText(label, cx, by + bh / 2 + 1, tw); g.textAlign = "left";
  }
  // bubble: hidden until this person has said something, then it keeps their last line
  const L = s.line && layouts.get(s.line);
  if (!s.line || !L) return;
  const bh2 = Math.max(BUBBLE_MIN, L.height + 2 * BUBBLE_PAD), top = BUBBLE_BOTTOM - bh2;
  // the bubble hugs its text (centred over the person) instead of always filling the column
  const bubW = CLAMP(L.width + 2 * BUBBLE_PAD + 8, BUBBLE_MIN_W, COL_W), bx = x0 + (COL_W - bubW) / 2;
  const tail = CLAMP(x0 + COL_W * (side === "L" ? 0.62 : 0.30), bx + 34, bx + bubW - 34);
  const mood = s.line.mood, local = t - s.line.offset, k = bubbleScale(s.line, local, t);
  g.save(); g.translate(tail, BUBBLE_BOTTOM + 17); g.scale(k, k); g.translate(-tail, -(BUBBLE_BOTTOM + 17)); // grows from the tail
  g.lineWidth = mood === "shout" ? 3.5 : 2; g.strokeStyle = mood === "shout" ? "#1a1a1a" : pal.edge; g.fillStyle = "#fff";
  if (mood === "whisper") g.setLineDash([7, 5]);
  if (mood === "shout") burst(g, bx, top, bubW, bh2); else roundRect(g, bx, top, bubW, bh2, 16);
  g.fill(); g.stroke(); g.setLineDash([]); g.lineWidth = 2; g.strokeStyle = pal.edge;
  g.beginPath(); g.moveTo(tail - 13, BUBBLE_BOTTOM); g.lineTo(tail, BUBBLE_BOTTOM + 17); g.lineTo(tail + 13, BUBBLE_BOTTOM); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(tail - 11, BUBBLE_BOTTOM); g.lineTo(tail + 11, BUBBLE_BOTTOM); g.lineWidth = 3.5; g.strokeStyle = "#fff"; g.stroke();
  g.fillStyle = "#1a1a1a"; g.textBaseline = "alphabetic";
  for (const ch of L.chars){
    if (ch.i >= s.shown || ch.c === " ") continue;
    g.font = `${ch.w ? "italic " : ""}700 ${L.px}px ${face}`; g.globalAlpha = ch.w ? 0.55 : 1;
    g.fillText(ch.c, bx + BUBBLE_PAD + 4 + ch.x, top + BUBBLE_PAD + ch.y + L.lh * 0.74);
  }
  g.globalAlpha = 1;
  if (!s.talking){ // the little bobbing arrow once the line is finished
    const bob = Math.floor(t / 0.5) % 2 ? 3 : 0, ax = bx + bubW - 30, ay = BUBBLE_BOTTOM - 20 + bob;
    g.fillStyle = pal.accent; g.beginPath(); g.moveTo(ax - 8, ay - 6); g.lineTo(ax + 8, ay - 6); g.lineTo(ax, ay + 6); g.fill();
  }
  g.restore();
}
