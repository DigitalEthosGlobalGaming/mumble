// Renders every default voice in both engines and reports limiter use and sharp jumps.
//   node tools/scan-clicks.js
const M = require("../src/mumble-core.ts"), {DEFAULTS} = require("./voices.js");
const lines = ["Welcome back, traveller. Sister Agnes has been asking about you... Did you bring the fish?",
  "HALT! Nobody passes this gate after dark!", "Oh, hello there! How are you today?",
  "Listen closely. {whisper}The mayor is not who he says he is.{/whisper}"];
for (const d of DEFAULTS) for (const engine of ["formant", "tract"]){
  const v = {...d, engine}; let lim = 0, tot = 0, jumps = 0, ms = 0;
  for (const l of lines){
    const r = M.render(l, v), s = r.samples; ms += r.ms;
    for (let i = 2; i < s.length; i++){ if (Math.abs(s[i]) > 0.69) lim++; if (Math.abs(s[i] - 2 * s[i-1] + s[i-2]) > 0.3) jumps++; tot++; }
  }
  console.log(d.name.padEnd(16), engine.padEnd(8), `limited ${(100 * lim / tot).toFixed(2)}%`.padEnd(16), `sharp jumps ${jumps}`.padEnd(16), `${(ms / lines.length).toFixed(0)} ms/line`);
}
