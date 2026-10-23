/* Random "living" backdrops for the video export. Each one is a sky, a pair of hills, a few drifting things
   (clouds, stars, birds) and a handful of cheap particles (snow, leaves, petals, fireflies).
   Everything is a pure function of the clock, so a frame always looks the same however it is reached, and the
   clock is quantised to 12 steps a second so it moves like stop-motion paper rather than smoothly. */

export type Particle = "snow" | "leaf" | "petal" | "firefly";
export interface Backdrop { name: string; seed: number; draw(g: CanvasRenderingContext2D, t: number): void }
export interface BackdropSize { W: number; H: number; ground: number }
export interface Palette { skyTop: string; skyBot: string; snow: string; pine: string; edge: string }

interface Theme {
  name: string; skyTop: string; skyBot: string; ground: string; hill: string; hillFar?: string; edge: string;
  cloud?: string; stars?: boolean; moon?: boolean; sun?: string; birds?: boolean; trees?: string;
  particle: Particle; count: number; colours: string[];
}

const THEMES = (p: Palette): Theme[] => [
  {name: "meadow", skyTop: p.skyTop, skyBot: p.skyBot, ground: p.snow, hill: p.pine, edge: p.edge, cloud: "#ffffff", birds: true,
   particle: "petal", count: 26, colours: ["#ffffff", "#ffd1dc", "#ffe9a8"]},
  {name: "snowfall", skyTop: "#9fb9d6", skyBot: "#e4eef7", ground: "#f4f8fc", hill: "#cfdcea", hillFar: "#b7c9dd", edge: "#5f7a96", cloud: "#dfe8f2", trees: "#3f6b57",
   particle: "snow", count: 90, colours: ["#ffffff"]},
  {name: "night", skyTop: "#0d1530", skyBot: "#34457a", ground: "#2c4a3c", hill: "#1f3a33", edge: "#0b1a1c", stars: true, moon: true,
   particle: "firefly", count: 24, colours: ["#fff3a0", "#d8ff9a"]},
  {name: "sunset", skyTop: "#5b4a8c", skyBot: "#ffb36b", ground: "#6d7a4a", hill: "#4d5a3a", edge: "#2b2a22", cloud: "#ffd9b0", sun: "#fff0c2", birds: true,
   particle: "firefly", count: 10, colours: ["#ffe9a8"]},
  {name: "autumn", skyTop: "#8ec3d9", skyBot: "#fbe6c8", ground: "#c9a15a", hill: "#b5651d", hillFar: "#d98a2b", edge: "#5a3a1e", cloud: "#fff6e8", birds: true,
   particle: "leaf", count: 34, colours: ["#d2481f", "#e8892b", "#f0b429", "#a8431f"]},
];

const mulberry = (a: number) => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const mod = (a: number, n: number) => ((a % n) + n) % n;
const STEP = 12;

export const BACKDROP_NAMES = THEMES({skyTop: "", skyBot: "", snow: "", pine: "", edge: ""}).map(t => t.name);

