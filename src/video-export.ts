/* Offline video export of a two-person conversation. Nothing is recorded in real time: every frame is drawn
   to a canvas from the plan and the render's track (the same data the live page animates from), the speech is
   mixed into one audio buffer, and both go through WebCodecs into an MP4 (or WebM where MP4 can't be encoded).
   So a minute of conversation exports in a few seconds, and the tab can be in the background. */
import {Output, Mp4OutputFormat, WebMOutputFormat, BufferTarget, CanvasSource, AudioBufferSource, getFirstEncodableVideoCodec, getFirstEncodableAudioCodec, QUALITY_HIGH} from "mediabunny";
import {createCharacter, lookFor, type Character} from "./character";
import {CLAMP, SR} from "./mumble-core";

export type Side = "L" | "R";
export interface ExportLine { side: Side; text: string }
export interface ExportVoice { name: string; color: string; look?: string }
export interface ExportOptions {
  lines: ExportLine[];
  voices: Record<Side, ExportVoice>;
  /** Returns the (possibly cached) synth for a line. Must be the same function the live player uses. */
  synthFor: (text: string, side: Side) => any;
  onProgress?: (fraction: number, label: string) => void;
  signal?: AbortSignal;
}
export interface ExportResult { bytes: Uint8Array; mime: string; ext: string; seconds: number }

const W = 1280, H = 720, FPS = 30, LEAD = 0.6, GAP = 0.38, TAIL = 1.2, AUDIO_SR = 48000;
const START_DELAY = 0.05; // live playback starts each line this long after it is queued
const GROUND = 0.6;
const COL_W = 580, COL_X: Record<Side, number> = {L: 40, R: 660};
const BUBBLE_BOTTOM = 250, BUBBLE_MIN = 120, BUBBLE_PAD = 18, TEXT_MAX_H = 176;
const ACTOR_W = 245, VB = [-20, -24, 240, 316];
const ACTOR_H = ACTOR_W * VB[3] / VB[2], ACTOR_TOP = 644 - ACTOR_H; // feet stay on the same line whatever the size
const CHAR_CSS = `.ch *{stroke:#1a1a1a;stroke-opacity:.38;stroke-width:1;stroke-linejoin:round}.ch .ns,.ch .ns *{stroke:none}.ch text{font-family:"Arial Black",Arial,sans-serif;font-weight:900}`;

const aborted = () => new DOMException("Export cancelled", "AbortError");
// MessageChannel hops are not throttled in background tabs the way setTimeout is
const hop = (() => { const ch = new MessageChannel(); const q: (() => void)[] = []; ch.port1.onmessage = () => q.shift()?.(); return () => new Promise<void>(r => { q.push(r); ch.port2.postMessage(0); }); })();

interface Timed { side: Side; text: string; synth: any; start: number; end: number; offset: number }
interface Laid { px: number; lh: number; chars: {c: string; x: number; y: number; w: number; i: number}[]; height: number }

