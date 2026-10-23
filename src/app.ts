/* Mumble UI: dialogue box, voice editor, vowel map, streaming playback and the sound stepper. */
// @ts-nocheck -- ported from plain JS; DOM typing not yet added
import {createCharacter, lookFor, randomSeed} from "./character";
import {CLAMP, SR, CF, VKEYS, VWORD, calibrate, createSynth, itemsOf, speakerTable} from "./mumble-core";
import {exportConversation} from "./video-export";
import {createScene, buildTimeline, hop} from "./scene";
(() => {
"use strict";

/* ===================== voices ===================== */
const BASE = {name:"Voice", color:"#c98b5a", engine:"formant", style:"babble", speaker:0, pitch:128, tract:1, tension:0.6, brightness:0.55,
  breath:0.15, jitter:0.02, creak:0.2, wobRate:0, wobDepth:0, nasality:0, mutter:0, consonants:0.7, smooth:0.4,
  cps:30, decl:3.5, random:1, length:1.15, volume:1};
const DEFAULTS = [
  {name:"Guard", color:"#8a9bb0", pitch:94, tract:0.96, tension:0.72, brightness:0.5, breath:0.1, creak:0.35, consonants:0.85, decl:3, random:0.6, length:1.2},
  {name:"Villager", color:"#c98b5a"},
  {name:"Sister Agnes", color:"#e8c9a8", speaker:1, pitch:212, tension:0.5, breath:0.28, creak:0.1, decl:4, random:0.9, length:1.2},
  {name:"Pip", color:"#ffcf6b", speaker:2, pitch:300, tract:1.04, tension:0.6, breath:0.2, cps:38, decl:5, random:1.8, length:1.05},
  {name:"Old Barnaby", color:"#b7a99a", pitch:136, tension:0.42, brightness:0.4, breath:0.34, jitter:0.035, creak:0.6, wobRate:2.1, wobDepth:0.9, cps:24, length:1.35},
  {name:"Captain Gristle", color:"#7d5a44", pitch:102, tract:0.94, mutter:0.7, tension:0.72, brightness:0.42, breath:0.22, jitter:0.03, creak:0.5, nasality:0.1, cps:28, random:1.2, length:1.3},
  {name:"Snig the Goblin", color:"#8fbf5a", engine:"tract", speaker:1.4, pitch:250, tract:1.1, tension:0.75, nasality:0.6, brightness:0.75, jitter:0.03, cps:36, random:2.2, decl:5},
  {name:"Whiskers", color:"#f0a35e", style:"letters", speaker:2, tract:1.15, pitch:380, nasality:0.25, brightness:0.7, cps:34, random:2.2, length:1},
  {name:"Bramble", color:"#a87fd1", style:"grunts", pitch:150, tension:0.55, breath:0.25, creak:0.3, random:1.5},
  {name:"Tiny Beeper", color:"#6fb3e8", style:"beeps", pitch:260, brightness:0.6, random:1.2, decl:3},
  {name:"Gordie", color:"#d6453a", pitch:112, tract:0.98, tension:0.62, brightness:0.5, breath:0.14, creak:0.25, cps:30, decl:4, random:1.2, length:1.2},
  {name:"Bernie", color:"#3f7fbf", speaker:0.5, pitch:168, tract:1, tension:0.55, brightness:0.55, breath:0.2, creak:0.12, cps:32, decl:4.5, random:1.5, length:1.15},
  {name:"Unit 7", color:"#7fd1c7", pitch:150, tension:0.8, brightness:0.9, breath:0, jitter:0, creak:0, decl:0, random:0, smooth:0.1, consonants:0.9}
];
const ENGINES = [["formant","Formant (Klatt)","A cascade of five resonators driven by an LF glottal pulse. Vowel targets come from Hillenbrand et al. (1995)."],
                 ["tract","Vocal tract","A physical tube model in the style of Pink Trombone. Tongue, lips and nose shape the sound, so consonants come out more naturally."]];
const STYLES = [["babble","Vowel babble","One sound per syllable, with consonants shaping each vowel."],
                ["letters","Letter by letter","Animalese style: a quick sound for every letter."],
                ["beeps","Beeps","One blip per letter, like Undertale."],
                ["grunts","Grunts","A few signature grunts per character, like Banjo-Kazooie."]];
const PARAMS = [
  {g:"Voice", k:"speaker", label:"Speaker", min:0, max:2, step:0.01, fmt:v => v < 0.15 ? "man" : v < 0.85 ? "man to woman" : v < 1.15 ? "woman" : v < 1.85 ? "woman to child" : "child", hint:"Blends between measured men's, women's and children's vowels."},
  {g:"Voice", k:"pitch", label:"Pitch", min:20, max:520, step:1, fmt:v => `${Math.round(v)} Hz`, hint:"How fast the vocal folds buzz."},
  {g:"Voice", k:"tract", label:"Size tweak", min:0.8, max:1.25, step:0.01, fmt:v => v < 0.97 ? `bigger (${v.toFixed(2)})` : v > 1.03 ? `smaller (${v.toFixed(2)})` : "as measured", hint:"Fine-tunes throat length on top of the speaker."},
  {g:"Voice", k:"tension", label:"Tension", min:0.25, max:0.95, step:0.01, fmt:v => v < 0.45 ? "breathy" : v > 0.75 ? "pressed" : "relaxed", hint:"How tightly the vocal folds close. Pressed voices sound harder and brighter."},
  {g:"Voice", k:"brightness", label:"Brightness", min:0, max:1, step:0.01, fmt:pct, hint:"Soft and dark through to sharp."},
  {g:"Texture", k:"breath", label:"Breath", min:0, max:0.8, step:0.01, fmt:pct, hint:"Air mixed in with the buzz."},
  {g:"Texture", k:"jitter", label:"Roughness", min:0, max:0.06, step:0.001, fmt:v => `${(v * 100).toFixed(1)}%`, hint:"Cycle-to-cycle wobble in pitch and loudness. At zero it sounds like a robot."},
  {g:"Texture", k:"creak", label:"Creak", min:0, max:1, step:0.01, fmt:pct, hint:"Vocal fry at the ends of sentences."},
  {g:"Texture", k:"wobRate", label:"Wobble speed", min:0, max:8, step:0.1, fmt:v => v === 0 ? "off" : `${v.toFixed(1)} per second`, hint:"About twice a second sounds old."},
  {g:"Texture", k:"wobDepth", label:"Wobble amount", min:0, max:3, step:0.05, fmt:v => `${v.toFixed(2)} semitones`, hint:""},
  {g:"Texture", k:"nasality", label:"Nasal", min:0, max:1, step:0.01, fmt:pct, hint:"Lets sound through the nose on every vowel."},
  {g:"Mouth", k:"mutter", label:"Mumble", min:0, max:1, step:0.01, fmt:pct, hint:"Talk with the mouth almost closed."},
  {g:"Mouth", k:"consonants", label:"Consonants", min:0, max:1, step:0.01, fmt:pct, hint:"How much consonants hiss and pop. Even at zero they still bend the vowels."},
  {g:"Mouth", k:"smooth", label:"Smoothness", min:0, max:1, step:0.01, fmt:v => v < 0.3 ? "crisp" : v > 0.7 ? "slurred" : "natural", hint:"How quickly the mouth moves between shapes."},
  {g:"Delivery", k:"cps", label:"Talking speed", min:12, max:60, step:1, fmt:v => `${v} letters a second`, hint:"The voice follows the typing."},
  {g:"Delivery", k:"decl", label:"Melody fall", min:0, max:8, step:0.1, fmt:v => `${v.toFixed(1)} semitones`, hint:"How far pitch drifts down across each phrase."},
  {g:"Delivery", k:"random", label:"Pitch variety", min:0, max:4, step:0.05, fmt:v => `${v.toFixed(2)} semitones`, hint:"A small nudge on each syllable."},
  {g:"Delivery", k:"length", label:"Syllable length", min:0.7, max:2, step:0.01, fmt:v => `${v.toFixed(2)}×`, hint:"Longer syllables blur into one stream."},
  {g:"Delivery", k:"volume", label:"Volume", min:0, max:1.6, step:0.01, fmt:pct, hint:""}
];
function pct(v){return `${Math.round(v * 100)}%`}
const EXAMPLES = [
  "Welcome back, traveller. Sister Agnes has been asking about you... Did you bring the fish?",
  "HALT! Nobody passes this gate after dark!",
  "Mrrp {purr} you smell like the docks. I like you.",
  "I remember when this whole town was just... a field. {sigh}",
  "Listen closely. {whisper}The mayor is not who he says he is.{/whisper}",
  "Did you really cross the marsh on your own? {laugh} Brave, or foolish?"
];

/* ===================== state + saving ===================== */
const LS_KEY = "mumble-voices-v2", LS_OLD = "mumble-voices-v1";
let state = {voices: [], sel: null};
let cloudDoc = null, saveTimer = null, saveChain = Promise.resolve();
const $ = id => document.getElementById(id);
const uid = () => "v" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const freshDefaults = () => DEFAULTS.map(d => clean({...BASE, ...d, id: uid()}));
function migrate(v){ // voices saved by the first version
  if (v && v.speaker === undefined && typeof v.tract === "number"){
    const t = v.tract; v = {...v, speaker: CLAMP((t - 1) / 0.17, 0, 2), tract: 1};
    if (v.speaker > 1) v.speaker = Math.min(2, 1 + (t - 1.17) / 0.13);
  }
  return v;
}
function clean(raw){
  const v = migrate(raw || {});
  const out = {id: typeof v.id === "string" ? v.id : uid(), name: String(v.name || "Voice").slice(0, 40), color: /^#[0-9a-f]{6}$/i.test(v.color) ? v.color : BASE.color,
    engine: ENGINES.some(e => e[0] === v.engine) ? v.engine : "formant", style: STYLES.some(s => s[0] === v.style) ? v.style : "babble"};
  if (typeof v.look === "string" && v.look) out.look = v.look.slice(0, 40); // seed for the character's look; the name is used when there is none
  for (const p of PARAMS){ const n = Number(v[p.k]); out[p.k] = Number.isFinite(n) ? CLAMP(n, p.min, p.max) : BASE[p.k]; }
  return out;
}
function applyLoaded(obj){
  if (!obj || !Array.isArray(obj.voices) || !obj.voices.length) return false;
  state.voices = obj.voices.map(clean);
  state.sel = state.voices.some(v => v.id === obj.sel) ? obj.sel : state.voices[0].id;
  return true;
}
function loadLocal(){
  for (const key of [LS_KEY, LS_OLD]){
    try { const raw = localStorage.getItem(key); if (raw && applyLoaded(JSON.parse(raw))) return; } catch(e){}
  }
  state.voices = freshDefaults(); state.sel = state.voices[0].id;
}
const snapshot = () => ({version: 2, voices: state.voices.map(v => ({...v})), sel: state.sel});
function save(){
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const snap = snapshot();
    try { localStorage.setItem(LS_KEY, JSON.stringify(snap)); } catch(e){}
    if (cloudDoc) saveChain = saveChain.then(() => cloudDoc.set(snap)).then(
      () => setStatus("Voices are saved to your account."),
      () => setStatus("Voices are saved in this browser. Saving to your account failed."));
  }, 700);
}
const setStatus = t => { $("status").textContent = t; };
async function initCloud(){
  try {
    if (!window.claude || typeof window.claude.use !== "function") return;
    const [db, user] = await Promise.all([window.claude.use("db"), window.claude.use("user")]);
    if (!db || !user) return;
    const id = await user.id(); if (!id) return;
    const ref = db.doc(`data/users/${id}/voices`);
    const snap = await ref.get();
    cloudDoc = ref;
    if (snap.exists && applyLoaded(snap.data())){
      try { localStorage.setItem(LS_KEY, JSON.stringify(snapshot())); } catch(e){}
      renderList(); renderEditor(); showVoice(current()); drawChart();
      if (!snap.data().version) await ref.set(snapshot());
    } else await ref.set(snapshot());
    setStatus("Voices are saved to your account.");
  } catch(e){}
}
const current = () => state.voices.find(v => v.id === state.sel) || state.voices[0];

