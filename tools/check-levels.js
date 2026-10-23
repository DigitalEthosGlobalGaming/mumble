// Consonant and breath levels relative to the vowel that follows.
// Real speech: /s/ ~10-15 dB under the vowel, /h/ ~10-15 dB under, /f/ much quieter.
//   node tools/check-levels.js [formant|tract]
const M = require("../src/mumble-core.ts"), {BASE} = require("./voices.js");
const V = {...BASE, name:"Villager", engine: process.argv[2] || "formant", cps:12, decl:0, random:0, length:1.5};
const db = x => (20 * Math.log10(x + 1e-9)).toFixed(1).padStart(6);
function seg(s, a, b){ let e = 0, hf = 0, p = 0; const i0 = Math.round(a * M.SR), i1 = Math.round(b * M.SR);
  for (let i = i0; i < i1; i++){ e += s[i] * s[i]; const d = s[i] - s[i-1]; hf += d * d; p = Math.max(p, Math.abs(s[i])); }
  return {rms: Math.sqrt(e / (i1 - i0)), hf: hf / (e + 1e-12), p}; }
console.log("word".padEnd(12), "consonant dB   vowel dB   difference   brightness");
for (const w of ["sass","shush","fife","hah","heed"]){
  const r = M.render(w, V), e = r.plan.events[0], sp = r.plan.sp;
  const c = seg(r.samples, e.t0 - 0.06 * sp, e.t0), v = seg(r.samples, e.t0 + 0.03, e.t0 + e.dur * 0.6);
  console.log(w.padEnd(12), db(c.rms), "      ", db(v.rms), "  ", db(c.rms / v.rms), "      ", c.hf.toFixed(2));
}
