// Refit the vocal tract engine's tongue/lip shapes so its formants match the Hillenbrand men's vowels.
// Prints a TRACT_V object to paste into src/mumble-core.js (and writes data/tract-shapes.json).
//   node tools/fit-tract.js
const fs = require("fs"), path = require("path");
const M = require("../src/mumble-core.ts");
const SR2 = M.SR * 2, N = 4096, n = 30; // two tract steps per sample
function fftmag(x){ const L = x.length, re = Float64Array.from(x), im = new Float64Array(L);
  for (let i = 1, j = 0; i < L; i++){ let b = L >> 1; for (; j & b; b >>= 1) j ^= b; j ^= b; if (i < j){ [re[i], re[j]] = [re[j], re[i]]; } }
  for (let len = 2; len <= L; len <<= 1){ const a = -2 * Math.PI / len; for (let i = 0; i < L; i += len) for (let k = 0; k < len / 2; k++){ const c = Math.cos(a * k), s = Math.sin(a * k), u = i + k + len / 2; const xr = re[u] * c - im[u] * s, xi = re[u] * s + im[u] * c; re[u] = re[i+k] - xr; im[u] = im[i+k] - xi; re[i+k] += xr; im[i+k] += xi; } }
  const m = new Float64Array(L / 2); for (let k = 0; k < L / 2; k++) m[k] = Math.hypot(re[k], im[k]); return m; }
function formants(p){
  const t = new M.Tract(n); t.shape(t.d, p[0], p[1], p[2], 0, 9, 9); t.calc(); t.calc();
  const x = new Float64Array(N); for (let k = 0; k < N; k++) x[k] = t.step(k === 0 ? 1 : 0, 1, 0, 0);
  const mag = fftmag(x), pk = [];
  for (let k = 3; k < N / 2 - 3; k++){ const f = k * SR2 / N; if (f < 150) continue; if (mag[k] > mag[k-1] && mag[k] >= mag[k+1] && mag[k] > mag[k-2] && mag[k] > mag[k+2]) pk.push(f); if (pk.length >= 3) break; }
  return pk; }
const err = (pk, tg) => pk.length < 3 ? 1e9 : 3 * Math.abs(Math.log(pk[0] / tg[0])) + 2 * Math.abs(Math.log(pk[1] / tg[1])) + 0.5 * Math.abs(Math.log(pk[2] / tg[2]));
const res = {};
for (const v of M.VKEYS){
  const tg = M.H95.m[v].slice(0, 3); let best = [1e9];
  for (let ti = 10; ti <= 32; ti += 2) for (let td = 1.6; td <= 3.6; td += 0.2) for (const lp of [0.25, 0.4, 0.6, 0.8, 1, 1.25, 1.5, 1.8]){ const e = err(formants([ti, td, lp]), tg); if (e < best[0]) best = [e, ti, td, lp]; }
  for (let it = 0; it < 3; it++){ const [, ti, td, lp] = best, st = [1 / (it + 1), 0.1 / (it + 1), 0.1 / (it + 1)];
    for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) for (let c = -2; c <= 2; c++){ const p = [ti + a * st[0], td + b * st[1], Math.max(0.15, lp + c * st[2])]; const e = err(formants(p), tg); if (e < best[0]) best = [e, ...p]; } }
  res[v] = best.slice(1).map(x => +x.toFixed(2));
  console.error(v.padEnd(3), "target", tg.join(","), "got", formants(res[v]).map(Math.round).join(","));
}
fs.writeFileSync(path.join(__dirname, "..", "data", "tract-shapes.json"), JSON.stringify(res, null, 1));
console.log("const TRACT_V=" + JSON.stringify(res) + ";");