/* ===================== playback: stream the render into the audio clock ===================== */
/* A face is one on-screen character plus the bubble its words appear in. */
function makeFace(textEl, moreEl, nameEl, actorEl, rootEl, flip = false){
  const ch = createCharacter(actorEl, flip);
  return {textEl, moreEl, nameEl, ch, rootEl};
}
const mainFace = makeFace($("text"), $("more"), $("nametag"), $("portrait"), null);
/* The chat stage is one canvas drawn by the same scene code the video export uses; each side's face is the scene's
   character plus the editable name tag laid over it. */
const stage = createScene({voices: {L: {name: "Left", color: "#c98b5a"}, R: {name: "Right", color: "#c98b5a"}}, tags: false, canvas: $("stageCanvas")});
const chatFaces = {
  L: {nameEl: $("nameL"), ch: stage.cast.L.ch},
  R: {nameEl: $("nameR"), ch: stage.cast.R.ch}
};
const textEl = mainFace.textEl, moreEl = mainFace.moreEl;
let ctx = null, line = null, queueToken = 0;
const cache = new Map();
const CHUNK = 100, OV = 128; // 0.2 s chunks overlapping by 2×128 samples, crossfaded
function audio(){ if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)(); if (ctx.state === "suspended") ctx.resume(); return ctx; }
function voiceKey(v){ return JSON.stringify([v.engine, v.style, ...PARAMS.map(p => v[p.k]), v.name]); }
function getSynth(raw, v){
  const key = raw + "\u0000" + voiceKey(v);
  const hit = cache.get(key);
  if (hit && hit.done){ cache.delete(key); cache.set(key, hit); return hit; }
  const s = createSynth(raw, v);
  cache.set(key, s); if (cache.size > 24) cache.delete(cache.keys().next().value);
  return s;
}
function showVoice(v, face = mainFace){ face.nameEl.textContent = v.name; face.ch.setLook(lookFor(v.look || v.name, v.color)); }
/* Give a voice a new random look and redraw everywhere it is on screen. */
function reroll(v){
  v.look = randomSeed();
  if (v === current()) showVoice(v);
  for (const side of ["L", "R"]) if (chatVoice(side) === v) showVoice(v, chatFaces[side]);
  save();
}

