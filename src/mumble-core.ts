// @ts-nocheck -- ported from plain JS; class fields and DOM types not yet declared
/* Mumble synthesis core. Pure JS, no dependencies, runs in the browser (classic script)
   and in Node (require). H95 = Hillenbrand et al. (1995) vowel means, regenerate with tools/build-tables.py.
   TRACT_V = vocal-tract tongue/lip shapes fitted to H95 men, regenerate with tools/fit-tract.js. */
const H95={"m":{"iy":[346,2312,3010,343,2317,2947,3658],"ih":[434,2032,2683,466,1841,2662,3628],"ei":[479,2089,2699,400,2229,2742,3649],"eh":[584,1817,2603,561,1745,2645,3699],"ae":[592,1923,2597,632,1720,2598,3642],"ah":[754,1304,2528,706,1461,2537,3684],"aw":[654,1020,2516,658,1265,2492,3520],"oa":[511,936,2455,435,898,2448,3384],"oo":[468,1122,2440,483,1490,2445,3401],"uw":[385,1015,2346,368,1028,2338,3378],"uh":[622,1181,2548,574,1493,2550,3564],"er":[485,1371,1720,442,1484,1752,3335]},"w":{"iy":[446,2755,3381,429,2760,3323,4353],"ih":[482,2378,3050,533,2167,3040,4333],"ei":[534,2514,3053,447,2693,3076,4308],"eh":[728,2089,2956,672,2038,2994,4312],"ae":[677,2335,2960,808,1924,2903,4315],"ah":[930,1521,2832,853,1735,2865,4291],"aw":[804,1180,2825,812,1576,2828,3946],"oa":[603,1078,2819,472,996,2809,3928],"oo":[517,1225,2826,567,1753,2820,4061],"uw":[465,1139,2737,447,1116,2755,4116],"uh":[762,1402,2893,663,1831,2926,4133],"er":[536,1586,1950,495,1690,2009,3914]},"c":{"iy":[451,3068,3700,453,3060,3630,4572],"ih":[509,2553,3391,562,2413,3396,4569],"ei":[566,2651,3322,486,2822,3362,4420],"eh":[731,2282,3301,698,2283,3343,4651],"ae":[717,2491,3290,859,2109,3097,4429],"ah":[996,1683,2953,908,1887,2987,4279],"aw":[838,1293,2942,836,1703,2954,4017],"oa":[629,1174,3002,522,1111,3028,4187],"oo":[569,1501,3080,598,1954,3097,4305],"uw":[495,1433,3001,486,1389,2983,4268],"uh":[741,1542,3126,673,1961,3157,4301],"er":[589,1712,2180,543,1814,2182,3794]}};
const TRACT_V={"iy":[27.17,2.35,1.37],"ih":[29.33,2.9,1.02],"ei":[25.5,2.65,1.55],"eh":[27,3.5,1.15],"ae":[24.33,2.97,1.53],"ah":[13.5,2.65,1.25],"aw":[11,2.15,1.15],"oa":[9.83,1.98,0.88],"oo":[18.5,2.8,0.6],"uw":[22,2.7,0.5],"uh":[18.33,2.77,0.87],"er":[24.33,2.73,0.82]};
/* ===================== Mumble synthesis core =====================
   Everything here is pure JS so a line renders to a buffer in one pass.
   Text -> plan (letter timeline + syllable events) -> 2 ms control frames
   -> per-sample synthesis (LF glottal pulse -> Klatt cascade OR waveguide tract). */
const SR = 32000, CF = 64, FRAME = CF / SR;
const VKEYS = ["iy","ih","ei","eh","ae","ah","aw","oa","oo","uw","uh","er"];
const VWORD = {iy:"heed",ih:"hid",ei:"hayed",eh:"head",ae:"had",ah:"hod",aw:"hawed",oa:"hoed",oo:"hood",uw:"who'd",uh:"hud",er:"heard"};
const CLAMP = (v, a, b) => v < a ? a : v > b ? b : v;
const LERP = (a, b, t) => a + (b - a) * t;
const SMOOTH = t => t * t * (3 - 2 * t);

