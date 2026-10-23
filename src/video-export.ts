/* Offline video export of a two-person conversation. Nothing is recorded in real time: every frame is drawn
   to a canvas from the plan and the render's track (the same data the live page animates from), the speech is
   mixed into one audio buffer, and both go through WebCodecs into an MP4 (or WebM where MP4 can't be encoded).
   So a minute of conversation exports in a few seconds, and the tab can be in the background. */
import {Output, Mp4OutputFormat, WebMOutputFormat, BufferTarget, CanvasSource, AudioBufferSource, getFirstEncodableVideoCodec, getFirstEncodableAudioCodec, QUALITY_HIGH} from "mediabunny";
import {SR} from "./mumble-core";
import {buildTimeline, createScene, hop, W, H, type Side, type SceneVoice} from "./scene";

export type {Side} from "./scene";
export interface ExportLine { side: Side; text: string }
export type ExportVoice = SceneVoice;
export interface ExportOptions {
  lines: ExportLine[];
  voices: Record<Side, ExportVoice>;
  /** Returns the (possibly cached) synth for a line. Must be the same function the live player uses. */
  synthFor: (text: string, side: Side) => any;
  onProgress?: (fraction: number, label: string) => void;
  signal?: AbortSignal;
  /** A backdrop name from BACKDROP_NAMES; anything else picks one at random. */
  backdrop?: string;
  /** with `backdrop`: the exact same layout of clouds, stars and particles as the page is showing */
  seed?: number;
}
export interface ExportResult { bytes: Uint8Array; mime: string; ext: string; seconds: number; backdrop: string }

const FPS = 30, AUDIO_SR = 48000;

const aborted = () => new DOMException("Export cancelled", "AbortError");
export async function exportConversation(opt: ExportOptions): Promise<ExportResult> {
  const {lines, voices, synthFor, signal} = opt, say = opt.onProgress || (() => {});
  const check = () => { if (signal?.aborted) throw aborted(); };
  if (!lines.length) throw new Error("There are no lines to export.");

  /* ---- 1. render every line's speech and lay the lines out on a timeline ---- */
  const {timed, total} = await buildTimeline(lines, synthFor, {hop, check, progress: (f, label) => say(0.25 * f, label)});
  const frames = Math.ceil(total * FPS);

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

  /* ---- 4. the scene: the same one the page plays ---- */
  const scene = createScene({voices, backdrop: opt.backdrop, seed: opt.seed, tags: true});
  scene.setTimeline(timed);

  /* ---- 5. encode ---- */
  const output = new Output({format, target: new BufferTarget()});
  const video = new CanvasSource(scene.canvas, {codec: vcodec, bitrate: QUALITY_HIGH});
  const audio = new AudioBufferSource({codec: acodec, bitrate: QUALITY_HIGH});
  output.addVideoTrack(video, {frameRate: FPS});
  output.addAudioTrack(audio);
  try {
    await output.start();
    await audio.add(mixed);
    for (let f = 0; f < frames; f++){
      check();
      await scene.render(f / FPS);
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
  return {bytes, mime: isMp4 ? "video/mp4" : "video/webm", ext: isMp4 ? "mp4" : "webm", seconds: total, backdrop: scene.backdrop};
}