function speak(raw, v, face = mainFace){
  if (line) finishLine(true);
  if (typeof stopSegment === "function") stopSegment();
  const ac = audio();
  const t0 = performance.now();
  const synth = getSynth(raw, v);
  const P = synth.plan;
  showVoice(v, face);
  face.textEl.textContent = ""; face.moreEl.classList.remove("on");
  face.rootEl?.classList.add("talking");
  const out = ac.createGain(); out.connect(ac.destination);
  const L = {synth, P, out, srcs: [], next: 0, startAt: 0, shown: 0, span: null, spanW: null, raf: 0, timer: 0, v, face, trail: []};
  line = L;
  // first chunk now, so sound starts immediately
  if (!synth.done) synth.next(50);
  L.startAt = ac.currentTime + 0.05;
  $("perf").textContent = synth.done ? "from cache" : `first sound in ${Math.round(performance.now() - t0)} ms`;
  return new Promise(resolve => {
    L.resolve = resolve;
    pump(L);
    L.raf = requestAnimationFrame(() => frame(L));
  });
}
function schedule(L, s0, s1){
  const a = Math.max(0, s0 - OV), b = Math.min(L.synth.NS, s1 + OV), n = b - a;
  if (n <= 0) return;
  const buf = ctx.createBuffer(1, n, SR), data = new Float32Array(n);
  data.set(L.synth.samples.subarray(a, b));
  if (s0 > 0) for (let i = 0; i < 2 * OV && i < n; i++) data[i] *= i / (2 * OV);
  if (s1 < L.synth.NS) for (let i = 0; i < 2 * OV && i < n; i++) data[n - 1 - i] *= i / (2 * OV);
  buf.copyToChannel(data, 0);
  const src = ctx.createBufferSource(); src.buffer = buf; src.connect(L.out);
  src.start(Math.max(ctx.currentTime, L.startAt + a / SR));
  L.srcs.push(src);
}
function pump(L){
  if (line !== L) return;
  const s = L.synth, step = CHUNK * CF;
  const horizon = (ctx.currentTime - L.startAt + 0.6) * SR;
  // render ahead, then schedule every chunk whose overlap tail is ready
  while (!s.done && s.pos < horizon + step) s.next(CHUNK);
  while (L.next < s.NS && (s.done || s.pos >= L.next + step + OV)){
    const end = Math.min(s.NS, L.next + step);
    schedule(L, L.next, end);
    L.next = end;
  }
  if (L.next < s.NS) L.timer = setTimeout(() => pump(L), 60);
}

function frame(L){
  if (line !== L) return;
  const t = ctx.currentTime - L.startAt, P = L.P;
  // letters
  while (L.shown < P.chars.length && P.chars[L.shown].t <= t){
    const c = P.chars[L.shown++];
    appendChar(L, c);
  }
  // face + chart from the render's track
  const tr = L.synth.track, i = Math.floor(Math.max(0, t) / tr.step);
  if (i < tr.F1.length){
    const s = L.synth.sc, F1 = tr.F1[i], F2 = tr.F2[i], amp = Math.min(1, tr.amp[i]);
    const open = CLAMP((F1 / s - 260) / 520, 0, 1);
    const sy = amp > 0.04 ? 0.14 + 1.05 * open * Math.min(1, amp * 1.6) : 0.12;
    L.face.ch.setOpen(amp > 0.04 ? CLAMP((sy - 0.14) / 0.9, 0, 1) : 0);
    if (amp > 0.04){
      L.trail.push([F1, F2]); if (L.trail.length > 40) L.trail.shift();
      $("vow").textContent = nearestVowel(F1, F2);
      if (tr.f0[i] > 0) $("hz").textContent = `${Math.round(tr.f0[i])} Hz`;
    } else if (L.trail.length) L.trail.shift();
    drawChart(L.trail);
  }
  if (t > P.dur){ finishLine(false); return; }
  L.raf = requestAnimationFrame(() => frame(L));
}
function appendChar(L, c){
  if (L.spanW !== c.w || !L.span){
    L.span = document.createElement("span"); if (c.w) L.span.className = "wh";
    L.spanW = c.w; L.face.textEl.append(L.span);
  }
  L.span.textContent += c.c;
}
function finishLine(skip){
  if (!line) return;
  const L = line; line = null;
  cancelAnimationFrame(L.raf); clearTimeout(L.timer);
  if (skip){
    while (L.shown < L.P.chars.length) appendChar(L, L.P.chars[L.shown++]);
    const now = ctx.currentTime;
    L.out.gain.setValueAtTime(L.out.gain.value, now); L.out.gain.linearRampToValueAtTime(0, now + 0.05);
    setTimeout(() => { L.srcs.forEach(s => { try { s.stop(); } catch(e){} }); L.out.disconnect(); }, 120);
  } else setTimeout(() => L.out.disconnect(), 500);
  L.face.ch.setOpen(0);
  L.face.rootEl?.classList.remove("talking");
  $("vow").textContent = "—";
  L.face.moreEl.classList.add("on");
  drawChart();
  L.resolve();
}

async function speakEvery(){
  const token = ++queueToken, raw = $("line").value.trim() || EXAMPLES[0];
  for (const v of [...state.voices]){
    if (token !== queueToken) return;
    await speak(raw, v);
    await new Promise(r => setTimeout(r, 400));
  }
  if (token === queueToken) showVoice(current());
}

/* ===================== vowel map ===================== */
const chart = $("chart"), cx = chart.getContext("2d");
let chartTab = null, chartKey = "", colors = null;
function readColors(){ const cs = getComputedStyle(document.documentElement); colors = {ink: cs.getPropertyValue("--ink").trim(), muted: cs.getPropertyValue("--muted").trim(), line: cs.getPropertyValue("--line").trim(), dot: cs.getPropertyValue("--dot").trim(), danger: cs.getPropertyValue("--danger").trim(), font: "12px " + getComputedStyle(document.body).fontFamily, gold: "#f5b83d", accent: cs.getPropertyValue("--accent").trim()}; }
function nearestVowel(F1, F2){
  if (!chartTab) return "—";
  let best = "", bd = 1e9;
  for (const k of VKEYS){ const a = chartTab.tab[k].a, d = Math.pow(Math.log(F1 / a[0]), 2) * 2 + Math.pow(Math.log(F2 / a[1]), 2); if (d < bd){ bd = d; best = VWORD[k]; } }
  return best;
}
function drawChart(trail){
  const v = current(), key = v.speaker + "|" + v.tract;
  if (key !== chartKey){ chartTab = speakerTable(v.speaker, v.tract); chartKey = key; }
  if (!colors) readColors();
  const dpr = Math.min(2, window.devicePixelRatio || 1), W = chart.clientWidth, H = chart.clientHeight;
  if (!W) return;
  if (chart.width !== Math.round(W * dpr)){ chart.width = Math.round(W * dpr); chart.height = Math.round(H * dpr); }
  cx.setTransform(dpr, 0, 0, dpr, 0, 0);
  cx.clearRect(0, 0, W, H);
  const s = chartTab.sc, pad = 22;
  const x = f2 => pad + (1 - Math.log(f2 / (650 * s)) / Math.log(3300 / 650)) * (W - 2 * pad);
  const y = f1 => pad + Math.log(f1 / (220 * s)) / Math.log(1100 / 220) * (H - 2 * pad);
  cx.strokeStyle = colors.line; cx.lineWidth = 1;
  cx.strokeRect(pad, pad, W - 2 * pad, H - 2 * pad);
  cx.font = colors.font; cx.textBaseline = "middle";
  for (const k of VKEYS){
    const a = chartTab.tab[k].a, b = chartTab.tab[k].b, px = x(a[1]), py = y(a[0]);
    cx.strokeStyle = colors.dot; cx.beginPath(); cx.moveTo(px, py); cx.lineTo(x(b[1]), y(b[0])); cx.stroke();
    cx.fillStyle = colors.dot; cx.beginPath(); cx.arc(px, py, 4, 0, 6.283); cx.fill();
    cx.fillStyle = colors.muted; cx.fillText(VWORD[k], px + 7, py);
  }
  cx.save(); cx.beginPath(); cx.rect(pad, pad, W - 2 * pad, H - 2 * pad); cx.clip();
  if (trail && trail.length){
    for (let i = 1; i < trail.length; i++){
      cx.strokeStyle = colors.accent; cx.globalAlpha = i / trail.length; cx.lineWidth = 3;
      cx.beginPath(); cx.moveTo(x(trail[i-1][1]), y(trail[i-1][0])); cx.lineTo(x(trail[i][1]), y(trail[i][0])); cx.stroke();
    }
    cx.globalAlpha = 1;
    const l = trail[trail.length - 1];
    cx.fillStyle = colors.gold; cx.strokeStyle = colors.ink; cx.lineWidth = 2;
    cx.beginPath(); cx.arc(x(l[1]), y(l[0]), 7, 0, 6.283); cx.fill(); cx.stroke();
  }
  cx.restore();
}
matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", () => { colors = null; drawChart(); drawWave(); });
new ResizeObserver(() => drawChart()).observe(chart);