export async function exportConversation(opt: ExportOptions): Promise<ExportResult> {
  const {lines, voices, synthFor, signal} = opt, say = opt.onProgress || (() => {});
  const check = () => { if (signal?.aborted) throw aborted(); };
  if (!lines.length) throw new Error("There are no lines to export.");

  /* ---- 1. render every line's speech and lay the lines out on a timeline ---- */
  const timed: Timed[] = [];
  let cursor = LEAD;
  for (let i = 0; i < lines.length; i++){
    check(); say(0.25 * i / lines.length, `Synthesising line ${i + 1} of ${lines.length}`);
    const synth = synthFor(lines[i].text, lines[i].side);
    while (!synth.done){ synth.next(200); await hop(); check(); }
    const offset = cursor + START_DELAY, end = offset + synth.plan.dur;
    timed.push({...lines[i], synth, start: cursor, end, offset});
    cursor = end + GAP;
  }
  const total = timed[timed.length - 1].end + TAIL, frames = Math.ceil(total * FPS);

  /* ---- 2. mix the audio (the offline context also resamples 32 kHz to 48 kHz) ---- */
  say(0.27, "Mixing audio");
  const oc = new OfflineAudioContext(2, Math.ceil(total * AUDIO_SR), AUDIO_SR);
  for (const t of timed){
    const buf = oc.createBuffer(1, t.synth.samples.length, SR);
    buf.copyToChannel(t.synth.samples, 0);
    const src = oc.createBufferSource(); src.buffer = buf; src.connect(oc.destination); src.start(t.offset);
  }
  const mixed = await oc.startRendering(); check();

  /* ---- 3. pick codecs ---- */
  const cfg = {width: W, height: H, frameRate: FPS, quality: QUALITY_HIGH};
  const mp4 = new Mp4OutputFormat(), webm = new WebMOutputFormat();
  let format: Mp4OutputFormat | WebMOutputFormat = mp4, vcodec = await getFirstEncodableVideoCodec(mp4.getSupportedVideoCodecs(), cfg);
  let acodec = vcodec && await getFirstEncodableAudioCodec(mp4.getSupportedAudioCodecs(), {numberOfChannels: 2, sampleRate: AUDIO_SR});
  if (!vcodec || !acodec){
    format = webm;
    vcodec = await getFirstEncodableVideoCodec(webm.getSupportedVideoCodecs(), cfg);
    acodec = await getFirstEncodableAudioCodec(webm.getSupportedAudioCodecs(), {numberOfChannels: 2, sampleRate: AUDIO_SR});
  }
  if (!vcodec || !acodec) throw new Error("This browser can't encode video. Try a recent Chrome, Edge or Safari.");

  /* ---- 4. the scene ---- */
  const canvas = document.createElement("canvas"); canvas.width = W; canvas.height = H;
  const g = canvas.getContext("2d", {alpha: false})!;
  const css = getComputedStyle(document.documentElement), cv = (n: string) => css.getPropertyValue(n).trim();
  const pal = {skyTop: cv("--sky-top"), skyBot: cv("--sky-bot"), snow: cv("--snow"), pine: cv("--pine"), edge: cv("--soft-edge"), teal: cv("--teal"), tealDk: cv("--teal-dk"), accent: cv("--accent")};
  const face = cv("--pixel") || "system-ui, sans-serif";
  const bg = background(pal);

  let clock = 0; // seconds; drives gestures
  const cast = {} as Record<Side, {ch: Character; host: HTMLElement; img: HTMLImageElement | null; key: string}>;
  for (const side of ["L", "R"] as Side[]){
    const host = document.createElement("div"), v = voices[side];
    const ch = createCharacter(host, side === "R", () => clock * 1000);
    ch.setLook(lookFor(v.look || v.name, v.color));
    cast[side] = {ch, host, img: null, key: ""};
  }
  const layouts = new Map<Timed, Laid>();
  for (const t of timed) layouts.set(t, layout(g, t.synth.plan.chars, face));

  /* ---- 5. encode ---- */
  const output = new Output({format, target: new BufferTarget()});
  const video = new CanvasSource(canvas, {codec: vcodec, bitrate: QUALITY_HIGH});
  const audio = new AudioBufferSource({codec: acodec, bitrate: QUALITY_HIGH});
  output.addVideoTrack(video, {frameRate: FPS});
  output.addAudioTrack(audio);
  try {
    await output.start();
    await audio.add(mixed);
    for (let f = 0; f < frames; f++){
      check();
      const t = f / FPS; clock = t;
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
        const svg = c.host.firstElementChild as SVGSVGElement;
        const eyes = svg.querySelector<SVGGElement>(".eyes");
        // blink: closed for 0.1 s every 4.6 s, offset so the two people don't blink together
        if (eyes){
          const shut = ((t + (side === "R" ? 2.1 : 0)) % 4.6) > 4.5;
          eyes.style.cssText = "transform-box:fill-box;transform-origin:center" + (shut ? ";transform:scaleY(.1)" : "");
        }
        const key = new XMLSerializer().serializeToString(svg);
        if (key !== c.key){ c.key = key; c.img = await rasterise(key); }
      }
      g.drawImage(bg, 0, 0);
      for (const side of ["L", "R"] as Side[]) drawSide(g, side, state[side], t, layouts, cast[side].img, voices[side], pal, face);
      await video.add(f / FPS, 1 / FPS);
      if (f % 8 === 0){ say(0.3 + 0.68 * f / frames, `Rendering video, ${Math.round(100 * f / frames)}%`); await hop(); }
    }
    video.close(); audio.close();
    say(0.99, "Finishing the file");
    await output.finalize();
  } catch (e){
    try { await output.cancel(); } catch {}
    throw e;
  }
  const bytes = new Uint8Array((output.target as BufferTarget).buffer!);
  const isMp4 = format === mp4;
  return {bytes, mime: isMp4 ? "video/mp4" : "video/webm", ext: isMp4 ? "mp4" : "webm", seconds: total};
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

/* sky, snow, the two hills and the frame: identical every frame, so drawn once */
function background(p: Record<string, string>): HTMLCanvasElement {
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const g = c.getContext("2d")!, gy = H * GROUND;
  const sky = g.createLinearGradient(0, 0, 0, gy); sky.addColorStop(0, p.skyTop); sky.addColorStop(1, p.skyBot);
  g.fillStyle = sky; g.fillRect(0, 0, W, gy);
  g.fillStyle = p.snow; g.fillRect(0, gy, W, H - gy);
  const base = H * 0.62;
  for (const [x, w, h] of [[-0.04 * W, 0.46 * W, 105], [W * 1.06 - 0.52 * W, 0.52 * W, 158]]){
    g.beginPath(); g.ellipse(x + w / 2, base, w / 2, h, 0, Math.PI, 0);
    g.fillStyle = p.pine; g.fill(); g.lineWidth = 2; g.strokeStyle = p.edge; g.stroke();
    g.fillStyle = p.snow; g.fillRect(x - 6, base, w + 12, 3); // hide the stroke's bottom edge, as the page does
  }
  g.lineWidth = 3; g.strokeStyle = p.edge; g.strokeRect(1.5, 1.5, W - 3, H - 3);
  return c;
}

