// Renders slow "hVd"-style words and measures F1/F2 from the harmonic envelope,
// compared against the Hillenbrand targets the engine is aiming for.
//   node tools/check-formants.js [formant|tract]
const M = require("../src/mumble-core.ts"), {BASE} = require("./voices.js");
const engine = process.argv[2] || "formant";
const V = {...BASE, name:"probe", engine, pitch:80, breath:0, jitter:0, creak:0, decl:0, random:0, cps:5, length:2.5};
const tab = M.speakerTable(0, 1).tab, f0 = 80;
for (const w of ["heed","hid","hed","had","hod","hoe","hud","hoo"]){
  const r = M.render(w, V), s = r.samples, ev = r.plan.events[0], mid = Math.round((ev.t0 + ev.dur * 0.4) * M.SR);
  const amps = [];
  for (let h = 1; h * f0 < 4000; h++){
    let re = 0, im = 0;
    for (let i = -1000; i < 1000; i++){ const w0 = 0.5 - 0.5 * Math.cos(2 * Math.PI * (i + 1000) / 2000); re += s[mid + i] * w0 * Math.cos(2 * Math.PI * h * f0 * i / M.SR); im += s[mid + i] * w0 * Math.sin(2 * Math.PI * h * f0 * i / M.SR); }
    amps.push(20 * Math.log10(Math.hypot(re, im) + 1e-9));
  }
  const floor = Math.max(...amps) - 60; // ignore ripples deep in the valleys between formants
  const pk = []; for (let h = 1; h < amps.length - 1; h++) if (amps[h] > floor && amps[h] > amps[h-1] && amps[h] >= amps[h+1]) pk.push((h + 1) * f0);
  console.log(w.padEnd(5), ev.v1.padEnd(3), "target", tab[ev.v1].a.slice(0, 3).map(Math.round).join(",").padEnd(15), "peaks", pk.slice(0, 4).join(","));
}
console.log("(peaks are harmonic-resolution, ±40 Hz; a low F1 can hide under the first harmonics)");