/* ===================== editor ===================== */
function renderList(){
  const ul = $("list"); ul.innerHTML = "";
  state.voices.forEach(v => {
    const li = document.createElement("li");
    li.className = "voice" + (v.id === state.sel ? " sel" : "");
    const pick = document.createElement("button");
    pick.className = "pick"; pick.setAttribute("aria-pressed", v.id === state.sel);
    const dot = document.createElement("span"); dot.className = "dot"; dot.style.background = v.color;
    const txt = document.createElement("span"); txt.style.minWidth = "0";
    const nm = document.createElement("span"); nm.className = "vname"; nm.textContent = v.name;
    const meta = document.createElement("span"); meta.className = "vmeta";
    meta.textContent = `${Math.round(v.pitch)} Hz, ${STYLES.find(s => s[0] === v.style)[1].toLowerCase()}${v.engine === "tract" ? ", tract" : ""}`;
    txt.append(nm, meta); pick.append(dot, txt);
    pick.onclick = () => select(v.id);
    const play = document.createElement("button");
    play.className = "icon"; play.textContent = "▶"; play.title = `Say the line as ${v.name}`; play.setAttribute("aria-label", `Say the line as ${v.name}`);
    play.onclick = () => { queueToken++; speak($("line").value || EXAMPLES[0], v).then(() => showVoice(current())); };
    const del = document.createElement("button");
    del.className = "icon del"; del.textContent = "✕"; del.title = `Delete ${v.name}`; del.setAttribute("aria-label", `Delete ${v.name}`);
    del.disabled = state.voices.length <= 1;
    del.onclick = () => removeVoice(v.id);
    li.append(pick, play, del); ul.append(li);
  });
  if (typeof refreshChat === "function" && $("chatView") && !$("chatView").hidden) refreshChat();
}
function buildSeg(id, items, key, hintId){
  const box = $(id).querySelector(".opts");
  items.forEach(([val, label]) => {
    const l = document.createElement("label");
    l.innerHTML = `<input type="radio" name="${key}" value="${val}"><span>${label}</span>`;
    l.querySelector("input").addEventListener("change", () => {
      current()[key] = val; $(hintId).textContent = items.find(i => i[0] === val)[2];
      renderList(); save(); if (stepper.open) rebuildSoon(); else if ($("autoplay").checked) preview();
    });
    box.append(l);
  });
}
function buildControls(){
  const host = $("controls"), groups = {};
  for (const p of PARAMS){
    if (!groups[p.g]){ const fs = document.createElement("fieldset"); const lg = document.createElement("legend"); lg.textContent = p.g; fs.append(lg); host.append(fs); groups[p.g] = fs; }
    const wrap = document.createElement("div"); wrap.className = "ctl";
    const id = "p_" + p.k;
    wrap.innerHTML = `<div class="lab"><label for="${id}">${p.label}</label><output for="${id}" id="o_${p.k}"></output></div><input type="range" id="${id}" min="${p.min}" max="${p.max}" step="${p.step}">${p.hint ? `<small>${p.hint}</small>` : ""}`;
    const input = wrap.querySelector("input");
    input.addEventListener("input", () => {
      const v = current(); v[p.k] = Number(input.value);
      $("o_" + p.k).textContent = p.fmt(v[p.k]);
      if (p.k === "pitch") renderList();
      if (p.k === "speaker" || p.k === "tract") requestAnimationFrame(() => drawChart());
      save();
    });
    input.addEventListener("change", () => { if (stepper.open) rebuildSoon(); else if ($("autoplay").checked) preview(); });
    groups[p.g].append(wrap);
  }
}
function renderEditor(){
  const v = current();
  $("vname").value = v.name; $("vcolor").value = v.color;
  for (const p of PARAMS){ $("p_" + p.k).value = v[p.k]; $("o_" + p.k).textContent = p.fmt(v[p.k]); }
  document.querySelector(`input[name=engine][value=${v.engine}]`).checked = true;
  document.querySelector(`input[name=style][value=${v.style}]`).checked = true;
  $("engineHint").textContent = ENGINES.find(e => e[0] === v.engine)[2];
  $("styleHint").textContent = STYLES.find(e => e[0] === v.style)[2];
  $("del").disabled = state.voices.length <= 1;
}
function preview(){
  queueToken++;
  const t = $("line").value.trim();
  speak(t && t.length < 80 ? t : "Oh, hello there! How are you today?", current());
}
const idle = window.requestIdleCallback || (f => setTimeout(f, 200));
function warm(){ const v = current(); idle(() => { try { calibrate(v); } catch(e){} }); }
function select(id){ state.sel = id; warm(); queueToken++; renderList(); renderEditor(); showVoice(current()); drawChart(); save(); rebuildSoon(); }
function removeVoice(id){
  if (state.voices.length <= 1) return;
  const idx = state.voices.findIndex(v => v.id === id);
  state.voices.splice(idx, 1);
  if (state.sel === id) state.sel = state.voices[Math.max(0, idx - 1)].id;
  renderList(); renderEditor(); showVoice(current()); drawChart(); save();
}
// one message line per view, so it shows whichever mode you are in
const toast = t => { const els = [$("toast"), $("chatToast")]; els.forEach(e => e.textContent = t); clearTimeout(toast.t); toast.t = setTimeout(() => els.forEach(e => e.textContent = ""), 5000); };

$("vname").addEventListener("input", e => { current().name = e.target.value.slice(0, 40) || "Voice"; renderList(); showVoice(current()); save(); });
$("vcolor").addEventListener("input", e => { current().color = e.target.value; renderList(); showVoice(current()); save(); });
$("test").onclick = preview;
$("reroll").onclick = () => reroll(current());
$("del").onclick = () => removeVoice(state.sel);
/* ---- random voices: a believable adult or child, now and then a weird one ---- */
const RANDOM_NAMES = ["Doug", "Brenda", "Gordo", "Marge", "Tyler", "Lorraine", "Rick", "Dale", "Colleen", "Wayne", "Maple Mike", "Big Jim", "Tammy", "Skip", "Noreen", "Cletus", "Fergus", "Bev", "Rocco", "Zamboni Zach", "Sully", "Darlene", "Moose", "Kevin from Kelowna"];
const rnd = (a, b) => a + Math.random() * (b - a);
const pickOf = a => a[Math.floor(Math.random() * a.length)];
const maybe = (p, f, other = 0) => Math.random() < p ? f() : other;
// colours people really wear, for a random person's main garment
const GARMENT_COLOURS = ["#c4242b", "#7a1f2b", "#1f6fb0", "#3d5a8c", "#1f3a5f", "#2f5d3a", "#556b4a", "#e07a2f", "#d9a82e", "#6b4a8a", "#3f8f8c", "#8a5a3b", "#4a4f57", "#9a9aa6", "#c9b99a", "#d98ca0", "#8fb8d8", "#b5452a"];
/* `keep` is who they already are (name, outfit seed and colour); without it you get a whole new person. */
function randomVoice(keep){
  const kind = Math.random();
  let speaker, pitch;
  if (kind < 0.4){ speaker = rnd(0, 0.3); pitch = rnd(85, 150); }
  else if (kind < 0.8){ speaker = rnd(0.85, 1.15); pitch = rnd(170, 260); }
  else { speaker = rnd(1.5, 2); pitch = rnd(270, 400); }
  if (Math.random() < 0.15) speaker = rnd(0, 2); // a voice that doesn't match its pitch
  const taken = new Set([...state.voices.map(v => v.name), ...Object.values(chatTemp).filter(Boolean).map(v => v.name)]);
  const free = RANDOM_NAMES.filter(n => !taken.has(n));
  return clean({...BASE, id: uid(),
    look: keep ? keep.look || keep.name : randomSeed(), // the look falls back to the name when no seed is set
    name: keep ? keep.name : free.length ? pickOf(free) : "Random " + (state.voices.length + 1),
    color: keep ? keep.color : pickOf(GARMENT_COLOURS),
    engine: "tract",
    style: Math.random() < 0.8 ? "babble" : pickOf(["letters", "beeps", "grunts"]),
    speaker, pitch, tract: rnd(0.94, 1.1), tension: rnd(0.4, 0.85), brightness: rnd(0.3, 0.85), breath: rnd(0, 0.4),
    jitter: rnd(0.005, 0.04), creak: rnd(0, 0.6), wobRate: maybe(0.2, () => rnd(1.5, 4)), wobDepth: maybe(0.2, () => rnd(0.3, 1.2)),
    nasality: maybe(0.3, () => rnd(0.1, 0.6)), mutter: maybe(0.25, () => rnd(0.2, 0.7)), consonants: rnd(0.5, 0.95), smooth: rnd(0.2, 0.6),
    cps: Math.round(rnd(24, 40)), decl: rnd(2, 5.5), random: rnd(0.6, 2.2), length: rnd(1, 1.4)});
}
$("new").onclick = () => {
  const nv = {...current(), id: uid(), name: "New voice " + (state.voices.length + 1), look: randomSeed(), color: "#" + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0")};
  state.voices.push(nv); select(nv.id); $("vname").focus(); $("vname").select();
};
$("reset").onclick = () => { if (!confirm("Replace all your voices with the default cast?")) return; state.voices = freshDefaults(); select(state.voices[0].id); };
$("speak").onclick = () => { queueToken++; speak($("line").value || EXAMPLES[0], current()); };
$("skip").onclick = () => finishLine(true);
$("every").onclick = speakEvery;
$("line").addEventListener("input", () => rebuildSoon());
$("line").addEventListener("keydown", e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)){ e.preventDefault(); $("speak").click(); } });
$("win").addEventListener("click", () => finishLine(true));
$("win").addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " "){ e.preventDefault(); line ? finishLine(true) : $("speak").click(); } });
EXAMPLES.forEach(t => {
  const b = document.createElement("button"); b.className = "chip"; b.textContent = t.replace(/\{\/?whisper\}/g, "");
  b.onclick = () => { $("line").value = t; queueToken++; if (stepper.open) buildStepper(false); else speak(t, current()); };
  $("examples").append(b);
});

