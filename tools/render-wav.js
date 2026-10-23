// Render a line to a WAV file.
//   node tools/render-wav.js "Hello there, traveller!" --voice Guard --out hello.wav
//   node tools/render-wav.js "Hi!" --json '{"name":"Mine","pitch":180,...}' --engine tract
const fs = require("fs");
const M = require("../src/mumble-core.ts"), {BASE, byName} = require("./voices.js"), wav = require("./wav.js");
const args = process.argv.slice(2), opt = k => { const i = args.indexOf("--" + k); return i >= 0 ? args[i + 1] : undefined; };
const line = args.find((a, i) => !a.startsWith("--") && !(i > 0 && args[i - 1].startsWith("--"))) || "Welcome back, traveller.";
let v = opt("json") ? {...BASE, ...JSON.parse(opt("json"))} : (byName(opt("voice") || "Villager") || BASE);
if (opt("engine")) v = {...v, engine: opt("engine")};
if (opt("style")) v = {...v, style: opt("style")};
const t0 = Date.now(), r = M.render(line, v);
const out = opt("out") || (v.name.replace(/\W+/g, "-").toLowerCase() + ".wav");
fs.writeFileSync(out, wav(r.samples, M.SR));
console.log(`${v.name}: ${(r.samples.length / M.SR).toFixed(2)} s rendered in ${Date.now() - t0} ms -> ${out}`);
console.log(r.plan.events.map(e => `${e.on.join("+")}${e.on.length ? "+" : ""}${e.v1}${e.v2 ? ">" + e.v2 : ""}${e.coda.length ? "+" + e.coda.join("+") : ""}`).join("  "));