/** `name` picks a theme; anything else (or nothing) picks one at random. `seed` fixes the random choices. */
export function makeBackdrop(size: BackdropSize, pal: Palette, name?: string, seed = Math.floor(Math.random() * 2 ** 32)): Backdrop {
  const {W, H, ground: GROUND} = size, gy = H * GROUND;
  const themes = THEMES(pal), r = mulberry(seed);
  const theme = themes.find(t => t.name === name) || themes[Math.floor(r() * themes.length)];
  const between = (a: number, b: number) => a + r() * (b - a);

  /* static layers: the sky, and the hills and ground with the frame (transparent where the sky shows through) */
  const sky = document.createElement("canvas"); sky.width = W; sky.height = H;
  const sg = sky.getContext("2d")!, grad = sg.createLinearGradient(0, 0, 0, gy);
  grad.addColorStop(0, theme.skyTop); grad.addColorStop(1, theme.skyBot); sg.fillStyle = grad; sg.fillRect(0, 0, W, H);
  if (theme.sun){ // a low sun with a couple of halos
    for (const [rad, a] of [[150, 0.10], [105, 0.16], [64, 1]]){ sg.globalAlpha = a; sg.fillStyle = theme.sun; sg.beginPath(); sg.arc(W * 0.5, gy - 40, rad, 0, Math.PI * 2); sg.fill(); }
    sg.globalAlpha = 1;
  }
  if (theme.moon){
    const mx = W * between(0.55, 0.85), my = between(70, 130);
    sg.fillStyle = "rgba(255,255,230,.14)"; sg.beginPath(); sg.arc(mx, my, 62, 0, Math.PI * 2); sg.fill();
    sg.fillStyle = "#f6f3d8"; sg.beginPath(); sg.arc(mx, my, 40, 0, Math.PI * 2); sg.fill();
    sg.fillStyle = "rgba(160,160,130,.35)";
    for (const [dx, dy, rad] of [[-12, -8, 9], [10, 12, 6], [8, -16, 5]]){ sg.beginPath(); sg.arc(mx + dx, my + dy, rad, 0, Math.PI * 2); sg.fill(); }
  }

  const land = document.createElement("canvas"); land.width = W; land.height = H;
  const lg = land.getContext("2d")!;
  lg.fillStyle = theme.ground; lg.fillRect(0, gy, W, H - gy);
  const base = H * 0.62;
  const hills: [number, number, number, string][] = [[-0.04 * W, 0.46 * W, 105, theme.hill], [W * 1.06 - 0.52 * W, 0.52 * W, 158, theme.hillFar || theme.hill]];
  for (const [x, w, h, col] of hills){
    lg.beginPath(); lg.ellipse(x + w / 2, base, w / 2, h, 0, Math.PI, 0);
    lg.fillStyle = col; lg.fill(); lg.lineWidth = 2; lg.strokeStyle = theme.edge; lg.stroke();
    lg.fillStyle = theme.ground; lg.fillRect(x - 6, base, w + 12, 3);
  }
  if (theme.trees){ // little paper pines along the hills
    for (let i = 0; i < 9; i++){
      const tx = between(0.02, 0.98) * W, ty = base - between(0, 60), th = between(34, 60);
      lg.fillStyle = theme.trees; lg.strokeStyle = theme.edge; lg.lineWidth = 1.5;
      for (let k = 0; k < 3; k++){ const y = ty - k * th * 0.28, w = th * (0.5 - k * 0.12); lg.beginPath(); lg.moveTo(tx - w, y); lg.lineTo(tx, y - th * 0.45); lg.lineTo(tx + w, y); lg.closePath(); lg.fill(); lg.stroke(); }
    }
  }
  lg.lineWidth = 3; lg.strokeStyle = theme.edge; lg.strokeRect(1.5, 1.5, W - 3, H - 3);

  /* things that drift */
  const clouds = theme.cloud ? Array.from({length: 5}, () => ({x: between(0, W + 400), y: between(30, gy * 0.5), s: between(0.7, 1.5), v: between(6, 18)})) : [];
  const stars = theme.stars ? Array.from({length: 80}, () => ({x: between(0, W), y: between(8, gy * 0.75), z: Math.floor(between(2, 4)), f: between(1.5, 5), p: between(0, 6.3)})) : [];
  const birds = theme.birds ? Array.from({length: 4}, () => ({x: between(0, W + 200), y: between(50, 200), v: between(40, 80), s: between(0.8, 1.3), p: between(0, 6.3)})) : [];
  const bits = Array.from({length: theme.count}, () => ({
    x: between(0, W), y: between(0, H), z: between(0.5, 1), p: between(0, 6.3), f: between(0.4, 1.4),
    c: theme.colours[Math.floor(r() * theme.colours.length)],
  }));

  const cloud = (g: CanvasRenderingContext2D, x: number, y: number, s: number) => {
    g.beginPath();
    for (const [dx, dy, rad] of [[0, 0, 26], [30, -12, 32], [66, -2, 26], [34, 8, 24]]) g.ellipse(x + dx * s, y + dy * s, rad * s * 1.25, rad * s * 0.8, 0, 0, Math.PI * 2);
    g.fill();
  };

  return {
    name: theme.name, seed,
    draw(g, time) {
      const t = Math.floor(time * STEP) / STEP;
      g.drawImage(sky, 0, 0);
      for (const s of stars){
        const on = Math.sin(t * s.f + s.p) > -0.3;
        g.globalAlpha = on ? 0.95 : 0.35; g.fillStyle = "#fff"; g.fillRect(s.x, s.y, s.z, s.z);
      }
      g.globalAlpha = theme.name === "sunset" ? 0.7 : 0.9; g.fillStyle = theme.cloud || "#fff";
      for (const c of clouds) cloud(g, mod(c.x + c.v * t, W + 400) - 200, c.y, c.s);
      g.globalAlpha = 1;
      g.strokeStyle = theme.name === "sunset" ? "#3a2a3a" : "#2a3340"; g.lineWidth = 2.5; g.lineCap = "round";
      for (const b of birds){
        const x = mod(b.x + b.v * t, W + 200) - 100, y = b.y + 10 * Math.sin(t * 1.3 + b.p), up = Math.floor(t * 4 + b.p) % 2 ? 7 : -3;
        g.beginPath(); g.moveTo(x - 12 * b.s, y + up * b.s); g.lineTo(x, y); g.lineTo(x + 12 * b.s, y + up * b.s); g.stroke();
      }
      g.drawImage(land, 0, 0);

      g.save(); g.beginPath(); g.rect(3, 3, W - 6, H - 6); g.clip();
      for (const p of bits){
        g.fillStyle = p.c;
        if (theme.particle === "snow"){
          const x = mod(p.x + 30 * p.z * Math.sin(t * p.f + p.p) + 10 * t, W), y = mod(p.y + 60 * p.z * t, H);
          g.globalAlpha = 0.6 + 0.4 * p.z; g.beginPath(); g.arc(x, y, 1.5 + 3 * p.z, 0, Math.PI * 2); g.fill();
        } else if (theme.particle === "leaf"){
          const x = mod(p.x + 35 * t + 28 * Math.sin(t * p.f + p.p), W), y = mod(p.y + 45 * p.z * t, H), a = t * p.f * 2 + p.p;
          g.globalAlpha = 1; g.save(); g.translate(x, y); g.rotate(a); g.scale(1, Math.abs(Math.cos(a * 0.7)) * 0.7 + 0.3);
          g.beginPath(); g.moveTo(-9 * p.z, 0); g.quadraticCurveTo(0, -7 * p.z, 9 * p.z, 0); g.quadraticCurveTo(0, 7 * p.z, -9 * p.z, 0); g.fill(); g.restore();
        } else if (theme.particle === "petal"){
          const x = mod(p.x + 20 * t + 24 * Math.sin(t * p.f + p.p), W), y = mod(p.y + 28 * p.z * t, H), a = t * p.f + p.p;
          g.globalAlpha = 0.9; g.save(); g.translate(x, y); g.rotate(a); g.beginPath(); g.ellipse(0, 0, 6 * p.z, 3 * p.z, 0, 0, Math.PI * 2); g.fill(); g.restore();
        } else { // fireflies wander over the ground and blink
          const x = p.x + 70 * Math.sin(t * 0.5 * p.f + p.p), y = gy - 110 + mod(p.y, H - gy + 60) + 30 * Math.sin(t * 0.7 * p.f + p.p * 2);
          const glow = Math.pow(0.5 + 0.5 * Math.sin(t * 1.6 * p.f + p.p), 2);
          g.globalAlpha = 0.25 * glow; g.beginPath(); g.arc(x, y, 11, 0, Math.PI * 2); g.fill();
          g.globalAlpha = 0.35 + 0.65 * glow; g.beginPath(); g.arc(x, y, 3, 0, Math.PI * 2); g.fill();
        }
      }
      g.restore(); g.globalAlpha = 1;
    },
  };
}