$("copyvoice").onclick = async () => {
  const {id, ...rest} = current();
  const one = JSON.stringify(rest);
  try { await navigator.clipboard.writeText(one); toast("Copied this voice as one line of JSON."); }
  catch(e){ openDialog(one); $("dlgmsg").textContent = "Copying is blocked here. The text is selected, so press Ctrl+C."; }
};

/* WAV inside a zip (the download allowlist has no .wav) */
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++){ let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = u => { let c = 0xFFFFFFFF; for (let i = 0; i < u.length; i++) c = CRC[(c ^ u[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
function wav(samples){
  const n = samples.length, b = new ArrayBuffer(44 + n * 2), d = new DataView(b);
  const w = (o, s) => { for (let i = 0; i < s.length; i++) d.setUint8(o + i, s.charCodeAt(i)); };
  w(0, "RIFF"); d.setUint32(4, 36 + n * 2, true); w(8, "WAVEfmt "); d.setUint32(16, 16, true); d.setUint16(20, 1, true); d.setUint16(22, 1, true);
  d.setUint32(24, SR, true); d.setUint32(28, SR * 2, true); d.setUint16(32, 2, true); d.setUint16(34, 16, true); w(36, "data"); d.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) d.setInt16(44 + i * 2, CLAMP(samples[i], -1, 1) * 32767, true);
  return new Uint8Array(b);
}
function zipOne(name, data){
  const nm = new TextEncoder().encode(name), crc = crc32(data), size = data.length;
  const loc = new Uint8Array(30 + nm.length), cen = new Uint8Array(46 + nm.length), end = new Uint8Array(22);
  const L = new DataView(loc.buffer), C = new DataView(cen.buffer), E = new DataView(end.buffer);
  L.setUint32(0, 0x04034b50, true); L.setUint16(4, 20, true); L.setUint32(14, crc, true); L.setUint32(18, size, true); L.setUint32(22, size, true); L.setUint16(26, nm.length, true); loc.set(nm, 30);
  C.setUint32(0, 0x02014b50, true); C.setUint16(4, 20, true); C.setUint16(6, 20, true); C.setUint32(16, crc, true); C.setUint32(20, size, true); C.setUint32(24, size, true); C.setUint16(28, nm.length, true); cen.set(nm, 46);
  E.setUint32(0, 0x06054b50, true); E.setUint16(8, 1, true); E.setUint16(10, 1, true); E.setUint32(12, cen.length, true); E.setUint32(16, loc.length + size, true);
  return new Blob([loc, data, cen, end]);
}
let downloads;
/* Save a file: a plain download locally, or inside a zip through the claude.ai runtime. Returns "file" or "zip". */
async function saveFile(name, bytes, mime){
  if (downloads === undefined) downloads = window.claude?.use ? await window.claude.use("downloads") : null;
  if (!downloads){
    const url = URL.createObjectURL(new Blob([bytes], {type: mime}));
    const link = document.createElement("a"); link.href = url; link.download = name; document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return "file";
  }
  await downloads.save({filename: name.replace(/\.[^.]+$/, "") + ".zip", data: zipOne(name, bytes)});
  return "zip";
}
const fileBase = s => s.replace(/\{[^}]*\}/g, "").replace(/[^\w\s-]/g, "").trim().split(/\s+/).slice(0, 6).join("-").toLowerCase();
$("wav").onclick = async () => {
  const v = current(), raw = $("line").value || EXAMPLES[0];
  const s = getSynth(raw, v); if (!s.done) s.next(1e9);
  const base = fileBase(v.name + " " + raw) || "line";
  try {
    const how = await saveFile(base + ".wav", wav(s.samples), "audio/wav");
    toast(how === "zip" ? "Saved. The zip holds a 32 kHz WAV of this line." : "Saved a 32 kHz WAV of this line.");
  } catch(e){ if (e && e.code !== "declined") toast("The file couldn't be saved here."); }
};

/* import / export */
const dlg = $("dlg");
function openDialog(text){ $("json").value = text; $("dlgmsg").textContent = ""; dlg.showModal(); $("json").select(); }
$("share").onclick = () => openDialog(JSON.stringify({voices: state.voices.map(({id, ...rest}) => rest)}, null, 2));
$("close").onclick = () => dlg.close();
$("copy").onclick = async () => {
  $("json").select();
  try { await navigator.clipboard.writeText($("json").value); $("dlgmsg").textContent = "Copied."; }
  catch(e){ $("dlgmsg").textContent = "Copying is blocked here. The text is selected, so press Ctrl+C."; }
};
$("import").onclick = () => {
  let data;
  try { data = JSON.parse($("json").value); }
  catch(e){ $("dlgmsg").textContent = "That isn't valid voice data. Paste the full text from an export, including the braces."; return; }
  const list = Array.isArray(data) ? data : Array.isArray(data.voices) ? data.voices : [data];
  const added = list.filter(x => x && typeof x === "object" && x.pitch !== undefined).map(x => clean({...BASE, ...x, id: uid()}));
  if (!added.length){ $("dlgmsg").textContent = "No voices found. Each voice needs at least a name and a pitch."; return; }
  state.voices.push(...added); select(added[0].id);
  $("dlgmsg").textContent = `Added ${added.length} voice${added.length > 1 ? "s" : ""}.`;
};


/* ===================== step through sounds ===================== */
const stepper = {open:false, synth:null, items:[], diag:[], sel:0, v:null, raw:"", src:null, cols:null, playA:0, playStart:0, rate:1, raf:0, timer:0};
const wave = $("wave"), wx = wave.getContext("2d");
function stepVoice(){
  const v = {...current()};
  if ($("muteCreak").checked) v.creak = 0;
  if ($("muteCons").checked) v.consonants = 0;
  if ($("muteBreath").checked) v.breath = 0;
  return v;
}
function toggleStepper(on){
  stepper.open = on; $("stepper").hidden = !on; $("stepbtn").setAttribute("aria-expanded", on);
  if (on){ finishLine(true); buildStepper(false); $("stepper").focus({preventScroll:true}); $("stepper").scrollIntoView({behavior:"smooth", block:"nearest"}); }
  else stopSegment();
}
function rebuildSoon(){ if (!stepper.open) return; clearTimeout(stepper.timer); stepper.timer = setTimeout(() => buildStepper(true), 350); }
function buildStepper(keep){
  const v = stepVoice(), raw = $("line").value || EXAMPLES[0];
  const s = getSynth(raw, v); if (!s.done) s.next(1e9);
  Object.assign(stepper, {synth: s, v, raw, cols: null});
  stepper.items = itemsOf(s.plan, v);
  stepper.diag = stepper.items.map(it => diagnose(s.samples, it));
  if (!keep || stepper.sel >= stepper.items.length) stepper.sel = 0;
  showVoice(current());
  renderChips(); showItem(false);
}
function diagnose(x, it){
  const a = Math.max(2, Math.round(it.a * SR)), b = Math.min(x.length, Math.round(it.b * SR));
  let sum = 0, hf = 0, pk = 0, jump = 0;
  for (let i = a; i < b; i++){
    const v = x[i], d = v - x[i-1], j = Math.abs(v - 2 * x[i-1] + x[i-2]), av = Math.abs(v);
    sum += v * v; hf += d * d; if (av > pk) pk = av; if (j > jump) jump = j;
  }
  const rms = Math.sqrt(sum / Math.max(1, b - a)), hfr = hf / (sum + 1e-12), flags = [];
  if (pk > 0.69) flags.push("hitting the limiter");
  if (hfr > 0.6 && rms > 0.02) flags.push("hissy");
  if (jump > 0.2 && jump > rms * 6) flags.push("sharp click");
  const notes = [];
  if (it.e && it.e.creak > 0.05) notes.push("creak");
  if (it.e && it.e.whisper) notes.push("whisper");
  return {rms, pk, flags, notes};
}
const letters = it => it.kind === "fx" ? `{${it.name}}` : stepper.synth.plan.chars.slice(it.ca, it.cb).map(c => c.c).join("") || "·";
function renderChips(){
  const box = $("stChips"); box.innerHTML = "";
  stepper.items.forEach((it, i) => {
    const b = document.createElement("button");
    b.className = "sc" + (i === stepper.sel ? " sel" : "") + (stepper.diag[i].flags.length ? " warn" : "");
    b.innerHTML = `<small>${i + 1}</small>`; b.append(document.createTextNode(letters(it)));
    b.title = stepper.diag[i].flags.join(", ") || "Sound " + (i + 1);
    b.onclick = () => selectItem(i, true);
    box.append(b);
  });
}
function selectItem(i, play){
  if (!stepper.items.length) return;
  stepper.sel = (i + stepper.items.length) % stepper.items.length;
  [...$("stChips").children].forEach((c, k) => c.classList.toggle("sel", k === stepper.sel));
  $("stChips").children[stepper.sel]?.scrollIntoView({block:"nearest", inline:"nearest"});
  showItem(play);
}
function describe(it, i){
  const n = stepper.items.length, d = stepper.diag[i];
  let s = `<b>${i + 1} of ${n}: “${escapeHtml(letters(it))}”</b><br>`;
  if (it.kind === "syl"){
    const e = it.e, parts = [];
    if (e.on.length) parts.push(`starts with ${e.on.join("+")}`);
    parts.push(`vowel as in “${VWORD[e.v1]}”` + (e.v2 ? ` gliding to “${VWORD[e.v2]}”` : ""));
    if (e.coda.length) parts.push(`ends on ${e.coda.join("+")}`);
    s += parts.join(", ") + `. ${it.a.toFixed(2)}–${it.b.toFixed(2)} s, about ${Math.round(it.hz)} Hz.`;
  } else if (it.kind === "fx") s += `Sound effect, ${it.a.toFixed(2)}–${it.b.toFixed(2)} s.`;
  else s += `Beep at about ${Math.round(it.hz)} Hz.`;
  if (d.notes.length) s += ` Includes ${d.notes.join(" and ")}.`;
  s += d.flags.length ? ` <span class="flagtxt">Possible problem: ${d.flags.join(", ")}.</span>` : ` <span class="oktxt">The checker found no problems.</span>`;
  return s;
}
const escapeHtml = s => s.replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
function showItem(play){
  const it = stepper.items[stepper.sel];
  if (!it){ $("stInfo").textContent = "This line has no sounds to step through."; drawWave(); return; }
  $("stInfo").innerHTML = describe(it, stepper.sel);
  // highlight the letters in the dialogue box
  const ch = stepper.synth.plan.chars;
  textEl.textContent = "";
  const a = it.ca, b = Math.max(it.cb, it.ca);
  textEl.append(document.createTextNode(ch.slice(0, a).map(c => c.c).join("")));
  const m = document.createElement("mark"); m.textContent = ch.slice(a, b).map(c => c.c).join("") || "♪"; textEl.append(m);
  textEl.append(document.createTextNode(ch.slice(b).map(c => c.c).join("")));
  moreEl.classList.remove("on");
  // vowel map: this sound's path
  const tr = stepper.synth.track, trail = [];
  for (let k = Math.floor(it.a / tr.step); k < Math.min(tr.F1.length, Math.ceil(it.b / tr.step)); k++) if (tr.amp[k] > 0.04) trail.push([tr.F1[k], tr.F2[k]]);
  drawChart(trail);
  drawWave();
  if (play) playSegment(it.a, it.b);
}
function stopSegment(){
  cancelAnimationFrame(stepper.raf);
  if (stepper.src){ try { stepper.src.stop(); } catch(e){} stepper.src = null; }
}
function playSegment(a, b){
  stopSegment();
  const ac = audio(), x = stepper.synth.samples;
  const i0 = Math.max(0, Math.round(a * SR)), i1 = Math.min(x.length, Math.round(b * SR)), n = i1 - i0;
  if (n <= 0) return;
  const data = x.slice(i0, i1), f = Math.min(192, n >> 2);
  for (let i = 0; i < f; i++){ data[i] *= i / f; data[n - 1 - i] *= i / f; }
  const buf = ac.createBuffer(1, n, SR); buf.copyToChannel(data, 0);
  const src = ac.createBufferSource(); src.buffer = buf;
  stepper.rate = $("stSlow").checked ? 0.5 : 1; src.playbackRate.value = stepper.rate;
  src.connect(ac.destination); src.start();
  stepper.src = src; stepper.playA = a; stepper.playB = b; stepper.playStart = ac.currentTime;
  src.onended = () => { if (stepper.src === src){ stepper.src = null; drawWave(); } };
  const tick = () => { if (stepper.src !== src) return; drawWave(); stepper.raf = requestAnimationFrame(tick); };
  stepper.raf = requestAnimationFrame(tick);
}
function drawWave(){
  const s = stepper.synth; if (!s) return;
  if (!colors) readColors();
  const dpr = Math.min(2, window.devicePixelRatio || 1), W = wave.clientWidth, H = wave.clientHeight;
  if (!W) return;
  if (wave.width !== Math.round(W * dpr) || !stepper.cols){
    wave.width = Math.round(W * dpr); wave.height = Math.round(H * dpr);
    const x = s.samples, per = x.length / W, cols = new Float32Array(W * 2);
    for (let c = 0; c < W; c++){ let lo = 0, hi = 0; for (let i = Math.floor(c * per); i < Math.floor((c + 1) * per); i++){ const v = x[i]; if (v < lo) lo = v; if (v > hi) hi = v; } cols[2*c] = lo; cols[2*c+1] = hi; }
    stepper.cols = cols;
  }
  wx.setTransform(dpr, 0, 0, dpr, 0, 0); wx.clearRect(0, 0, W, H);
  const dur = s.samples.length / SR, X = t => t / dur * W, mid = H / 2;
  stepper.items.forEach((it, i) => {
    if (stepper.diag[i].flags.length){ wx.fillStyle = colors.danger; wx.globalAlpha = 0.18; wx.fillRect(X(it.a), 0, X(it.b) - X(it.a), H); }
  });
  const sel = stepper.items[stepper.sel];
  if (sel){ wx.globalAlpha = 0.22; wx.fillStyle = colors.accent; wx.fillRect(X(sel.a), 0, X(sel.b) - X(sel.a), H); }
  wx.globalAlpha = 1; wx.strokeStyle = colors.line; wx.lineWidth = 1;
  for (const it of stepper.items){ wx.beginPath(); wx.moveTo(Math.round(X(it.a)) + 0.5, H - 8); wx.lineTo(Math.round(X(it.a)) + 0.5, H); wx.stroke(); }
  wx.fillStyle = colors.ink; const cols = stepper.cols, sc = mid * 1.3;
  for (let c = 0; c < W; c++) wx.fillRect(c, mid - cols[2*c+1] * sc, 1, Math.max(1, (cols[2*c+1] - cols[2*c]) * sc));
  if (stepper.src){
    const t = stepper.playA + (ctx.currentTime - stepper.playStart) * stepper.rate;
    if (t <= stepper.playB){ wx.fillStyle = colors.gold; wx.fillRect(X(t) - 1, 0, 2, H); }
  }
}
wave.addEventListener("click", e => {
  const r = wave.getBoundingClientRect(), t = (e.clientX - r.left) / r.width * stepper.synth.samples.length / SR;
  let best = 0; stepper.items.forEach((it, i) => { if (it.a <= t) best = i; });
  const inside = stepper.items.findIndex(it => it.a <= t && t < it.b);
  selectItem(inside >= 0 ? inside : best, true);
});
new ResizeObserver(() => { stepper.cols = null; drawWave(); }).observe(wave);
$("stepbtn").onclick = () => toggleStepper(!stepper.open);
$("stClose").onclick = () => toggleStepper(false);
$("stPlay").onclick = () => showItem(true);
$("stPrev").onclick = () => selectItem(stepper.sel - 1, true);
$("stNext").onclick = () => selectItem(stepper.sel + 1, true);
$("stFrom").onclick = () => { const it = stepper.items[stepper.sel]; if (it) playSegment(it.a, stepper.synth.samples.length / SR); };
["muteCreak","muteCons","muteBreath"].forEach(id => $(id).addEventListener("change", () => { buildStepper(true); showItem(true); }));
$("stepper").addEventListener("keydown", e => {
  if (e.target.tagName === "INPUT") return;
  if (e.key === "ArrowRight"){ e.preventDefault(); selectItem(stepper.sel + 1, true); }
  else if (e.key === "ArrowLeft"){ e.preventDefault(); selectItem(stepper.sel - 1, true); }
  else if ((e.key === " " || e.key === "Enter") && e.target === $("stepper")){ e.preventDefault(); showItem(true); }
});
$("stReport").onclick = async () => {
  const it = stepper.items[stepper.sel]; if (!it) return;
  const {id, ...v} = current(), d = stepper.diag[stepper.sel];
  const mutes = [["muteCreak","creak"],["muteCons","consonant hiss"],["muteBreath","breath"]].filter(([i]) => $(i).checked).map(m => m[1]);
  const tmp = document.createElement("div"); tmp.innerHTML = describe(it, stepper.sel);
  const report = `Mumble report\nLine: ${stepper.raw}\nSound ${tmp.textContent}\nLevels: peak ${d.pk.toFixed(2)}, rms ${d.rms.toFixed(3)}\nSwitched off: ${mutes.join(", ") || "nothing"}\nVoice: ${JSON.stringify(v)}`;
  try { await navigator.clipboard.writeText(report); toast("Copied a report of this sound. Paste it into the chat."); }
  catch(e){ openDialog(report); $("dlgmsg").textContent = "Copying is blocked here. The text is selected, so press Ctrl+C."; }
};

/* ===================== two-person chat ===================== */
const CHAT_DEFAULT = `L: Hey Bernie, did ya catch the game last night, eh?
R: Oh geez, I sure did, buddy. Sorry about the score!
L: No worries, friend. Pass me a double-double and a maple donut?
R: Sure thing. Sorry, the donut's a bit stale, eh.
L: That's alright... it's a nice day for it.
R: {laugh} Ain't that the truth!`;
const SCRIPT_KEY = "mumble.script";
const chatSel = {L: $("vsL"), R: $("vsR")};
/* A random one-off voice per person: lives only in memory, never in `state.voices`, so it is never saved. */
const chatTemp = {L: null, R: null};
const chatVoice = side => state.voices.find(v => v.id === chatSel[side].value)
  || (chatTemp[side] && chatTemp[side].id === chatSel[side].value ? chatTemp[side] : null)
  || state.voices[side === "L" ? 0 : Math.min(1, state.voices.length - 1)];
function fillChatOptions(side, keep){
  const sel = chatSel[side];
  sel.innerHTML = "";
  state.voices.forEach(v => { const o = document.createElement("option"); o.value = v.id; o.textContent = v.name; sel.append(o); });
  const t = chatTemp[side];
  if (t && t.id === keep){ const o = document.createElement("option"); o.value = t.id; o.textContent = `🎲 ${t.name} (not saved)`; sel.append(o); }
  else chatTemp[side] = null;
  const pref = state.voices.find(v => v.name === (side === "L" ? "Gordie" : "Bernie"));
  sel.value = state.voices.some(v => v.id === keep) || chatTemp[side] ? keep : (pref || state.voices[side === "L" ? 0 : Math.min(1, state.voices.length - 1)]).id;
}
function refreshChat(){
  for (const side of ["L", "R"]){
    fillChatOptions(side, chatSel[side].value);
    showVoice(chatVoice(side), chatFaces[side]);
  }
}
function parseScript(txt){
  const out = []; let last = "R";
  for (const raw of txt.split("\n")){
    const t = raw.trim(); if (!t) continue;
    const m = /^([LR])\s*:\s*(.*)$/i.exec(t);
    const side = m ? m[1].toUpperCase() : last === "L" ? "R" : "L", text = (m ? m[2] : t).trim();
    if (!text) continue;
    out.push({side, text}); last = side;
  }
  return out;
}
let chatToken = 0;
/* Play lines on the stage. Every line is synthesised first (a few seconds for a minute of speech, instant when cached), laid
   out on a timeline exactly as the export does, then the audio is scheduled and the stage is drawn from the audio clock. */
let playing = null;
async function playLines(lines, people){
  const token = ++chatToken; ++queueToken;
  if (line) finishLine(true);
  stopPlayback();
  const ac = audio();
  $("chatProgText").textContent = "Getting ready…";
  let built;
  try {
    built = await buildTimeline(lines, (text, side) => getSynth(text, people[side]), {hop, check: () => { if (token !== chatToken) throw new DOMException("stopped", "AbortError"); }});
  } catch(e){ if (e && e.name === "AbortError") return; throw e; } finally { if (token === chatToken) $("chatProgText").textContent = ""; }
  if (token !== chatToken) return;
  const t0 = ac.currentTime + 0.1, out = ac.createGain(); out.connect(ac.destination);
  const srcs = built.timed.map(tl => {
    const buf = ac.createBuffer(1, tl.synth.samples.length, SR); buf.copyToChannel(tl.synth.samples, 0);
    const src = ac.createBufferSource(); src.buffer = buf; src.connect(out); src.start(t0 + tl.offset); return src;
  });
  stage.setTimeline(built.timed);
  stage.canvas.setAttribute("aria-label", lines.map(l => l.text).join(" "));
  playing = {t0, origin: performance.now() / 1000, out, srcs};
}
function stopPlayback(){
  const p = playing; if (!p) return;
  playing = null; stage.setTimeline([]);
  const now = ctx.currentTime; p.out.gain.setValueAtTime(p.out.gain.value, now); p.out.gain.linearRampToValueAtTime(0, now + 0.05);
  setTimeout(() => { p.srcs.forEach(x => { try { x.stop(); } catch(e){} }); p.out.disconnect(); }, 120);
}
function playChat(){
  const lines = parseScript($("script").value);
  if (!lines.length){ toast("Write a line for someone to say first."); return; }
  return playLines(lines, {L: chatVoice("L"), R: chatVoice("R")});
}
function stopChat(){ chatToken++; finishLine(true); stopPlayback(); }
/* the stage redraws all the time: the backdrop and blinking are alive even when nobody is talking */
let drawing = false;
(function stageLoop(){
  requestAnimationFrame(stageLoop);
  if ($("chatView").hidden || drawing) return;
  const now = performance.now() / 1000;
  drawing = true;
  stage.render(playing ? playing.origin + Math.max(0, ctx.currentTime - playing.t0) : now, playing ? playing.origin : 0).finally(() => { drawing = false; });
})();
function setMode(m){
  chatToken++; queueToken++; finishLine(true); stopPlayback();
  $("singleView").hidden = m !== "single"; $("chatView").hidden = m !== "chat";
  for (const [id, mm] of [["modeSingle", "single"], ["modeChat", "chat"]]){ $(id).classList.toggle("on", m === mm); $(id).setAttribute("aria-pressed", m === mm); }
  $("studioBox").open = m === "single"; // the voice editor is the point of single mode; in chat it stays tucked away
  if (m === "single") requestAnimationFrame(() => drawChart()); else refreshChat();
}
try { $("script").value = localStorage.getItem(SCRIPT_KEY) || CHAT_DEFAULT; } catch(e){ $("script").value = CHAT_DEFAULT; }
$("script").addEventListener("input", () => { try { localStorage.setItem(SCRIPT_KEY, $("script").value); } catch(e){} });
$("script").addEventListener("keydown", e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)){ e.preventDefault(); playChat(); } });
for (const side of ["L", "R"]) chatSel[side].addEventListener("change", () => {
  if (chatTemp[side] && chatSel[side].value !== chatTemp[side].id){ chatTemp[side] = null; fillChatOptions(side, chatSel[side].value); } // picking a saved voice drops the one-off
  showVoice(chatVoice(side), chatFaces[side]);
});
$("swap").onclick = () => {
  const a = chatSel.L.value, b = chatSel.R.value;
  [chatTemp.L, chatTemp.R] = [chatTemp.R, chatTemp.L];
  fillChatOptions("L", b); fillChatOptions("R", a);
  for (const side of ["L", "R"]) showVoice(chatVoice(side), chatFaces[side]);
};
for (const side of ["L", "R"]) $("reroll" + side).onclick = () => reroll(chatVoice(side));
/* a random voice for one person, then they say one of their own lines so you can hear (and see) it */
for (const side of ["L", "R"]) for (const [id, wholePerson] of [["rand", false], ["person", true]]) $(id + side).onclick = () => {
  const v = randomVoice(wholePerson ? null : chatVoice(side)); chatTemp[side] = v;
  fillChatOptions(side, v.id); showVoice(v, chatFaces[side]);
  chatToken++; queueToken++;
  const mine = parseScript($("script").value).filter(l => l.side === side);
  playLines([{side, text: mine.length ? pickOf(mine).text : "Oh, hello there! How are you today?"}], {L: chatVoice("L"), R: chatVoice("R")});
};
/* click a name tag to rename that person (saved voices are renamed for good; a one-off keeps the new name while it lasts).
   Their look is pinned first, since it falls back to the name when no seed is set. */