/* ---------- seeded randomness: the same line always sounds the same ---------- */
function hashStr(str){
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++){ h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = h << 13 | h >>> 19; }
  return h >>> 0;
}
function mulberry(a){
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

/* ---------- speaker tables (Hillenbrand et al. 1995 means) ---------- */
// row: F1,F2,F3 at 20% | F1,F2,F3 at 80% | F4
function speakerTable(s, size){
  const [A, B, t] = s <= 1 ? [H95.m, H95.w, s] : [H95.w, H95.c, s - 1];
  const tab = {}; let ratio = 0;
  for (const k of VKEYS){
    const r = A[k].map((v, i) => LERP(v, B[k][i], t) * size);
    const f4 = r[6], f5 = f4 * 1.22;
    // Hillenbrand's 80% point is pulled by the following /d/, so only keep a share of it,
    // except for the genuinely gliding vowels (hayed, hoed).
    const share = (k === "ei" || k === "oa") ? 1 : 0.35;
    tab[k] = {a:[r[0], r[1], r[2], f4, f5], b:[LERP(r[0], r[3], share), LERP(r[1], r[4], share), LERP(r[2], r[5], share), f4, f5]};
    ratio += r[1] / H95.m[k][1];
  }
  const sc = ratio / VKEYS.length;           // overall formant scale vs adult male
  const neutral = [0,1,2,3,4].map(i => VKEYS.reduce((a, k) => a + tab[k].a[i], 0) / VKEYS.length);
  return {tab, sc, neutral};
}

/* ---------- consonants: a place of articulation pulls the formants (loci) ---------- */
const CONS = {
  b:["lab","stop",1], p:["lab","stop",0], m:["lab","nas",1], f:["lab","fric",0], v:["lab","fric",1], w:["lab","glide",1],
  th:["den","fric",0], d:["alv","stop",1], t:["alv","stop",0], n:["alv","nas",1], s:["alv","fric",0], z:["alv","fric",1],
  l:["lat","glide",1], r:["rho","glide",1], sh:["post","fric",0], ch:["post","affr",0], j:["post","affr",1],
  g:["vel","stop",1], k:["vel","stop",0], ng:["vel","nas",1], y:["pal","glide",1], h:["glot","asp",0]
};
// F: male locus F1-F3 | c: constriction index on a 44-cell tract | fr: frication centre, bandwidth, level | gd: glide opening
const PLACE = {
  lab: {F:[260,850,2200], c:null, fr:[6500,5000,0.22], gd:0.5},
  den: {F:[300,1450,2550], c:38.5, fr:[6500,5000,0.22], gd:0.6},
  alv: {F:[300,1700,2600], c:36.5, fr:[5200,2400,1], gd:0.6},
  lat: {F:[340,1050,2700], c:36.5, fr:null, gd:0.75},
  rho: {F:[360,1150,1650], c:33.5, fr:null, gd:0.9},
  post:{F:[290,2000,2450], c:33, fr:[2900,1700,1.7], gd:0.6},
  pal: {F:[270,2250,2950], c:29.5, fr:[3500,2000,0.5], gd:0.6},
  vel: {F:null, c:25, fr:[2100,1500,0.5], gd:0.6},
  glot:{F:null, c:null, fr:null, gd:1}
};
const BW = [60, 90, 150, 200, 250];
let FRIC_F = 0.035, FRIC_T = 0.045, WHISPER = 0.5; // Klatt (1980) default bandwidths

/* ===================== text -> plan ===================== */
const END = new Set([",",";",":",".","!","?","…","\n"]);
const VCH = "aeiouàáâäãåèéêëìíîïòóôöõùúûü";
const isLetter = c => /\p{L}/u.test(c);
const FUNC = {the:"uh", a:"uh", of:"uh", to:"uw", "i":"AY", an:"ae", and:"ae", you:"uw", your:"aw", was:"uh", were:"er", from:"uh", for:"aw", are:"ah", is:"ih", it:"ih", in:"ih", at:"ae"};
const DIPH = {AY:["ah","ih"], AW:["ah","oo"], OY:["aw","iy"]};

function tokensOf(cons){ // consonant letters -> phoneme-ish tokens
  const out = [];
  for (let i = 0; i < cons.length; i++){
    const two = cons.slice(i, i + 2);
    if (["sh","ch","th","ng","ck","ph","wh","qu","gh"].includes(two)){
      if (two === "ck") out.push("k"); else if (two === "ph") out.push("f"); else if (two === "wh") out.push("w");
      else if (two === "qu"){ out.push("k"); out.push("w"); } else if (two === "gh"){ /* mostly silent */ } else out.push(two);
      i++; continue;
    }
    const c = cons[i];
    if (c === "c") out.push(/[eiy]/.test(cons[i+1] || "") ? "s" : "k");
    else if (c === "x"){ out.push("k"); out.push("s"); }
    else if (c === "q") out.push("k");
    else if (CONS[c]) out.push(c);
  }
  return out;
}

// Spell a word into syllables: [{at: charIndex, v1, v2, on:[tokens], coda:[tokens]}]
function syllabify(word, offset){
  const w = word.toLowerCase(), n = w.length;
  const isV = i => { const c = w[i]; if (VCH.includes(c)) return true;
    if (c === "y") return i > 0 && !(i + 1 < n && VCH.includes(w[i+1])); return false; };
  const groups = [];
  for (let i = 0; i < n;){
    if (isV(i) && !(w[i] === "u" && w[i-1] === "q")){ let j = i; while (j < n && isV(j)) j++; groups.push([i, j]); i = j; }
    else i++;
  }
  if (!groups.length) return [];
  // silent final e ("time", "name") but not "the", "be"
  let magicE = false;
  const last = groups[groups.length - 1];
  if (groups.length > 1 && last[1] === n && last[1] - last[0] === 1 && w[n-1] === "e" && n > 3 && !isV(n-2) && !(w.endsWith("le") && !VCH.includes(w[n-3]))){
    groups.pop(); magicE = true;
  }
  const syl = [];
  for (let g = 0; g < groups.length; g++){
    const [s, e] = groups[g];
    const prevEnd = g ? groups[g-1][1] : 0, nextStart = g + 1 < groups.length ? groups[g+1][0] : n;
    const before = w.slice(prevEnd, s), after = w.slice(e, nextStart);
    let onsetLetters, codaLetters;
    if (g === 0) onsetLetters = before;
    else { const k = before.length <= 1 ? 0 : 1; onsetLetters = before.slice(k); }
    if (g + 1 < groups.length) codaLetters = after.length <= 1 ? "" : after.slice(0, 1);
    else codaLetters = magicE ? after.replace(/e$/, "") : after;
    const grp = w.slice(s, e);
    const open = g + 1 < groups.length ? after.length <= 1 : (after.length === 0 || (magicE && after.replace(/e$/,"").length === 1));
    let [v1, v2] = vowelFor(grp, open, after, w, s);
    if (g === 0 && grp === "a" && s === 0 && open && groups.length > 1) [v1, v2] = ["uh", null];
    if (grp === "o" && magicE && g === groups.length - 1 && /^[mnv]$/.test(after.replace(/e$/, ""))) [v1, v2] = ["uh", null];
    if (g > 0 && g === groups.length - 1 && /^(e|o|a)$/.test(grp) && /^(r|n|l|m|s)$/.test(codaLetters) && groups.length > 1 && !magicE && v1 !== "er") [v1, v2] = ["uh", null];
    const spanB = e + codaLetters.length + (magicE && g === groups.length - 1 ? 1 : 0);
    syl.push({at: offset + s, spanA: offset + s - onsetLetters.length, spanB: offset + Math.min(n, spanB), v1, v2, on: tokensOf(onsetLetters), coda: tokensOf(codaLetters), rcol: /^r/.test(after) && !VCH.includes(after[1] || "")});
  }
  // function words get reduced vowels
  const f = FUNC[w];
  if (f && syl.length === 1){ if (DIPH[f]) [syl[0].v1, syl[0].v2] = DIPH[f]; else { syl[0].v1 = f; syl[0].v2 = null; } syl[0].reduced = f === "uh"; }
  return syl;
}
function vowelFor(g, open, after, word, pos){
  const r = /^r/.test(after) && !VCH.includes(after[1] || "");
  if (g.length === 1 || (g === "y")){
    const c = g.normalize("NFD")[0];
    if (r){ if (c === "a") return ["ah", null]; if (c === "o") return ["aw", null]; return ["er", null]; }
    if (c === "a" && /^l[^aeiou]?/.test(after) && after.length >= 2 && after[0] === "l") return ["aw", null];
    if (c === "a" && word[pos-1] === "w") return ["ah", null];
    if (c === "i" && after.startsWith("gh")) return DIPH.AY;
    if (c === "y") return pos === word.length - 1 && word.length > 2 ? ["iy", null] : DIPH.AY;
    if (open){ return {a:["ei",null], e:["iy",null], i:DIPH.AY, o:["oa",null], u:["uw",null]}[c] || ["uh", null]; }
    return {a:["ae",null], e:["eh",null], i:["ih",null], o:["ah",null], u:["uh",null]}[c] || ["uh", null];
  }
  if (/^(ee|ea|ie|ei|ey)$/.test(g)) return g === "ie" && pos + 2 === word.length ? DIPH.AY : g === "ey" && pos > 1 && word[pos-1] === "h" ? ["ei",null] : ["iy", null];
  if (/^(ai|ay|ey|eigh)/.test(g)) return ["ei", null];
  if (/^(oa|oe)$/.test(g)) return ["oa", null];
  if (/^(oi|oy)$/.test(g)) return DIPH.OY;
  if (/^(au|aw)$/.test(g)) return ["aw", null];
  if (g === "ow") return /^n?$/.test(after) && word.length > 3 ? ["oa", null] : DIPH.AW;
  if (g === "ou") return after.startsWith("ld") || after === "" ? ["uw", null] : after.startsWith("gh") ? ["aw", null] : r ? ["aw", null] : DIPH.AW;
  if (g === "oo") return /^[kd]/.test(after) ? ["oo", null] : ["uw", null];
  if (/^(ue|ew|ui|eu)$/.test(g)) return ["uw", null];
  if (/^(ie|ye)$/.test(g)) return DIPH.AY;
  if (g.startsWith("io") || g.startsWith("ia")) return ["uh", null];
  return vowelFor(g[0], open, after, word, pos);
}

function parseLine(raw){
  // {fx} markers and {whisper}...{/whisper}
  let text = "", last = 0, m, whisper = false;
  const fx = [], wmask = [];
  const re = /\{(\/?\w+)\}/g;
  const push = s => { for (const ch of s){ text += ch; wmask.push(whisper); } };
  while ((m = re.exec(raw))){
    push(raw.slice(last, m.index));
    const name = m[1].toLowerCase();
    if (name === "whisper") whisper = true;
    else if (name === "/whisper") whisper = false;
    else if (FX_DUR[name]) fx.push({name, at: [...text].length});
    last = re.lastIndex;
  }
  push(raw.slice(last));
  return {text, fx, wmask};
}
const FX_DUR = {purr:0.85, snort:0.32, sigh:0.9, hmm:0.5, laugh:0.5};

function plan(raw, v){
  const {text, fx, wmask} = parseLine(raw);
  const ch = [...text], n = ch.length;
  const rand = mulberry(hashStr(raw + "|" + v.name + "|" + v.style));
  const base = 1 / v.cps, sp = CLAMP(30 / v.cps, 0.6, 1.6);

  // letter timeline: punctuation is a breath; effects pause the typing
  const delay = ch.map((c, i) => {
    let d = base;
    if (c === "," || c === ";" || c === ":") d = base * 3;
    else if (c === ".") d = (ch[i+1] === "." || ch[i-1] === ".") ? base * 3.5 : base * 6;
    else if (c === "!" || c === "?" || c === "…" || c === "\n") d = base * 6;
    if (END.has(c) && i + 1 < n && "!?.".includes(ch[i+1]) && c !== ".") d = base;
    return d;
  });
  const time = new Array(n + 1), fxAt = {};
  for (const f of fx) (fxAt[f.at] ||= []).push(f.name);
  let acc = 0.05; const fxEvents = [];
  for (let i = 0; i <= n; i++){
    for (const name of (fxAt[i] || [])){ fxEvents.push({name, t: acc, at: i}); acc += FX_DUR[name] * 0.92; }
    time[i] = acc;
    if (i < n) acc += delay[i];
  }

  // words
  const words = [], wordOf = new Array(n).fill(-1);
  for (let i = 0; i < n;){
    if (isLetter(ch[i])){
      let j = i; while (j < n && (isLetter(ch[j]) || (ch[j] === "'" && j + 1 < n && isLetter(ch[j+1])))) j++;
      const raw = ch.slice(i, j).join(""), letters = raw.replace(/'/g, "");
      words.push({start:i, end:j, text:raw, caps: letters.length >= 2 && letters === letters.toUpperCase() && letters !== letters.toLowerCase()});
      for (let k = i; k < j; k++) wordOf[k] = words.length - 1;
      i = j;
    } else i++;
  }
  // phrases split by punctuation; the punctuation sets the tune
  const phrases = []; let start = 0;
  for (let i = 0; i < n; i++){
    if (!END.has(ch[i])) continue;
    let j = i; while (j < n && (END.has(ch[j]) || ch[j] === " ")) j++;
    const p = ch.slice(i, j).join("");
    const type = p.includes("?") ? "q" : p.includes("!") ? "ex" : (p.includes("...") || p.includes("…")) ? "ell" : /[.\n]/.test(p) ? "stop" : "comma";
    phrases.push({start, end:j, type}); start = j; i = j - 1;
  }
  if (start < n) phrases.push({start, end:n, type:"stop"});
  const phraseOf = new Array(n).fill(0);
  phrases.forEach((p, k) => { for (let i = p.start; i < p.end; i++) phraseOf[i] = k; });

  // build raw syllables by style
  let syl = [];
  const style = v.style || "babble";
  if (style === "babble"){
    words.forEach((w, wi) => {
      // map syllable char positions back from the apostrophe-free word
      const map = []; for (let k = w.start; k < w.end; k++) if (ch[k] !== "'") map.push(k);
      for (const s of syllabify(w.text.replace(/'/g, ""), 0)){ s.at = map[s.at]; s.a = map[s.spanA]; s.b = map[s.spanB - 1] + 1; s.w = wi; syl.push(s); }
    });
  } else if (style === "letters"){
    const LV = {a:"ah", e:"eh", i:"iy", o:"oa", u:"uw", y:"iy"};
    for (let i = 0; i < n; i++){
      const c = ch[i].toLowerCase();
      if (!isLetter(ch[i])) continue;
      if (LV[c]) syl.push({at:i, a:i, b:i + 1, v1:LV[c], v2:null, on:[], coda:[], w:wordOf[i], short:true});
      else syl.push({at:i, a:i, b:i + 1, v1: rand() < 0.5 ? "uh" : "ih", v2:null, on: tokensOf(c), coda:[], w:wordOf[i], short:true, reduced:true});
    }
  } else if (style === "grunts"){
    const r2 = mulberry(hashStr(v.name + "grunt"));
    const set = [0,1,2].map(() => ({v1: VKEYS[Math.floor(r2() * 11)], v2: r2() < 0.4 ? VKEYS[Math.floor(r2() * 11)] : null, on: [["h"],["m"],[],["w"],["n"]][Math.floor(r2() * 5)], lift: (r2() * 2 - 1) * 3}));
    words.forEach((w, wi) => {
      if (wi % 2 && w.end - w.start < 5) return;
      const g = set[Math.floor(rand() * set.length)];
      syl.push({at:w.start, a:w.start, b:w.end, v1:g.v1, v2:g.v2, on:g.on, coda:[], w:wi, grunt:g.lift});
    });
  }

  // intonation + timing per syllable
  const events = [];
  syl.sort((a, b) => a.at - b.at);
  const byPhrase = new Map();
  syl.forEach(s => { const p = phraseOf[s.at]; if (!byPhrase.has(p)) byPhrase.set(p, []); byPhrase.get(p).push(s); });
  for (const [pi, list] of byPhrase){
    const ph = phrases[pi], m = list.length, lastW = list[m-1].w;
    const lastWordSyl = list.filter(s => s.w === lastW);
    list.forEach((s, k) => {
      const pos = m > 1 ? k / (m - 1) : 0, final = k === m - 1;
      let semis = v.decl * (0.5 - pos), glide = -0.4, gain = 1, durMul = 1, creak = 0, tense = 0;
      if (ph.type === "ex"){ semis += 3 * (1 - pos) + 1; gain *= 1.15; tense += 0.08; }
      if (ph.type === "q" && s.w === lastW){
        const idx = lastWordSyl.indexOf(s), cnt = lastWordSyl.length;
        semis += v.decl * pos * 0.6 + 1.5 + 3 * (idx + 1) / cnt;
        if (final){ glide = 3; durMul = 1.35; }
      }
      if (ph.type === "ell"){ gain *= 1 - 0.6 * pos; semis -= 1.5 * pos; if (final){ glide = -2.5; durMul = 1.45; creak = v.creak; } }
      if ((ph.type === "stop" || ph.type === "comma") && final){ glide = ph.type === "stop" ? -1.8 : -0.6; durMul = 1.15; if (ph.type === "stop") creak = v.creak; }
      if (s.w >= 0 && words[s.w] && words[s.w].caps){ semis += 4; gain *= 1.5; tense += 0.12; }
      if (s.reduced){ gain *= 0.8; durMul *= 0.75; }
      if (s.grunt !== undefined){ semis += s.grunt; glide = (rand() * 2 - 1) * 4; durMul *= 1.6; }
      semis += (rand() * 2 - 1) * v.random * (style === "letters" ? 1.3 : 1);
      events.push({...s, t0: time[s.at], semis, glide, gain, durMul, creak, tense, whisper: !!wmask[s.at]});
    });
  }
  events.sort((a, b) => a.t0 - b.t0);
  // each sound runs a little longer than the gap to the next, so they blur into babble
  events.forEach((e, k) => {
    const next = events[k + 1];
    const gap = next ? next.t0 - e.t0 : Infinity;
    let dur = Math.min(e.short ? 0.11 : 0.22, gap * 1.2);
    e.dur = CLAMP(dur * v.length * e.durMul, 0.05, 0.5);
  });

  // beeps style: one blip per letter
  const beeps = [];
  if (style === "beeps"){
    for (let i = 0; i < n; i++) if (isLetter(ch[i]) || /\d/.test(ch[i])){
      const ph = phrases[phraseOf[i]], pos = (i - ph.start) / Math.max(1, ph.end - ph.start);
      let semis = v.decl * 0.5 * (0.5 - pos) + (rand() * 2 - 1) * v.random * 0.4;
      if (ph.type === "q" && pos > 0.7) semis += 3;
      if (wordOf[i] >= 0 && words[wordOf[i]].caps) semis += 4;
      beeps.push({t: time[i], semis, i});
    }
  }

  const chars = ch.map((c, i) => ({c, t: time[i], w: wmask[i]}));
  const end = Math.max(time[n], ...events.map(e => e.t0 + e.dur + 0.15), ...fxEvents.map(f => f.t + FX_DUR[f.name]));
  return {text, chars, events, beeps, fx: fxEvents, dur: end + 0.25, sp};
}

// Every separate sound in a line, for stepping through them one at a time
function itemsOf(P, v){
  const sp = P.sp, out = [];
  for (const e of P.events){
    const lead = e.on.length ? (e.on.length > 1 && e.on[0] === "s" ? 0.17 : 0.07) * sp : 0.015;
    const tail = e.coda.length ? 0.11 * sp : 0.03;
    const sem = e.semis;
    out.push({kind:"syl", a: Math.max(0, e.t0 - lead), b: e.t0 + e.dur + tail, ca: e.a ?? e.at, cb: e.b ?? e.at + 1, e,
      hz: v.pitch * Math.pow(2, sem / 12)});
  }
  for (const f of P.fx) out.push({kind:"fx", a: f.t, b: f.t + FX_DUR[f.name], ca: f.at, cb: f.at, name: f.name});
  for (const b of P.beeps) out.push({kind:"beep", a: b.t, b: b.t + 0.05, ca: b.i, cb: b.i + 1, hz: v.pitch * 2 * Math.pow(2, b.semis / 12)});
  return out.sort((x, y) => x.a - y.a);
}

/* ===================== plan -> control frames ===================== */
function makeFrames(P, v, spk){
  const NF = Math.ceil(P.dur / FRAME) + 2;
  const F32 = () => new Float32Array(NF), NAN = () => new Float32Array(NF).fill(NaN);
  const fr = {NF, av:F32(), ah:F32(), af:F32(), fc:NAN(), fb:NAN(), f0:NAN(), nas:F32(), creak:F32(), tense:F32(),
    F1:NAN(), F2:NAN(), F3:NAN(), F4:NAN(), F5:NAN(), ti:NAN(), td:NAN(), lip:NAN(), ci:NAN(), cd:F32().fill(9), lipC:F32().fill(9), pitch:NAN()};
  const fi = t => Math.max(0, Math.min(NF - 1, Math.round(t / FRAME)));
  const span = (t0, t1, fn) => { const a = fi(t0), b = fi(t1); for (let k = a; k <= b; k++) fn(k, b > a ? (k - a) / (b - a) : 1); };
  const maxSet = (arr, k, val) => { if (val > arr[k]) arr[k] = val; };
  const {tab, sc, neutral} = spk;
  const mut = v.mutter * 0.7, cons = v.consonants;
  const vowelF = (key, which) => tab[key][which].map((f, i) => LERP(f, neutral[i], mut));
  const tractV = key => { const t = TRACT_V[key]; return [LERP(t[0], 20, mut), LERP(t[1], 2.6, mut), t[2] * (1 - 0.55 * v.mutter)]; };
  const locus = (tok, vF) => {
    const pl = PLACE[CONS[tok][0]];
    if (!pl.F){ // velar: "pinch" F2/F3 together, glottal: take the vowel's shape
      if (CONS[tok][0] === "glot") return vF.slice();
      const f2 = 0.6 * vF[1] + 0.4 * 1900 * sc;
      return [300 * sc, f2, f2 + 250 * sc, vF[3], vF[4]];
    }
    return [pl.F[0] * sc, pl.F[1] * sc, pl.F[2] * sc, vF[3], vF[4]].map((f, i) => i < 3 ? LERP(f, vF[i], mut) : f);
  };
  const setForm = (k, Fv) => { fr.F1[k] = Fv[0]; fr.F2[k] = Fv[1]; fr.F3[k] = Fv[2]; fr.F4[k] = Fv[3]; fr.F5[k] = Fv[4]; };
  const setTract = (k, T) => { fr.ti[k] = T[0]; fr.td[k] = T[1]; fr.lip[k] = T[2]; };
  const setCons = (k, tok, mode) => {
    const [place, manner] = CONS[tok], pl = PLACE[place];
    let dia = mode === "close" ? 0 : mode === "fric" ? 0.32 : pl.gd;
    if (place === "lab") fr.lipC[k] = Math.min(fr.lipC[k], dia);
    else if (pl.c !== null){ fr.ci[k] = pl.c; fr.cd[k] = Math.min(fr.cd[k], dia); }
  };
  const fric = (k, tok, lvl) => {
    const pl = PLACE[CONS[tok][0]]; if (!pl.fr) return;
    maxSet(fr.af, k, pl.fr[2] * lvl * cons); fr.fc[k] = pl.fr[0] * Math.sqrt(sc); fr.fb[k] = pl.fr[1];
  };
  const pitchAt = (e, x) => e.semis + e.glide * x;

  for (const e of P.events){
    const vs = vowelF(e.v1, "a");
    const ve = e.v2 ? vowelF(e.v2, "a").map((f, i) => LERP(vs[i], f, 0.8)) : vowelF(e.v1, "b");
    const ts = tractV(e.v1), te = e.v2 ? tractV(e.v2).map((x, i) => LERP(ts[i], x, 0.8)) : (e.v1 === "ei" ? tractV("ei").map((x, i) => LERP(x, tractV("iy")[i], 0.4)) : e.v1 === "oa" ? tractV("oa").map((x, i) => LERP(x, tractV("uw")[i], 0.35)) : ts);
    const sp = P.sp, amp = e.gain;
    let vStart = e.t0, attack = Math.max(0.02, 0.3 * e.dur);
    const end = e.t0 + e.dur;

    // onset consonant (the one touching the vowel), with an "s" lead-in for clusters like st-, sp-
    const on = e.on.length ? e.on[e.on.length - 1] : null;
    if (on && cons >= 0){
      const [place, manner, vc] = CONS[on];
      const L = locus(on, vs);
      if (manner === "stop" || manner === "affr"){
        const clos = 0.045 * sp, asp = vc ? 0 : 0.028 * sp;
        span(e.t0 - clos, e.t0, k => { setForm(k, L); setTract(k, ts); setCons(k, on, "close"); maxSet(fr.av, k, vc ? 0.08 * amp : 0); });
        if (manner === "affr") span(e.t0, e.t0 + 0.05 * sp, k => { setCons(k, on, "fric"); fric(k, on, amp); });
        else span(e.t0, e.t0 + 0.012, (k, x) => fric(k, on, amp * 0.7 * (1 - x)));
        if (!vc) span(e.t0, e.t0 + asp, (k, x) => maxSet(fr.ah, k, 0.3 * amp * cons * (1 - 0.6 * x)));
        vStart = e.t0 + asp + (manner === "affr" ? 0.04 * sp : 0); attack = 0.014;
      } else if (manner === "fric"){
        const fd = 0.07 * sp;
        span(e.t0 - fd, e.t0, (k, x) => { setForm(k, L); setTract(k, ts); setCons(k, on, "fric"); fric(k, on, amp * Math.min(1, x * 4)); if (vc) maxSet(fr.av, k, 0.35 * amp); });
        attack = 0.025;
      } else if (manner === "nas"){
        span(e.t0 - 0.055 * sp, e.t0, (k, x) => { setForm(k, L); setTract(k, ts); setCons(k, on, "close"); fr.nas[k] = 1; maxSet(fr.av, k, 0.45 * amp * Math.min(1, x * 3)); });
        attack = 0.02;
      } else if (manner === "glide"){
        const gd = 0.045 * sp;
        span(e.t0 - gd, e.t0, (k, x) => { setForm(k, L); setTract(k, ts); setCons(k, on, "glide"); maxSet(fr.av, k, 0.55 * amp * Math.min(1, x * 3)); });
        attack = 0.025;
        // clusters like tr, pl, gr: a closure and a soft release before the glide
        const st = e.on.length > 1 ? e.on[e.on.length - 2] : null;
        if (st && CONS[st][1] === "stop"){
          const g0 = e.t0 - gd, sL = locus(st, vs);
          span(g0 - 0.04 * sp, g0, k => { setForm(k, sL); setTract(k, ts); setCons(k, st, "close"); fr.av[k] = CONS[st][2] ? 0.08 * amp : 0; });
          span(g0, g0 + 0.012, (k, x) => fric(k, st, amp * 0.6 * (1 - x)));
          if (!CONS[st][2]) span(g0, g0 + 0.02 * sp, (k, x) => maxSet(fr.ah, k, 0.35 * amp * cons * (1 - x)));
        }
      } else if (manner === "asp"){
        // /h/ is a soft breath that swells into the vowel, well below the vowel's level
        const hd = 0.065 * sp;
        span(e.t0 - hd, e.t0 + 0.025, (k, x) => { if (k * FRAME < e.t0){ setForm(k, vs); setTract(k, ts); } maxSet(fr.ah, k, 0.2 * amp * SMOOTH(Math.min(1, x * 1.4)) * (x > 0.75 ? (1 - x) * 4 : 1)); });
        attack = 0.035;
      }
      if (e.on.length > 1 && e.on[0] === "s") span(e.t0 - 0.16 * sp, e.t0 - 0.06 * sp, (k, x) => { setCons(k, "s", "fric"); fric(k, "s", amp * Math.min(1, x * 4)); setForm(k, locus("s", vs)); setTract(k, ts); });
    }

    // the vowel itself: swell, hold, let go — with its formants gliding the whole way
    const coda = e.coda.length ? e.coda[0] : null;
    const codaDur = coda ? Math.min(0.35 * (end - vStart), 0.06 * sp) : 0;
    const codaStart = end - codaDur;
    span(vStart, end, (k, x) => {
      const t = k * FRAME, y = SMOOTH(CLAMP((t - vStart) / Math.max(0.01, codaStart - vStart), 0, 1));
      setForm(k, vs.map((f, i) => LERP(f, ve[i], y)));
      setTract(k, ts.map((q, i) => LERP(q, te[i], y)));
      if (e.rcol) fr.F3[k] = LERP(fr.F3[k], 1700 * sc, y * 0.8);
      const rel = t > end - 0.4 * e.dur ? CLAMP((end - t) / (0.4 * e.dur), 0, 1) : 1;
      const env = Math.min(1, (t - vStart) / attack) * (coda ? 1 : rel);
      if (e.whisper) maxSet(fr.ah, k, WHISPER * amp * env); else maxSet(fr.av, k, amp * env);
      fr.pitch[k] = pitchAt(e, CLAMP((t - e.t0) / e.dur, 0, 1));
      if (e.creak) fr.creak[k] = Math.max(fr.creak[k], e.creak * CLAMP((x - 0.35) / 0.4, 0, 1));
      fr.tense[k] = e.tense;
    });
    if (on) span(e.t0 - 0.16 * sp, vStart, k => { if (isNaN(fr.pitch[k])) fr.pitch[k] = e.semis; });

    // coda: glide toward the consonant and close
    if (coda){
      const [place, manner, vc] = CONS[coda], L = locus(coda, ve);
      span(codaStart, end, (k, x) => {
        const t = k * FRAME;
        setForm(k, [fr.F1[k], fr.F2[k], fr.F3[k], fr.F4[k], fr.F5[k]].map((f, i) => LERP(f, L[i], x)));
        if (manner === "nas"){ fr.nas[k] = x; if (x > 0.5) setCons(k, coda, "close"); }
        else if (manner === "stop" || manner === "affr"){ if (x > 0.7) setCons(k, coda, "close"); if (!e.whisper) fr.av[k] *= vc ? 1 - 0.6 * x : 1 - x; }
        else if (manner === "fric"){ setCons(k, coda, "fric"); fric(k, coda, amp * x); if (!vc) fr.av[k] *= 1 - 0.8 * x; }
        else if (manner === "glide") setCons(k, coda, "glide");
      });
      const tail = manner === "nas" ? 0.06 : manner === "fric" ? 0.07 : 0;
      if (tail) span(end, end + tail * sp, (k, x) => {
        setForm(k, L);
        if (manner === "nas"){ fr.nas[k] = 1; setCons(k, coda, "close"); maxSet(fr.av, k, 0.4 * amp * (1 - x)); }
        else { setCons(k, coda, "fric"); fric(k, coda, amp * (1 - x)); if (vc) maxSet(fr.av, k, 0.25 * amp * (1 - x)); }
        fr.pitch[k] = pitchAt(e, 1);
      });
      if (e.coda.length > 1 && e.coda[e.coda.length - 1] === "s") span(end + 0.02, end + 0.1 * sp, (k, x) => { setCons(k, "s", "fric"); fric(k, "s", amp * Math.sin(Math.PI * x)); });
      if ((manner === "stop") && !vc) span(end, end + 0.01, (k, x) => fric(k, coda, amp * 0.4 * (1 - x)));
    }
  }

  // effects as articulations
  for (const f of P.fx){
    const t = f.t, d = FX_DUR[f.name];
    if (f.name === "hmm") span(t, t + d, (k, x) => { setForm(k, locus("m", vowelF("uh","a"))); setTract(k, tractV("uh")); fr.lipC[k] = 0; fr.nas[k] = 1; fr.av[k] = 0.6 * Math.min(1, x * 8) * Math.min(1, (1 - x) * 4); fr.pitch[k] = 1 - 4 * x; });
    if (f.name === "purr") span(t, t + d, (k, x) => { setForm(k, locus("m", vowelF("uh","a"))); setTract(k, tractV("uh")); fr.lipC[k] = 0; fr.nas[k] = 1; fr.av[k] = 0.9 * Math.min(1, x * 6) * Math.min(1, (1 - x) * 4); fr.pitch[k] = -100; fr.creak[k] = 0.5; });
    if (f.name === "sigh") span(t, t + d, (k, x) => { setForm(k, vowelF(x < 0.5 ? "ae" : "ah", "a")); setTract(k, tractV("ah")); fr.ah[k] = 0.9 * Math.min(1, x * 5) * Math.min(1, (1 - x) * 2.5); fr.pitch[k] = -2 * x; });
    if (f.name === "laugh") for (let j = 0; j < 3; j++){
      const t0 = t + j * 0.15;
      span(t0, t0 + 0.04, (k, x) => { setForm(k, vowelF("ah","a")); setTract(k, tractV("ah")); maxSet(fr.ah, k, 0.25 * SMOOTH(x)); });
      span(t0 + 0.04, t0 + 0.13, (k, x) => { setForm(k, vowelF("ah","a")); setTract(k, tractV("ah")); maxSet(fr.av, k, Math.min(1, x * 6) * (1 - x * 0.7)); maxSet(fr.ah, k, 0.25); fr.pitch[k] = 3 - j * 1.5 - x; });
    }
    if (f.name === "snort") for (const o of [0, 0.15]) span(t + o, t + o + 0.1, (k, x) => { setTract(k, tractV("uh")); fr.lipC[k] = 0; fr.nas[k] = 1; maxSet(fr.af, k, 0.9 * Math.sin(Math.PI * x)); fr.fc[k] = 900 * sc; fr.fb[k] = 700; });
  }

  // fill holds: articulation and pitch stay where they were between sounds
  const fill = (arr, init) => { let last = init; for (let k = 0; k < NF; k++){ if (isNaN(arr[k])) arr[k] = last; else last = arr[k]; } };
  const nv = vowelF("uh", "a"), nt = tractV("uh");
  fill(fr.F1, nv[0]); fill(fr.F2, nv[1]); fill(fr.F3, nv[2]); fill(fr.F4, nv[3]); fill(fr.F5, nv[4]);
  fill(fr.ti, nt[0]); fill(fr.td, nt[1]); fill(fr.lip, nt[2]); fill(fr.ci, 30); fill(fr.fc, 4000); fill(fr.fb, 2000);
  fill(fr.pitch, 0);
  for (let k = 0; k < NF; k++) fr.nas[k] = Math.max(fr.nas[k], v.nasality * 0.6);
  return fr;
}

/* ===================== glottal source: LF model (as used by Pink Trombone) ===================== */
const LF_CACHE = new Map();
function lfSetup(tense){
  const key = Math.round(tense * 100);
  if (LF_CACHE.has(key)) return LF_CACHE.get(key);
  let Rd = 3 * (1 - key / 100); Rd = CLAMP(Rd, 0.5, 2.7);
  const Ra = -0.01 + 0.048 * Rd, Rk = 0.224 + 0.118 * Rd;
  const Rg = (Rk / 4) * (0.5 + 1.2 * Rk) / (0.11 * Rd - Ra * (0.5 + 1.2 * Rk));
  const Ta = Ra, Tp = 1 / (2 * Rg), Te = Tp + Tp * Rk;
  const eps = 1 / Ta, shift = Math.exp(-eps * (1 - Te)), Delta = 1 - shift;
  let rhs = (1 / eps) * (shift - 1) + (1 - Te) * shift; rhs /= Delta;
  const lower = -(Te - Tp) / 2 + rhs, upper = -lower;
  const omega = Math.PI / Tp, s = Math.sin(omega * Te);
  const y = -Math.PI * s * upper / (Tp * 2), z = Math.log(y), alpha = z / (Tp / 2 - Te);
  const E0 = -1 / (s * Math.exp(alpha * Te));
  const o = {Te, eps, shift, Delta, alpha, E0, omega, loud: Math.pow(key / 100, 0.25)};
  LF_CACHE.set(key, o); return o;
}

/* ===================== the waveguide vocal tract (after Pink Trombone) ===================== */
class Tract{
  constructor(n){
    this.n = n; const s = n / 44;
    this.bs = Math.round(10 * s); this.ts = Math.round(32 * s); this.ls = Math.round(39 * s);
    const F = k => new Float64Array(k);
    this.R = F(n); this.L = F(n); this.jR = F(n + 1); this.jL = F(n + 1);
    this.refl = F(n + 1); this.newRefl = F(n + 1); this.d = F(n); this.A = F(n); this.tgt = F(n);
    this.noseLen = Math.round(28 * s); this.noseStart = n - this.noseLen + 1;
    const m = this.noseLen;
    this.nR = F(m); this.nL = F(m); this.njR = F(m + 1); this.njL = F(m + 1); this.nRefl = F(m + 1); this.nd = F(m); this.nA = F(m);
    for (let i = 0; i < m; i++){ let d = 2 * (i / m); d = d < 1 ? 0.4 + 1.6 * d : 0.5 + 1.5 * (2 - d); this.nd[i] = Math.min(d, 1.9); }
    this.rl = this.rr = this.rn = this.nrl = this.nrr = this.nrn = 0;
    this.velum = 0.01;
    for (let i = 0; i < n; i++) this.d[i] = 1.5;
    this.calc(); this.calc();
  }
  shape(out, ti, td, lip, ci, cd, lipC){
    const n = this.n, s = n / 44;
    for (let i = 0; i < n; i++) out[i] = i < 7 * s - 0.5 ? 0.6 : i < 12 * s ? 1.1 : 1.5;
    const bs = this.bs, ts = this.ts, ls = this.ls, tI = ti * s, fixed = 2 + (td - 2) / 1.5;
    for (let i = bs; i < ls; i++){
      let curve = (1.5 - fixed + 1.7) * Math.cos(1.1 * Math.PI * (tI - i) / (ts - bs));
      if (i === ls - 1) curve *= 0.8; if (i === bs || i === ls - 2) curve *= 0.94;
      out[i] = 1.5 - curve;
    }
    const lp = Math.min(lip, lipC);
    for (let i = ls; i < n; i++) out[i] = lp;
    if (cd < 3){
      const c = ci * s, w = Math.max(1.5, 2.5 * s);
      for (let i = Math.max(0, Math.floor(c - w)); i <= Math.min(n - 1, Math.ceil(c + w)); i++){
        const t = Math.abs(i - c) / w; if (t >= 1) continue;
        const val = cd + (out[i] - cd) * t * t;
        if (val < out[i]) out[i] = Math.max(0, val);
      }
    }
  }
  calc(){
    const n = this.n, A = this.A, d = this.d;
    for (let i = 0; i < n; i++) A[i] = d[i] * d[i];
    for (let i = 1; i < n; i++){ this.refl[i] = this.newRefl[i]; this.newRefl[i] = A[i] === 0 ? 0.999 : (A[i-1] - A[i]) / (A[i-1] + A[i]); }
    this.rl = this.nrl; this.rr = this.nrr; this.rn = this.nrn;
    this.nd[0] = this.velum; const nA = this.nA, m = this.noseLen;
    for (let i = 0; i < m; i++) nA[i] = this.nd[i] * this.nd[i];
    for (let i = 1; i < m; i++) this.nRefl[i] = (nA[i-1] - nA[i]) / (nA[i-1] + nA[i]);
    const ns = this.noseStart, sum = A[ns] + A[ns + 1] + nA[0];
    this.nrl = (2 * A[ns] - sum) / sum; this.nrr = (2 * A[ns + 1] - sum) / sum; this.nrn = (2 * nA[0] - sum) / sum;
  }
  step(g, lam, noise, ni){
    const n = this.n, R = this.R, L = this.L, jR = this.jR, jL = this.jL, rf = this.refl, nr = this.newRefl;
    if (noise !== 0){ const i = ni | 0, dl = ni - i; if (i + 2 < n){ const a = noise * (1 - dl) / 2, b = noise * dl / 2; R[i+1] += a; L[i+1] += a; R[i+2] += b; L[i+2] += b; } }
    jR[0] = L[0] * 0.75 + g;
    jL[n] = R[n - 1] * -0.85;
    const il = 1 - lam;
    for (let i = 1; i < n; i++){ const r = rf[i] * il + nr[i] * lam, w = r * (R[i-1] + L[i]); jR[i] = R[i-1] - w; jL[i] = L[i] + w; }
    const i = this.noseStart, nL = this.nL, nR = this.nR;
    let r = this.nrl * il + this.rl * lam; jL[i] = r * R[i-1] + (1 + r) * (nL[0] + L[i]);
    r = this.nrr * il + this.rr * lam; jR[i] = r * L[i] + (1 + r) * (R[i-1] + nL[0]);
    r = this.nrn * il + this.rn * lam; this.njR[0] = r * nL[0] + (1 + r) * (L[i] + R[i-1]);
    for (let k = 0; k < n; k++){ R[k] = jR[k] * 0.999; L[k] = jL[k + 1] * 0.999; }
    const m = this.noseLen, njR = this.njR, njL = this.njL, nrf = this.nRefl;
    njL[m] = nR[m - 1] * -0.85;
    for (let k = 1; k < m; k++){ const w = nrf[k] * (nR[k-1] + nL[k]); njR[k] = nR[k-1] - w; njL[k] = nL[k] + w; }
    for (let k = 0; k < m; k++){ nR[k] = njR[k]; nL[k] = njL[k + 1]; }
    return R[n - 1] + nR[m - 1];
  }
}

/* ===================== render ===================== */
function createSynth(raw, v, gainOverride){
  const size = v.tract;
  const spk = speakerTable(v.speaker, size);
  const P = plan(raw, v);
  const fr = makeFrames(P, v, spk);
  const NS = fr.NF * CF, out = new Float32Array(NS);
  const track = {F1: new Float32Array(Math.ceil(fr.NF / 5)), F2: new Float32Array(Math.ceil(fr.NF / 5)), amp: new Float32Array(Math.ceil(fr.NF / 5)), lip: new Float32Array(Math.ceil(fr.NF / 5)), f0: new Float32Array(Math.ceil(fr.NF / 5)), step: FRAME * 5};
  let seed = hashStr(raw + v.name) | 1;
  const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 4294967296; };
  const gauss = () => (rnd() + rnd() + rnd() - 1.5) * 1.15;

  const tractMode = v.engine === "tract";
  let tract = null;
  if (tractMode){ tract = new Tract(CLAMP(Math.round(30 / (spk.sc * size)), 14, 40)); }
  // Klatt resonator state: [a,b,c,y1,y2] x 7 (nasal pole, nasal zero, F5..F1)
  const res = new Float64Array(7 * 5), rT = new Float64Array(7 * 3), rD = new Float64Array(7 * 3), fricR = new Float64Array(5), aspHP = {x1:0, y1:0};
  let aspLP = 0, fricLP = 0; const aspLPk = 1 - Math.exp(-2 * Math.PI * 2600 * spk.sc / SR), fricLPk = 1 - Math.exp(-2 * Math.PI * 7500 / SR);
  const setRes = (j, f, bw) => {
    f = Math.min(f, SR * 0.45);
    const c = -Math.exp(-2 * Math.PI * bw / SR), b = 2 * Math.exp(-Math.PI * bw / SR) * Math.cos(2 * Math.PI * f / SR), a = 1 - b - c;
    const o = j * 3; rT[o] = a; rT[o+1] = b; rT[o+2] = c;
  };
  const setAnti = (f, bw) => {
    const c = -Math.exp(-2 * Math.PI * bw / SR), b = 2 * Math.exp(-Math.PI * bw / SR) * Math.cos(2 * Math.PI * f / SR), a = 1 - b - c;
    rT[3] = 1 / a; rT[4] = -b / a; rT[5] = -c / a;
  };
  const setFric = (f, bw) => {
    f = Math.min(f, SR * 0.45);
    const c = -Math.exp(-2 * Math.PI * bw / SR), b = 2 * Math.exp(-Math.PI * bw / SR) * Math.cos(2 * Math.PI * f / SR);
    fricR[0] = 1 - b - c; fricR[1] = b; fricR[2] = c;
  };

  // smoothed control state
  const artK = 1 - Math.exp(-FRAME / (0.008 + 0.05 * v.smooth));
  const fastK = 1 - Math.exp(-FRAME / 0.004), cK = 1 - Math.exp(-FRAME / 0.007), pK = 1 - Math.exp(-FRAME / 0.02);
  const S = {av:0, ah:0, af:0, nas:fr.nas[0], creak:0, tense:0, F:[fr.F1[0], fr.F2[0], fr.F3[0], fr.F4[0], fr.F5[0]], ti:fr.ti[0], td:fr.td[0], lip:fr.lip[0], cd:9, lipC:9, ci:fr.ci[0], pitch:fr.pitch[0], fc:4000, fb:2000};
  let coefInit = false, silent = 0, phase = 0, cycF0 = v.pitch, cycAmp = 1, cyc = 0, lf = lfSetup(v.tension), lpY = 0, dcX = 0, dcY = 0, y1nz = 0, y2nz = 0;
  const lpA = Math.exp(-2 * Math.PI * (1800 + 9000 * v.brightness) * (1 - 0.55 * v.mutter) / SR);
  const flutter = 0.6 * Math.min(1, v.jitter / 0.03);
  const fricGain = tractMode ? FRIC_T : FRIC_F, aspGain = tractMode ? 0.5 : 0.9;

  // precomputed beeps (Undertale-style), mixed in after the voice gain
  const beepBuf = P.beeps.length ? new Float32Array(NS) : null;
  if (beepBuf){
    const bl = Math.round(0.05 * SR);
    for (const b of P.beeps){
      const s0 = Math.round(b.t * SR), f = v.pitch * 2 * Math.pow(2, b.semis / 12), w = 2 * Math.PI * f / SR;
      for (let i = 0; i < bl && s0 + i < NS; i++){
        const env = Math.min(1, i / 60) * (i > bl * 0.6 ? (bl - i) / (bl * 0.4) : 1), p = w * i;
        beepBuf[s0 + i] += env * 0.3 * (Math.sin(p) + (Math.sin(3 * p) / 3 + Math.sin(5 * p) / 5) * v.brightness);
      }
    }
  }
  let K = 0;
  const gain = (gainOverride ?? calibrate(v)) * v.volume;
  function next(nFrames){
  const kEnd = Math.min(fr.NF, K + nFrames), sStart = K * CF;
  for (let k = K; k < kEnd; k++){
    const pav = S.av, pah = S.ah, paf = S.af;
    S.av += (fr.av[k] - S.av) * fastK; S.ah += (fr.ah[k] - S.ah) * fastK; S.af += (fr.af[k] - S.af) * fastK;
    S.nas += (fr.nas[k] - S.nas) * cK; S.creak += (fr.creak[k] - S.creak) * pK; S.tense += (fr.tense[k] - S.tense) * pK;
    S.F[0] += (fr.F1[k] - S.F[0]) * artK; S.F[1] += (fr.F2[k] - S.F[1]) * artK; S.F[2] += (fr.F3[k] - S.F[2]) * artK; S.F[3] += (fr.F4[k] - S.F[3]) * artK; S.F[4] += (fr.F5[k] - S.F[4]) * artK;
    S.pitch += (fr.pitch[k] - S.pitch) * pK; S.fc = fr.fc[k]; S.fb = fr.fb[k];
    S.ti += (fr.ti[k] - S.ti) * artK; S.td += (fr.td[k] - S.td) * artK; S.lip += (fr.lip[k] - S.lip) * artK;
    S.cd += (fr.cd[k] - S.cd) * (fr.cd[k] < S.cd ? cK : artK); S.lipC += (fr.lipC[k] - S.lipC) * (fr.lipC[k] < S.lipC ? cK : artK);
    if (fr.cd[k] < 3) S.ci = fr.ci[k];
    const live = S.av + S.ah + S.af + pav + pah + paf > 3e-4 || fr.av[k] + fr.ah[k] + fr.af[k] > 0;
    silent = live ? 0 : silent + 1;
    if (k % 5 === 0 && silent > 25){ const ti = k / 5; track.F1[ti] = S.F[0]; track.F2[ti] = S.F[1]; track.amp[ti] = 0; track.lip[ti] = S.lip; }
    if (silent > 25) continue; // nothing sounding: skip the synthesis entirely
    const tSec = k * FRAME;
    let f0 = fr.pitch[k] <= -50 ? 26 : v.pitch * Math.pow(2, (S.pitch + v.wobDepth * Math.sin(2 * Math.PI * v.wobRate * tSec)) / 12);
    // Klatt's flutter: three slow sines for natural drift
    f0 += flutter * (f0 / 100) * (Math.sin(2 * Math.PI * 12.7 * tSec) + Math.sin(2 * Math.PI * 7.1 * tSec) + Math.sin(2 * Math.PI * 4.7 * tSec));
    const tense = CLAMP(v.tension + S.tense - S.creak * 0.2, 0.05, 0.98);

    let fricIdx = 0;
    if (tractMode){
      tract.shape(tract.d, S.ti, S.td, S.lip, S.ci, S.cd, S.lipC);
      tract.velum = 0.01 + 0.4 * S.nas;
      tract.calc();
      fricIdx = S.lipC < S.cd ? tract.n - 3 : S.ci * tract.n / 44;
    } else {
      // an open glottis (breath, /h/, whisper) damps the resonances, so noise doesn't ring into a whistle
      const asr = S.ah / (S.av + S.ah + 1e-4), bw1 = 1 + 0.6 * v.breath + S.nas + 2 * asr;
      setRes(2, S.F[4], BW[4] * (1 + 1.2 * asr)); setRes(3, S.F[3], BW[3] * (1 + 1.2 * asr)); setRes(4, S.F[2], BW[2] * (1 + S.nas + asr)); setRes(5, S.F[1], BW[1] * (1 + 1.5 * S.nas + 1.2 * asr)); setRes(6, S.F[0], BW[0] * bw1);
      setRes(0, 270 * spk.sc, 100); setAnti((270 + 210 * S.nas) * spk.sc, 100);
      // glide the filter coefficients sample by sample instead of jumping every 2 ms
      // (jumps make a faint 500 Hz "zipper" buzz during fast formant moves)
      if (!coefInit){ for (let j = 0; j < 7; j++){ res[j*5] = rT[j*3]; res[j*5+1] = rT[j*3+1]; res[j*5+2] = rT[j*3+2]; } coefInit = true; }
      for (let j = 0; j < 7; j++) for (let q = 0; q < 3; q++) rD[j*3+q] = (rT[j*3+q] - res[j*5+q]) / CF;
    }
    setFric(S.fc, S.fb);
    if (k % 5 === 0){ const ti = k / 5; track.F1[ti] = S.F[0]; track.F2[ti] = S.F[1]; track.amp[ti] = Math.min(1.5, S.av + S.ah + 0.4 * S.af); track.lip[ti] = Math.min(S.lip, S.lipC); track.f0[ti] = f0; }

    const base = k * CF;
    for (let j = 0; j < CF; j++){
      const x = j / CF, av = pav + (S.av - pav) * x, ah = pah + (S.ah - pah) * x, af = paf + (S.af - paf) * x;
      // glottis
      phase += cycF0 / SR;
      if (phase >= 1){
        phase -= 1; cyc++;
        cycF0 = f0 * (1 + v.jitter * gauss());
        if (S.creak > 0.02){ cycF0 *= 1 - S.creak * (0.42 + 0.08 * rnd()); } // fry: lower, slightly irregular, not random cracks
        cycAmp = (1 + v.jitter * 2.5 * gauss()) * (S.creak > 0.02 && (cyc & 1) ? 1 - 0.6 * S.creak : 1);
        lf = lfSetup(tense);
      }
      const g = phase > lf.Te ? (-Math.exp(-lf.eps * (phase - lf.Te)) + lf.shift) / lf.Delta : lf.E0 * Math.exp(lf.alpha * phase) * Math.sin(lf.omega * phase);
      const nz = rnd() * 2 - 1;
      // aspiration: highpassed noise, louder while the folds are open
      const hp0 = 0.97 * (aspHP.y1 + nz - aspHP.x1); aspHP.x1 = nz; aspHP.y1 = hp0;
      aspLP += (hp0 - aspLP) * aspLPk; const hp = aspLP * 1.6; // breath is soft noise, not bright static
      const open = phase < lf.Te ? 1 : 0.35;
      const asp = hp * (ah + v.breath * av * 0.55 * (1.2 - tense)) * (av > 0.05 ? open : 1);
      const src = g * av * cycAmp * lf.loud + asp * aspGain;
      // frication noise
      const nz2 = rnd() * 2 - 1;
      const fy = fricR[0] * nz2 + fricR[1] * fricR[3] + fricR[2] * fricR[4]; fricR[4] = fricR[3]; fricR[3] = fy;
      fricLP += (fy - fricLP) * fricLPk; const fricS = fricLP * af;
      let y;
      if (tractMode){
        y = (tract.step(src, x, fricS * fricGain * 2, fricIdx) + tract.step(src, x + 0.5 / CF, fricS * fricGain * 2, fricIdx)) * 0.5;
      } else {
        // cascade: nasal pole -> nasal zero -> F5..F1
        for (let q = 0; q < 7; q++){ const o5 = q * 5, o3 = q * 3; res[o5] += rD[o3]; res[o5+1] += rD[o3+1]; res[o5+2] += rD[o3+2]; }
        let s = src;
        let o = 0; let yy = res[o] * s + res[o+1] * res[o+3] + res[o+2] * res[o+4]; res[o+4] = res[o+3]; res[o+3] = yy; s = yy;
        yy = res[5] * s + res[6] * y1nz + res[7] * y2nz; y2nz = y1nz; y1nz = s; s = yy;
        for (let r = 2; r < 7; r++){ o = r * 5; yy = res[o] * s + res[o+1] * res[o+3] + res[o+2] * res[o+4]; res[o+4] = res[o+3]; res[o+3] = yy; s = yy; }
        y = s * 0.12 + fricS * fricGain;
      }
      lpY = y + lpA * (lpY - y);
      const dc = lpY - dcX + 0.995 * dcY; dcX = lpY; dcY = dc;
      out[base + j] = dc;
    }
  }

  K = kEnd;
  const sEnd = kEnd * CF;
  for (let i = sStart; i < sEnd; i++){
    let a = out[i] * gain;
    a = a > 0.7 ? 0.7 + 0.3 * Math.tanh((a - 0.7) / 0.3) : a < -0.7 ? -0.7 - 0.3 * Math.tanh((-a - 0.7) / 0.3) : a;
    if (beepBuf) a += beepBuf[i] * v.volume;
    if (i < 160) a *= i / 160;
    if (i > NS - 160) a *= (NS - i) / 160;
    out[i] = a;
  }
  return [sStart, sEnd];
  }
  return {plan: P, track, sc: spk.sc, NS, samples: out, next, get done(){ return K >= fr.NF; }, get pos(){ return K * CF; }};
}

// Each voice gets a fixed loudness calibration, so whispers stay quiet and shouts stay loud.
const CAL = new Map();
const CAL_KEYS = ["engine","style","speaker","pitch","tract","mutter","brightness","tension","breath","jitter","creak","nasality","consonants","smooth"];
function calibrate(v){
  const key = CAL_KEYS.map(k => v[k]).join("|");
  if (CAL.has(key)) return CAL.get(key);
  const s = createSynth("Ah, hello there! How are you?", {...v, volume:1, style: v.style === "beeps" ? "babble" : v.style, wobDepth:0, name:"cal"}, 1);
  s.next(1e9);
  let sum = 0, cnt = 0; const o = s.samples;
  for (let i = 0; i < o.length; i++){ const a = o[i]; if (a > 1e-4 || a < -1e-4){ sum += a * a; cnt++; } }
  const g = CLAMP(0.1 / (Math.sqrt(sum / Math.max(1, cnt)) || 1e-6), 1e-3, 1e6);
  if (CAL.size > 64) CAL.clear();
  CAL.set(key, g); return g;
}
function render(raw, v){ const t0 = (typeof performance !== "undefined" ? performance : Date).now(); const s = createSynth(raw, v); s.next(1e9); s.ms = (typeof performance !== "undefined" ? performance : Date).now() - t0; return s; }

export {CLAMP, LERP, SMOOTH, FRAME, itemsOf, render, createSynth, calibrate, plan, speakerTable, syllabify, Tract, SR, CF, VKEYS, VWORD, H95, TRACT_V, FX_DUR};