/* Wrap a line's final text once, so the bubble keeps its size while the letters appear in it. */
function layout(g: CanvasRenderingContext2D, chars: {c: string; w: boolean}[], face: string): Laid {
  const maxW = COL_W - 2 * BUBBLE_PAD - 8;
  let out: Laid | null = null;
  for (let px = 32; px >= 18; px -= 2){
    const lh = Math.round(px * 1.4), font = (w: boolean) => `${w ? "italic " : ""}700 ${px}px ${face}`;
    const width = chars.map(ch => { g.font = font(!!ch.w); return g.measureText(ch.c).width; });
    const placed: Laid["chars"] = []; let x = 0, row = 0, i = 0;
    while (i < chars.length){
      let j = i; // a word plus the spaces after it
      while (j < chars.length && chars[j].c !== " ") j++;
      while (j < chars.length && chars[j].c === " ") j++;
      let ww = 0, trailing = 0;
      for (let k = i; k < j; k++){ ww += width[k]; trailing = chars[k].c === " " ? trailing + width[k] : 0; }
      if (x > 0 && x + ww - trailing > maxW){ row++; x = 0; }
      for (let k = i; k < j; k++){
        if (x + width[k] > maxW && x > 0 && chars[k].c !== " "){ row++; x = 0; } // a word longer than a line
        placed.push({c: chars[k].c, x, y: row * lh, w: chars[k].w ? 1 : 0, i: k}); x += width[k];
      }
      i = j;
    }
    out = {px, lh, chars: placed, height: (row + 1) * lh};
    if (out.height <= TEXT_MAX_H) break;
  }
  return out!;
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number){
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

function drawSide(g: CanvasRenderingContext2D, side: Side, s: {line: Timed | null; talking: boolean; shown: number}, t: number,
  layouts: Map<Timed, Laid>, img: HTMLImageElement | null, voice: ExportVoice, pal: Record<string, string>, face: string){
  const x0 = COL_X[side], cx = x0 + COL_W / 2;
  // character, swaying a degree or two while they talk (two steps every 0.36 s, like the page)
  if (img){
    g.save();
    if (s.talking){ g.translate(cx, ACTOR_TOP + ACTOR_H / 2); g.rotate((Math.floor(t / 0.18) % 2 ? 1.4 : -1.4) * Math.PI / 180); g.translate(-cx, -(ACTOR_TOP + ACTOR_H / 2)); }
    g.drawImage(img, cx - ACTOR_W / 2, ACTOR_TOP, ACTOR_W, ACTOR_H);
    g.restore();
  }
  // name tag
  g.font = `700 26px ${face}`;
  const label = voice.name, tw = Math.min(COL_W - 40, g.measureText(label).width), bw = tw + 32, bh = 40, by = 654;
  roundRect(g, cx - bw / 2, by, bw, bh, 4); g.fillStyle = pal.teal; g.fill(); g.lineWidth = 2; g.strokeStyle = pal.tealDk; g.stroke();
  g.fillStyle = "#fff"; g.textBaseline = "middle"; g.textAlign = "center"; g.fillText(label, cx, by + bh / 2 + 1, tw); g.textAlign = "left";
  // bubble: hidden until this person has said something, then it keeps their last line
  const L = s.line && layouts.get(s.line);
  if (!s.line || !L) return;
  const bh2 = Math.max(BUBBLE_MIN, L.height + 2 * BUBBLE_PAD), top = BUBBLE_BOTTOM - bh2;
  const tail = x0 + COL_W * (side === "L" ? 0.62 : 0.30);
  g.lineWidth = 2; g.strokeStyle = pal.edge; g.fillStyle = "#fff";
  roundRect(g, x0, top, COL_W, bh2, 16); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(tail - 13, BUBBLE_BOTTOM); g.lineTo(tail, BUBBLE_BOTTOM + 17); g.lineTo(tail + 13, BUBBLE_BOTTOM); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(tail - 11, BUBBLE_BOTTOM); g.lineTo(tail + 11, BUBBLE_BOTTOM); g.lineWidth = 3.5; g.strokeStyle = "#fff"; g.stroke();
  g.fillStyle = "#1a1a1a"; g.textBaseline = "alphabetic";
  for (const ch of L.chars){
    if (ch.i >= s.shown || ch.c === " ") continue;
    g.font = `${ch.w ? "italic " : ""}700 ${L.px}px ${face}`; g.globalAlpha = ch.w ? 0.55 : 1;
    g.fillText(ch.c, x0 + BUBBLE_PAD + 4 + ch.x, top + BUBBLE_PAD + ch.y + L.lh * 0.74);
  }
  g.globalAlpha = 1;
  if (!s.talking){ // the little bobbing arrow once the line is finished
    const bob = Math.floor(t / 0.5) % 2 ? 3 : 0, ax = x0 + COL_W - 30, ay = BUBBLE_BOTTOM - 20 + bob;
    g.fillStyle = pal.accent; g.beginPath(); g.moveTo(ax - 8, ay - 6); g.lineTo(ax + 8, ay - 6); g.lineTo(ax, ay + 6); g.fill();
  }
}