for (const side of ["L", "R"]){
  const tag = $("name" + side);
  tag.title = "Click to rename"; tag.tabIndex = 0;
  const edit = () => {
    if (tag.isContentEditable) return;
    const v = chatVoice(side), old = v.name;
    tag.contentEditable = "plaintext-only"; tag.classList.add("editing"); tag.focus();
    getSelection().selectAllChildren(tag);
    const done = ok => {
      tag.removeEventListener("blur", onBlur); tag.removeEventListener("keydown", onKey);
      tag.contentEditable = "false"; tag.classList.remove("editing");
      const name = tag.textContent.replace(/\s+/g, " ").trim().slice(0, 40);
      if (!ok || !name || name === old){ tag.textContent = old; return; }
      v.look = v.look || old; v.name = name;
      if (state.voices.includes(v)){ save(); renderList(); }
      refreshChat();
    };
    const onBlur = () => done(true);
    const onKey = e => { if (e.key === "Enter"){ e.preventDefault(); done(true); } else if (e.key === "Escape"){ e.preventDefault(); done(false); } };
    tag.addEventListener("blur", onBlur); tag.addEventListener("keydown", onKey);
  };
  tag.addEventListener("click", edit);
  tag.addEventListener("keydown", e => { if (e.key === "Enter" && !tag.isContentEditable){ e.preventDefault(); edit(); } });
}
$("chatPlay").onclick = playChat;
$("chatStop").onclick = stopChat;
$("sceneRoll").onclick = () => stage.reroll();

/* export the conversation (animation + speech) as a video file */
let exporting = null;
$("chatExport").onclick = async () => {
  if (exporting){ exporting.abort(); return; }
  const lines = parseScript($("script").value);
  if (!lines.length){ toast("Write a line for someone to say first."); return; }
  stopChat();
  const ctl = exporting = new AbortController(), btn = $("chatExport"), bar = $("exportBar");
  const people = {L: chatVoice("L"), R: chatVoice("R")};
  btn.textContent = "Cancel export"; $("chatPlay").disabled = true; bar.hidden = false;
  const progress = (f, label) => { $("chatProg").value = f; $("chatProgText").textContent = label; };
  progress(0, "Starting");
  try {
    const r = await exportConversation({
      lines, voices: people, signal: ctl.signal, onProgress: progress, backdrop: stage.backdrop, seed: stage.seed,
      synthFor: (text, side) => getSynth(text, people[side])
    });
    const base = fileBase(people.L.name + " and " + people.R.name) || "conversation";
    const how = await saveFile(`${base}.${r.ext}`, r.bytes, r.mime);
    toast(`Exported ${r.seconds.toFixed(1)} s of video with sound${how === "zip" ? " (the download is a zip)" : ""}.`);
  } catch(e){
    if (e && e.name === "AbortError") toast("Export cancelled.");
    else if (e && e.code === "declined") toast("Export cancelled.");
    else { console.error(e); toast(e && e.message ? e.message : "The video couldn't be exported."); }
  } finally {
    exporting = null; bar.hidden = true; btn.textContent = "Export video"; $("chatPlay").disabled = false;
  }
};
$("modeSingle").onclick = () => setMode("single");
$("modeChat").onclick = () => setMode("chat");

/* boot */
loadLocal();
buildSeg("engineSeg", ENGINES, "engine", "engineHint");
buildSeg("styleSeg", STYLES, "style", "styleHint");
buildControls(); renderList(); renderEditor(); showVoice(current());
textEl.textContent = "Type a line below and press Speak.";
moreEl.classList.add("on");
requestAnimationFrame(() => drawChart());
warm();
initCloud();
})();
