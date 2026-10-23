/* Procedural paper cut-out Canadians: a big square head split right across by the mouth line, tiny dot eyes,
   no neck and a stubby body. A seeded random generator assembles each person from a kit of parts (head shape,
   hair, hat, face, outfit, legwear, something to hold), so the same seed always builds the same person and a
   new seed builds a new one. The top of the head flaps open from the back as they talk; `flip` moves the
   hinge to the other side for someone standing on the right. */

export interface Look {
  skin: string; main: string; second: string; hair: string; trousers: string; tie: string; shoes: string; hatCol: string; hatCol2: string;
  shirt: string; lip: string; skirtCol: string; beard: string;
  hw: number; hh: number; rTop: number; rBot: number; taper: number; mouthAt: number; fringe: number;
  tw: number; th: number; eyeGap: number; eyeY: number;
  hairStyle: "bald" | "tuft" | "crop" | "side" | "quiff" | "sides" | "bob" | "long" | "bun";
  fringeCut: "straight" | "bangs" | "parted" | "swept";
  brows: "none" | "angry" | "worried" | "flat"; lashes: boolean; lips: boolean;
  facial: "none" | "moustache" | "goatee" | "beard"; glasses: "none" | "round" | "square";
  hat: "none" | "toque" | "cap" | "cowboy" | "mountie" | "beret" | "bag" | "veil";
  outfit: "suit" | "shirt" | "tee" | "jacket" | "serge" | "western" | "mime" | "overalls" | "flannel" | "jersey" | "sweater" | "dress" | "gown";
  skirt: boolean; tights: string; longSleeves: boolean; letter: string; number: number;
  prop: "none" | "rod" | "stick" | "coffee" | "flag"; fish: boolean;
}
export interface Character { el: HTMLElement; setOpen(open: number): void; setLook(look: Look): void }
const still = matchMedia("(prefers-reduced-motion: reduce)");

/* Every palette is made of colours you would really see on people and clothes; repeats make the common ones turn up more often. */
const SKINS = ["#fbe3cf", "#f6d3b3", "#f3cba8", "#efc29a", "#e8b98d", "#e2a877", "#d49a6a", "#c98b5a", "#b57a4d", "#9a6340", "#8a5a3a", "#7a4a2e", "#5e3a24", "#4a2c1c"];
const HAIRS = ["#1a1a1a", "#1a1a1a", "#2a1d17", "#2a1d17", "#3b2a20", "#4a3123", "#5a3a2a", "#6b4226", "#8a5a3b", "#a0693a", "#b5452a", "#a8431f", "#c68e3f", "#e2b93b", "#f0d27a", "#e8dcb0", "#8c8c8c", "#cfcfcf", "#f2f2f2"];
const SECONDS = ["#f2d44a", "#d9a82e", "#ece8de", "#3d5a8c", "#1f3a5f", "#8fb8d8", "#5b7fa6", "#e07a2f", "#c8672a", "#d9d2c3", "#f4f4f4", "#8fae7a", "#2f5d3a", "#b79ac4", "#7a2e3a", "#3f8f8c", "#4a4f57", "#c9b99a"];
const TROUSERS = ["#2c3550", "#1f2a44", "#4a6fa5", "#6f93bf", "#8a7a5c", "#b5a47a", "#d8cfb8", "#3b3b3b", "#262626", "#44484f", "#6b4a3a", "#556b4a", "#9a9aa6", "#7a2e3a"];
const SKIRTS = ["#262626", "#1f2a44", "#44484f", "#6b4a3a", "#b5a47a", "#7a2e3a", "#556b4a", "#4a6fa5", "#8a8f98", "#5a3a5a"];
const SHIRTS = ["#f4f4f4", "#f4f4f4", "#f4f4f4", "#dce9f5", "#f3ecd8", "#f6dde0", "#e3e6ea", "#d8e6d4"];
const TIES = ["#c4242b", "#7a1f2b", "#1f6fb0", "#1f2f5a", "#e0b020", "#2a8a4a", "#2f6f73", "#7a3a9a", "#e07a2f", "#5a1f2f"];
const HATS = ["#c4242b", "#7a1f2b", "#2f4f8a", "#1f2f5a", "#2a8a4a", "#2f5d3a", "#e07a2f", "#d9a82e", "#f2d44a", "#6b4226", "#ece8de", "#8a8f96", "#1a1a1a", "#3f8f8c"];
const SHOES = ["#1a1a1a", "#262626", "#4a3020", "#2e1d12", "#8a5a32", "#2a2f45", "#5a1f1f", "#ececec", "#6b6f76"];
const TIGHTS = ["#2a2a2a", "#1f2a44", "#7a2e3a", "#4a3326", "#6b6f76", "#2c3550"];
const LIPS = ["#c8202b", "#b83a4a", "#d4636b", "#a8324a", "#c97b84", "#d9806a"];
const BEARDS = ["#9a9a9a", "#cfcfcf", "#6b6b6b"];
const LETTERS = "KbBCMHJEZR";
const LEVELS = [0, 11, 22, 34, 46]; // flap angle in degrees: choppy on purpose, like cut paper on a pin
const INK = "#1a1a1a", BAG = "#b9a07a", RED = "#c8202b";

const hash = (s: string) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
function mulberry(a: number) {
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
/* mix a colour towards black (f < 0) or white (f > 0) */
const shade = (hex: string, f: number) => {
  const n = parseInt(hex.slice(1), 16);
  return "#" + [n >> 16, n >> 8 & 255, n & 255].map(c => Math.round(f < 0 ? c * (1 + f) : c + (255 - c) * f).toString(16).padStart(2, "0")).join("");
};
const light = (hex: string) => { const n = parseInt(hex.slice(1), 16); return (n >> 16) * 0.3 + (n >> 8 & 255) * 0.59 + (n & 255) * 0.11 > 150; };

export const randomSeed = () => Math.random().toString(36).slice(2, 10);

/* The seed is the voice's look seed (or its name); `main` (the voice's colour) becomes the main garment. */
export function lookFor(seed: string, main: string): Look {
  const r = mulberry(hash(seed));
  const pick = <T,>(a: readonly T[]) => a[Math.floor(r() * a.length)];
  const range = (a: number, b: number) => Math.round((a + r() * (b - a)) * 10) / 10;
  const chance = (p: number) => r() < p;
  const fem = chance(0.45);
  const outfit = pick<Look["outfit"]>(fem
    ? ["sweater", "sweater", "tee", "tee", "dress", "dress", "suit", "flannel", "jersey", "jacket", "gown"]
    : ["suit", "suit", "shirt", "tee", "tee", "jacket", "serge", "western", "mime", "overalls", "flannel", "flannel", "jersey", "sweater"]);
  const mime = outfit === "mime";
  let hairStyle = mime ? "crop" : pick<Look["hairStyle"]>(fem ? ["bob", "bob", "long", "long", "bun", "side", "crop"] : ["bald", "tuft", "crop", "crop", "side", "side", "quiff", "sides"]);
  const hat: Look["hat"] =
    outfit === "gown" ? (chance(0.8) ? "veil" : "none") :
    outfit === "serge" ? (chance(0.7) ? "mountie" : "none") :
    outfit === "western" ? (chance(0.7) ? "cowboy" : "none") :
    mime ? "beret" :
    outfit === "overalls" && chance(0.5) ? "cap" :
    chance(0.05) ? "bag" : chance(0.12) ? "toque" : chance(0.08) ? "cap" : "none";
  if (hat !== "none" && hat !== "veil" && (hairStyle === "quiff" || hairStyle === "tuft" || hairStyle === "bun")) hairStyle = "crop";
  const prop: Look["prop"] =
    outfit === "overalls" ? (chance(0.7) ? "rod" : "none") :
    outfit === "jersey" ? (chance(0.6) ? "stick" : "none") :
    chance(0.12) ? "coffee" : chance(0.06) ? "flag" : "none";
  const hairCol = pick(HAIRS);
  return {
    skin: mime ? "#f8f4ee" : pick(SKINS), main, second: pick(SECONDS), hair: mime ? INK : hairCol,
    trousers: pick(TROUSERS), tie: pick(TIES), shoes: pick(SHOES),
    hatCol: pick(HATS), hatCol2: pick(SECONDS),
    hw: range(74, 88), hh: range(90, 104), rTop: range(6, 18), rBot: range(10, 26), taper: range(0, 7),
    mouthAt: range(0.57, 0.65), fringe: range(0.16, 0.27),
    tw: range(70, 84), th: range(78, 92), eyeGap: range(15, 24), eyeY: range(0.33, 0.4),
    hairStyle, fringeCut: pick<Look["fringeCut"]>(["straight", "bangs", "parted", "swept"]),
    brows: pick<Look["brows"]>(fem ? ["none", "none", "none", "none", "worried"] : ["none", "none", "angry", "angry", "worried", "flat"]),
    lashes: fem || mime, lips: fem ? chance(0.9) : mime,
    facial: fem || mime ? "none" : pick<Look["facial"]>(["none", "none", "none", "moustache", "moustache", "goatee", "beard"]),
    glasses: chance(0.2) ? pick<Look["glasses"]>(["round", "square"]) : "none",
    hat, outfit,
    skirt: outfit === "dress" || outfit === "gown" || (fem && ["sweater", "tee", "jacket", "suit"].includes(outfit) && chance(0.65)),
    tights: chance(0.3) ? pick(TIGHTS) : "",
    longSleeves: chance(0.5), letter: chance(0.6) ? pick(LETTERS.split("")) : "", number: 2 + Math.floor(r() * 97),
    prop, fish: outfit === "overalls" && chance(0.7),
    // drawn last, so adding colours doesn't disturb anything chosen above
    shirt: pick(SHIRTS), lip: pick(LIPS), skirtCol: pick(SKIRTS), beard: chance(0.25) ? pick(BEARDS) : hairCol,
  };
}

let uid = 0;
function build(k: Look, flip: boolean) {
  const dir = flip ? -1 : 1, id = "ch" + (++uid);
  const bag = k.hat === "bag";
  const hw = bag ? k.hw + 10 : k.hw, hh = bag ? k.hh + 12 : k.hh, top = bag ? 34 : 40;
  const L = 100 - hw / 2, R = 100 + hw / 2, bot = top + hh, m = top + hh * k.mouthAt;
  const tp = bag ? 0 : k.taper, rT = bag ? 3 : k.rTop, rB = bag ? 3 : Math.min(k.rBot, bot - m - 2);
  // the head is an oval (the paper bag keeps its boxy shape): a chord through the ellipse at the mouth line splits it into the lid and the jaw
  const oval = !bag, cy = top + hh / 2, rx = hw / 2, ry = hh / 2;
  const chord = (y: number) => rx * Math.sqrt(Math.max(0, 1 - ((y - cy) / ry) ** 2)); // half the head's width at height y
  const xl = (y: number) => oval ? 100 - chord(y) : L + tp * (y - top) / hh, xr = (y: number) => oval ? 100 + chord(y) : R - tp * (y - top) / hh;
  const Lb = L + tp, Rb = R - tp;
  const upper = oval ? `M${xl(m)},${m} A${rx},${ry} 0 ${m > cy ? 1 : 0} 1 ${xr(m)},${m} Z`
    : `M${xl(m)},${m} L${L},${top + rT} Q${L},${top} ${L + rT},${top} H${R - rT} Q${R},${top} ${R},${top + rT} L${xr(m)},${m} Z`;
  const jaw = (y: number) => oval ? `A${rx},${ry} 0 ${y > cy ? 0 : 1} 0 ${xr(y)},${y}`
    : `L${Lb},${bot - rB} Q${Lb},${bot} ${Lb + rB},${bot} H${Rb - rB} Q${Rb},${bot} ${Rb},${bot - rB} L${xr(y)},${y}`;
  const lower = `M${xl(m)},${m} ${jaw(m)} Z`;

  // ---- body ----
  const o = k.outfit, FOOT = 284;
  const sy = bot - 8, tl = 100 - k.tw / 2, tr = 100 + k.tw / 2, th = k.th, hip = sy + th;
  const aw = 14, al = th - 8, ay = sy + 4, ax = [tl - aw + 3, tr - 3];
  const hands = ax.map(x => [x + aw / 2, ay + al + 3]);
  let top2 = k.main, sleeve = k.main, sleeveLen = al - 10, legCol = k.trousers, handCol = k.skin, shoeH = 10;
  let torso = "", legsOver = "", skirt = "", defs = "";
  const rect = (x: number, y: number, w: number, h: number, fill: string, extra = "") => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" ${extra}/>`;
  const text = (s: string | number, x: number, y: number, size: number, fill: string) => `<text class="ns" x="${x}" y="${y}" font-size="${size}" text-anchor="middle" fill="${fill}">${s}</text>`;
  const tie = `<path d="M96,${sy + 6} H104 L103,${sy + 12} L106,${sy + 44} L100,${sy + 52} L94,${sy + 44} L97,${sy + 12} Z" fill="${k.tie}"/>`;
  const vneck = (fill: string, depth: number) => `<path d="M88,${sy} L100,${sy + depth} L112,${sy} Z" fill="${fill}"/>`;
  const body = (fill: string) => rect(tl, sy, k.tw, th, fill); // body parts are hard-edged, no rounded corners
  const chestLetter = (fill: string) => k.letter ? text(k.letter, 100, sy + th * 0.62, 30, light(fill) ? INK : "#fff") : "";
  const belt = (y: number, col: string, buckle = "#d9b23a") => rect(tl, y, k.tw, 7, col) + rect(96, y - 1, 8, 9, buckle, `rx="1.5"`);

  if (o === "suit") {
    torso = body(k.main) + vneck(k.shirt, 34) + tie + `<path d="M87,${sy} L98,${sy + 46} M113,${sy} L102,${sy + 46} M100,${sy + 46} V${hip}" fill="none" style="stroke-width:1.6"/>`;
  } else if (o === "shirt") {
    torso = body(k.main) + vneck(shade(k.main, -0.12), 14) + tie + rect(tr - 24, sy + 24, 14, 12, "none", `style="stroke-width:1.4"`);
  } else if (o === "tee") {
    sleeveLen = 26; torso = body(k.main) + chestLetter(k.main);
  } else if (o === "jacket") {
    top2 = k.second;
    torso = body(k.second) + chestLetter(k.second) + rect(tl, sy, 100 - 10 - tl, th, k.main) + rect(110, sy, tr - 110, th, k.main);
  } else if (o === "serge") {
    sleeve = top2 = RED; legCol = "#1d2a5a";
    torso = body(RED) + rect(tl + 2, sy + 4, k.tw - 4, 10, "#1d2a5a") + `<path d="M${tl + 4},${sy + 6} L${tr - 4},${hip - 18} L${tr - 4},${hip - 8} L${tl + 4},${sy + 18} Z" fill="#2f4f9a"/>`
      + `<path d="M${tl + 4},${sy + 10} L${tr - 4},${hip - 13}" style="stroke:#e8c33c;stroke-width:2.5"/>`
      + [0, 1, 2, 3].map(i => `<circle cx="100" cy="${sy + 22 + i * 13}" r="2.6" fill="#e8c33c" style="stroke-width:1"/>`).join("")
      + rect(tl, hip - 16, k.tw, 8, "#5a3a1e") + rect(tl - 6, sy, 12, 6, "#e8c33c", `rx="2"`) + rect(tr - 6, sy, 12, 6, "#e8c33c", `rx="2"`);
    legsOver = [84, 101].map(x => rect(x + 6, hip, 3, FOOT - hip - 4, "#e8c33c", `class="ns"`)).join("");
  } else if (o === "western") {
    legCol = "#4a6fa5";
    torso = body(k.main) + `<path d="M${tl},${sy + 16} L100,${sy + 26} L${tr},${sy + 16}" fill="none" style="stroke:${shade(k.main, 0.5)};stroke-width:2"/>`
      + `<path class="ns" d="M${tl + 18},${sy + 28} l2.4,5 5.4,.6 -4,3.7 1.1,5.3 -4.9,-2.7 -4.9,2.7 1.1,-5.3 -4,-3.7 5.4,-.6Z" fill="#e8c33c"/>`
      + belt(hip - 14, "#5a3a1e");
  } else if (o === "mime") {
    sleeve = top2 = "#f6f6f6"; handCol = "#ffffff"; legCol = "#f6f6f6";
    torso = body("#f6f6f6") + `<path d="M${tl + 14},${sy} V${hip} M${tr - 14},${sy} V${hip}" style="stroke:${INK};stroke-width:6"/>`;
    legsOver = rect(tl + 4, hip - 6, k.tw - 8, 26, INK)
      + [84, 101].map(x => [0, 1, 2, 3].map(i => rect(x, hip + 28 + i * 12, 15, 6, INK, `class="ns"`)).join("")).join("");
  } else if (o === "overalls") {
    sleeve = top2 = k.second; sleeveLen = k.longSleeves ? al - 10 : 26; legCol = k.main; shoeH = 16;
    torso = body(k.second) + rect(tl + 6, sy + 26, k.tw - 12, th - 26, k.main) + rect(tl + 4, hip - 8, k.tw - 8, 10, k.main)
      + `<path d="M${tl + 10},${sy + 28} V${sy} M${tr - 10},${sy + 28} V${sy}" style="stroke:${k.main};stroke-width:7"/>`
      + rect(90, sy + 34, 20, 16, "none", `style="stroke-width:1.4"`)
      + `<circle cx="${tl + 10}" cy="${sy + 30}" r="2.5" fill="#e8c33c" style="stroke-width:1"/><circle cx="${tr - 10}" cy="${sy + 30}" r="2.5" fill="#e8c33c" style="stroke-width:1"/>`;
  } else if (o === "flannel") {
    const d = shade(k.main, -0.35);
    defs = `<pattern id="${id}" width="18" height="18" patternUnits="userSpaceOnUse"><g class="ns"><rect width="18" height="18" fill="${k.main}"/>`
      + `<rect width="7" height="18" fill="${d}" opacity=".55"/><rect width="18" height="7" fill="${d}" opacity=".55"/><rect x="12" width="1.6" height="18" fill="${k.second}" opacity=".5"/></g></pattern>`;
    sleeve = top2 = `url(#${id})`;
    torso = body(top2) + `<path d="M100,${sy + 8} V${hip}" style="stroke-width:1.4"/>` + vneck(shade(k.main, -0.2), 12);
  } else if (o === "jersey") {
    const s = light(k.main) ? shade(k.main, -0.6) : k.second;
    torso = body(k.main) + rect(tl, hip - 30, k.tw, 8, s, `class="ns"`) + rect(tl, hip - 18, k.tw, 8, s, `class="ns"`)
      + vneck(s, 14) + text(k.number, 100, sy + 48, 24, s);
    legsOver = "";
  } else if (o === "sweater") {
    sleeveLen = k.longSleeves ? al - 10 : 22;
    torso = body(k.main) + `<ellipse cx="91" cy="${sy + 11}" rx="10" ry="6" fill="#fff"/><ellipse cx="109" cy="${sy + 11}" rx="10" ry="6" fill="#fff"/>`
      + rect(tl, hip - 8, k.tw, 8, shade(k.main, -0.15));
  } else if (o === "dress") {
    sleeveLen = 22;
    torso = body(k.main) + rect(tl, hip - 14, k.tw, 7, k.second);
  } else { // gown
    sleeveLen = 0; top2 = "#fbfbfb";
    torso = body("#fbfbfb") + `<path d="M${tl},${sy + 12} Q100,${sy + 22} ${tr},${sy + 12} V${sy} H${tl} Z" fill="${k.skin}"/>` + rect(tl, hip - 14, k.tw, 6, "#e9e4d8");
  }
  if (k.skirt) {
    const gown = o === "gown", hem = gown ? FOOT - 6 : hip + (o === "dress" ? 44 : 36), flare = gown ? 34 : o === "dress" ? 18 : 12;
    const col = o === "dress" ? k.main : gown ? "#fbfbfb" : k.skirtCol;
    skirt = `<path d="M${tl + 2},${hip - 10} H${tr - 2} L${tr + flare},${hem} H${tl - flare} Z" fill="${col}"/>`;
    legCol = k.tights || k.skin;
  }
  const leg = (x: number) => rect(x, hip - 4, 15, FOOT - hip, legCol) + rect(x - 3, FOOT - shoeH, 21, shoeH + 2, k.shoes);
  const arm = (x: number) => rect(x, ay, aw, al, k.skin) + (sleeveLen ? rect(x, ay, aw, sleeveLen, sleeve) : "")
    + (o === "jersey" ? rect(x, ay + sleeveLen - 14, aw, 6, light(k.main) ? shade(k.main, -0.6) : k.second, `class="ns"`) : "");
  const hand = ([x, y]: number[]) => `<circle cx="${x}" cy="${y}" r="7.5" fill="${handCol}"/>`;
  const pivots = ax.map(x => [x + aw / 2, ay + 5]);

  // ---- things to hold: the main prop goes in the outer hand, a fish in the inner one ----
  const [ox, oy] = hands[flip ? 1 : 0], [ix, iy] = hands[flip ? 0 : 1], out = flip ? 1 : -1;
  let props = "", inner = "";
  if (k.prop === "rod") props += `<path d="M${ox},${oy - 140} V${oy + 44}" style="stroke:#4a4a4a;stroke-width:3.5"/><path d="M${ox},${oy - 140} q${out * 8},50 ${out * 4},110" fill="none" style="stroke:#666;stroke-width:.8"/><circle cx="${ox - out * 6}" cy="${oy + 20}" r="5" fill="#cfcfcf" style="stroke-width:1.5"/>`;
  if (k.prop === "stick") props += `<path d="M${ox - out * 6},${oy - 70} L${ox + out * 6},${FOOT - 8}" style="stroke:${INK};stroke-width:7;stroke-linecap:round"/><path d="M${ox - out * 6},${oy - 70} L${ox + out * 6},${FOOT - 8}" style="stroke:#d2a868;stroke-width:4;stroke-linecap:round"/><path d="M${ox + out * 6},${FOOT - 8} h${out * 30}" style="stroke:${INK};stroke-width:7;stroke-linecap:round"/>`;
  if (k.prop === "coffee") props += `<path d="M${ox - 8},${oy - 18} H${ox + 8} L${ox + 6},${oy + 8} H${ox - 6} Z" fill="${RED}"/>` + rect(ox - 9, oy - 23, 18, 6, "#fff", `rx="2"`);
  if (k.prop === "flag") props += `<path d="M${ox},${oy + 6} V${oy - 80}" style="stroke:#6b4226;stroke-width:3"/>` + `<g transform="translate(${ox + (out < 0 ? -40 : 0)},${oy - 80})">`
    + rect(0, 0, 40, 22, "#fff") + `<g class="ns">${rect(0.5, 0.5, 10, 21, RED)}${rect(29.5, 0.5, 10, 21, RED)}<path d="M20,4 l1.6,3.4 2.6,-1 -.8,4 3,.6 -2.6,2.2 .8,1.6 -3.4,-.4 .2,3.6 h-2.8 l.2,-3.6 -3.4,.4 .8,-1.6 -2.6,-2.2 3,-.6 -.8,-4 2.6,1Z" fill="${RED}"/></g></g>`;
  if (k.fish) inner += `<g transform="translate(${ix},${iy})"><path d="M0,4 l-7,-9 h14 Z" fill="#9fb0bb"/><ellipse cx="0" cy="28" rx="8" ry="22" fill="#c3cfd7"/><path d="M-5,40 q5,6 10,0" fill="none" style="stroke-width:1.5"/><circle class="ns" cx="${dir * 2.5}" cy="42" r="1.6" fill="${INK}"/></g>`;

  // each arm swings from the shoulder with whatever its hand holds
  const outerI = flip ? 1 : 0, held = [0, 1].map(i => i === outerI ? props : inner);
  const arms = [0, 1].map(i => `<g class="arm">${arm(ax[i])}${held[i]}${hand(hands[i])}</g>`).join("");
  const armMax = [0, 1].map(i => held[i] ? 18 : 110); // something in the hand keeps that arm low

  // ---- hair: a back layer that stays put and a front layer that flaps with the head ----
  let hairBack = "", hairLift = "", hairFront = "";
  const fr = top + hh * k.fringe, Lf = xl(fr) - 3, Rf = xr(fr) + 3; // where the hairline meets the sides of the head
  const edges: Record<Look["fringeCut"], string> = {
    straight: `L${Lf},${fr}`,
    bangs: `Q${100 + hw * 0.25},${fr + 6} 100,${fr} Q${100 - hw * 0.25},${fr + 6} ${Lf},${fr}`,
    parted: `Q${100 + hw * 0.18},${top + 6} 100,${top + 2} Q${100 - hw * 0.18},${top + 6} ${Lf},${fr + 4}`,
    swept: `Q${R - 8},${top + 4} ${100 + dir * hw * 0.22},${top + 3} Q${100 - dir * hw * 0.1},${fr} ${Lf},${fr + 8}`,
  };
  const cap = (cut: Look["fringeCut"]) => oval
    ? `<path d="M${Lf},${fr} A${rx + 3},${ry + 3} 0 0 1 ${Rf},${fr} ${edges[cut]} Z" fill="${k.hair}"/>` // hair over the curve of the head
    : `<path d="M${L - 3},${fr} V${top + rT} Q${L - 3},${top - 5} ${L + rT},${top - 5} H${R - rT} Q${R + 3},${top - 5} ${R + 3},${top + rT} V${fr} ${edges[cut]} Z" fill="${k.hair}"/>`;
  const hs = bag ? "bald" : k.hairStyle;
  if (hs === "crop") hairFront = cap(k.fringeCut === "parted" ? "straight" : k.fringeCut);
  if (hs === "side") hairFront = cap("swept");
  if (hs === "quiff") hairFront = cap("straight") + `<path d="M${xl(top + 8) - 3},${top + 8} Q${xl(top + 8) - 4},${top - 24} 100,${top - 22} Q${xr(top + 8) + 12},${top - 26} ${xr(top + 8) + 5},${top + 6} Q100,${top - 4} ${xl(top + 8) - 3},${top + 8} Z" fill="${k.hair}"/>`;
  if (hs === "tuft") hairFront = `<path d="M90,${top + 1} l3,-15 l5,10 l4,-16 l4,15 l5,-11 l2,17 Z" fill="${k.hair}"/>`;
  if (hs === "sides") hairFront = [xl(top + hh * 0.3) - 4, xr(top + hh * 0.3) - 4].map(x => rect(x, top + hh * 0.18, 8, hh * 0.3, k.hair)).join("");
  if (hs === "bob" || hs === "long" || hs === "bun") {
    if (hs !== "bun") { // cut at the mouth line: the top lifts off with the head, the rest stays on the shoulders
      const end = hs === "long" ? sy + 40 : m + 18;
      hairLift = oval ? `<path d="M${xl(m) - 9},${m} A${rx + 9},${ry + 8} 0 1 1 ${xr(m) + 9},${m} Z" fill="${k.hair}"/>`
        : `<path d="M${L - 8},${m} V${top + 10} Q${L - 8},${top - 6} ${L + 8},${top - 6} H${R - 8} Q${R + 8},${top - 6} ${R + 8},${top + 10} V${m} Z" fill="${k.hair}"/>`;
      hairBack = `<path d="M${L - 8},${m} V${end - 16} Q${L - 8},${end} ${L + 8},${end} H${R - 8} Q${R + 8},${end} ${R + 8},${end - 16} V${m} Z" fill="${k.hair}"/>`;
    }
    hairFront = (hs === "bun" ? `<circle cx="100" cy="${top - 10}" r="13" fill="${k.hair}"/>` : "") + cap(k.fringeCut === "swept" ? "swept" : k.fringeCut === "straight" ? "bangs" : k.fringeCut);
  }
  if (k.hat === "veil") hairBack = `<path d="M${L + 6},${top - 4} L${L - 22},${hip + 40} H${R + 22} L${R - 6},${top - 4} Z" fill="#ffffff" opacity=".8" style="stroke:#c9c9c9;stroke-width:1.2"/>` + hairBack;

  // ---- face ----
  const ey = top + hh * k.eyeY, exs = [100 - k.eyeGap / 2, 100 + k.eyeGap / 2];
  let eyes = bag
    ? exs.map(x => `<ellipse class="ns" cx="${x}" cy="${ey + 4}" rx="3.6" ry="4.6" fill="${INK}"/>`).join("")
    : exs.map(x => `<ellipse cx="${x}" cy="${ey}" rx="4.2" ry="5.2" fill="#fff" style="stroke-width:1.3"/><ellipse class="ns" cx="${x + dir * 1.3}" cy="${ey + 0.8}" rx="1.9" ry="2.8" fill="${INK}"/>`).join("");
  if (k.lashes && !bag) eyes += exs.map(x => `<path d="M${x - 3},${ey - 4.4} l-2.2,-3 M${x},${ey - 5.2} v-3.6 M${x + 3},${ey - 4.4} l2.2,-3" fill="none" style="stroke-width:1.3"/>`).join("");
  let face = "";
  if (!bag && k.brows !== "none") face += exs.map((x, i) => {
    const s = i ? 1 : -1, by = ey - 10, tilt = k.brows === "angry" ? 3 : k.brows === "worried" ? -3 : 0;
    return `<path d="M${x + s * 6},${by - tilt} L${x - s * 5},${by + tilt}" fill="none" style="stroke-width:2.4;stroke-linecap:round"/>`;
  }).join("");
  if (!bag && k.glasses !== "none") {
    const lens = (x: number) => k.glasses === "round" ? `<circle cx="${x}" cy="${ey}" r="8.5" fill="#fff" fill-opacity=".2" style="stroke-width:1.8"/>` : `<rect x="${x - 9}" y="${ey - 7}" width="18" height="14" rx="2.5" fill="#fff" fill-opacity=".2" style="stroke-width:1.8"/>`;
    face += lens(exs[0]) + lens(exs[1]) + `<path d="M${exs[0] + 8.5},${ey} H${exs[1] - 8.5} M${exs[0] - 8.5},${ey} H${xl(ey)} M${exs[1] + 8.5},${ey} H${xr(ey)}" fill="none" style="stroke-width:1.8"/>`;
  }
  const facial = bag ? "none" : k.facial;
  const mous = facial === "moustache" || facial === "goatee" ? `<path d="M86,${m - 1} Q87,${m - 10} 100,${m - 8} Q113,${m - 10} 114,${m - 1} Q100,${m - 5} 86,${m - 1} Z" fill="${k.beard}"/>` : "";
  let chin = "";
  if (facial === "goatee") chin = `<path d="M92,${m + 4} H108 L106,${bot + 2} Q100,${bot + 6} 94,${bot + 2} Z" fill="${k.beard}"/>`;
  const by = m + (bot - m) * 0.3; // a beard hugs the jaw and leaves skin under the mouth, so the jaw still reads as a face
  if (facial === "beard") chin = `<path d="M${xl(by)},${by} ${jaw(by)} Q100,${by + (bot - by) * 0.6} ${xl(by)},${by} Z" fill="${k.beard}"/>`;
  const lipsUp = k.lips && !bag ? `<path d="M92,${m} A8,4.5 0 0 1 108,${m}Z" fill="${k.lip}"/>` : "";
  const lipsLo = k.lips && !bag ? `<path d="M92,${m} A8,5.5 0 0 0 108,${m}Z" fill="${k.lip}"/>` : "";
  const crinkle = bag ? `<path d="M${L},${top + 1} ${Array.from({length: 8}, (_, i) => `L${L + hw * (i + 0.5) / 8},${top - 5 + (i % 2) * 3} L${L + hw * (i + 1) / 8},${top + 1}`).join(" ")} Z" fill="${BAG}"/>` : "";

  // ---- hats ----
  const hc = k.hatCol, band = top + hh * 0.2, BL = xl(band) - 4, BR = xr(band) + 4; // hats hug the head at the hat line
  let hat = "";
  if (k.hat === "toque") hat = `<path d="M${BL},${band} V${top + 2} Q${BL},${top - 22} 100,${top - 22} Q${BR},${top - 22} ${BR},${top + 2} V${band} Z" fill="${hc}"/>`
    + rect(BL + 3, top - 8, BR - BL - 6, 6, k.hatCol2, `class="ns"`) + rect(BL - 2, band - 10, BR - BL + 4, 13, shade(hc, -0.25), `rx="3"`) + `<circle cx="100" cy="${top - 24}" r="8" fill="${k.hatCol2}"/>`;
  if (k.hat === "cap") hat = `<path d="M${BL},${band} V${top + 2} Q${BL},${top - 18} 100,${top - 18} Q${BR},${top - 18} ${BR},${top + 2} V${band} Z" fill="${hc}"/>`
    + `<path d="M${100 - hw * 0.28},${band} V${top} Q${100 - hw * 0.28},${top - 15} 100,${top - 15} Q${100 + hw * 0.28},${top - 15} ${100 + hw * 0.28},${top} V${band} Z" fill="#f4f4f4"/>`
    + (k.letter ? text(k.letter, 100, top + 6, 16, hc) : "")
    + `<path d="M${BL - 3},${band} Q100,${band + 13} ${BR + 3},${band} Q100,${band + 4} ${BL - 3},${band} Z" fill="${shade(hc, -0.25)}"/>`;
  if (k.hat === "cowboy") {
    const c = "#8a5a32";
    hat = `<path d="M${100 - hw * 0.33},${top + 2} L${100 - hw * 0.3},${top - 28} Q${100 - hw * 0.15},${top - 34} 100,${top - 27} Q${100 + hw * 0.15},${top - 34} ${100 + hw * 0.3},${top - 28} L${100 + hw * 0.33},${top + 2} Z" fill="${c}"/>`
      + rect(100 - hw * 0.32, top - 8, hw * 0.64, 6, "#4a2e18", `class="ns"`)
      + `<path d="M${100 - hw * 0.8},${top - 6} Q${100 - hw * 0.7},${top + 6} 100,${top + 6} Q${100 + hw * 0.7},${top + 6} ${100 + hw * 0.8},${top - 6} Q${100 + hw * 0.6},${top - 2} 100,${top - 1} Q${100 - hw * 0.6},${top - 2} ${100 - hw * 0.8},${top - 6} Z" fill="${c}"/>`;
  }
  if (k.hat === "mountie") hat = `<path d="M${100 - hw * 0.32},${top} Q${100 - hw * 0.3},${top - 18} 100,${top - 34} Q${100 + hw * 0.3},${top - 18} ${100 + hw * 0.32},${top} Z" fill="#a87a46"/>`
    + `<path d="M100,${top - 34} V${top - 14} M${100 - hw * 0.12},${top - 22} L${100 - hw * 0.06},${top - 12} M${100 + hw * 0.12},${top - 22} L${100 + hw * 0.06},${top - 12}" fill="none" style="stroke-width:1.5"/>`
    + rect(100 - hw * 0.32, top - 6, hw * 0.64, 5, "#5a3a1e", `class="ns"`) + rect(100 - hw * 0.8, top - 2, hw * 1.6, 7, "#a87a46", `rx="3.5"`);
  if (k.hat === "beret") hat = `<path d="M${100 + dir * 8},${top - 10} q${dir * 4},-14 ${-dir * 2},-22 q${-dir * 6},-8 ${dir * 2},-16" fill="none" style="stroke-width:1.6"/>`
    + `<circle cx="${100 + dir * 8}" cy="${top - 50}" r="6" fill="${RED}"/><circle class="ns" cx="${100 + dir * 8}" cy="${top - 50}" r="2.2" fill="#f2d44a"/>`
    + `<ellipse cx="${100 - dir * 4}" cy="${top - 3}" rx="${hw * 0.54}" ry="9" fill="${INK}"/>`;
  if (k.hat === "veil") hat = `<path d="M${L + 10},${top + 1} Q100,${top - 12} ${R - 10},${top + 1}" fill="none" style="stroke:#d8d2c2;stroke-width:5;stroke-linecap:round"/>`;

  const hinge = flip ? xr(m) : xl(m);
  const svg = `<svg class="ch" viewBox="-20 -24 240 316" aria-hidden="true">${defs ? `<defs>${defs}</defs>` : ""}
  ${hairBack}
  ${leg(84)}${leg(101)}${legsOver}${skirt}
  ${arms}
  ${torso}
  <path d="${lower}" fill="${bag ? BAG : k.skin}"/>${chin}${lipsLo}
  <g class="flap" transform="rotate(0 ${hinge} ${m})">
    ${hairLift}<path d="${upper}" fill="${bag ? BAG : k.skin}"/>${crinkle}${hairFront}
    <g class="eyes">${eyes}</g>${face}${mous}${lipsUp}${hat}
  </g>
</svg>`;
  return { svg, hx: hinge, hy: m, pivots, armMax };
}

/* While they talk the top of the head jumps open by a different amount each syllable (you see right through
   the gap), and every so often the arms snap to a new gesture, South Park style: no tweening. */
export function createCharacter(host: HTMLElement, flip = false, clock?: () => number): Character {
  let flap: SVGGElement, arms: SVGGElement[] = [], hx = 55, hy = 88, level = 0;
  let pivots: number[][] = [], armMax = [110, 110], nextPose = 0, restT = 0, restAt = 0;
  const apply = () => {
    // the top of the head comes right off: it lifts clear of the jaw, drifts back and tips, all by a bit more or less each syllable
    const j = () => level ? 0.75 + Math.random() * 0.5 : 1;
    const a = LEVELS[level] * 0.6 * j(), lift = level * 7 * j(), back = level * 2.5 * j();
    flap.setAttribute("transform", `translate(${flip ? back : -back} ${-lift}) rotate(${(flip ? 1 : -1) * a} ${hx} ${hy})`);
  };
  /* angles are how far each arm swings out from the body, in degrees */
  const pose = (out: number[]) => arms.forEach((g, i) => {
    const a = Math.min(out[i], armMax[i]);
    g.setAttribute("transform", `rotate(${i ? -a : a} ${pivots[i][0]} ${pivots[i][1]})`);
  });
  const gesture = () => {
    const r = Math.random(), big = () => 35 + Math.random() * 75, small = () => Math.random() * 14;
    const lead = Math.random() < 0.65 ? (flip ? 0 : 1) : (flip ? 1 : 0); // usually the arm towards the other person
    const out = r < 0.2 ? [small(), small()] : r < 0.75 ? [0, 0].map((_, i) => i === lead ? big() : small()) : [20 + Math.random() * 40, 20 + Math.random() * 40];
    pose(out);
  };
  const draw = (look: Look) => {
    const b = build(look, flip); host.innerHTML = b.svg; hx = b.hx; hy = b.hy; pivots = b.pivots; armMax = b.armMax;
    flap = host.querySelector(".flap") as SVGGElement; arms = [...host.querySelectorAll<SVGGElement>(".arm")]; apply();
  };
  draw(lookFor("default", "#c98b5a"));
  return {
    el: host,
    setOpen(open) {
      // with a `clock` (video export) time is driven by the caller, so no timers and no reduced-motion opt-out
      const now = clock ? clock() : performance.now();
      if (open > 0.05){
        clearTimeout(restT); restT = 0; restAt = 0;
        if (now > nextPose && (clock || !still.matches)){ gesture(); nextPose = now + 350 + Math.random() * 650; }
      } else if (clock){
        if (!restAt) restAt = now + 600;
        else if (restAt > 0 && now >= restAt){ pose([0, 0]); nextPose = 0; restAt = -1; }
      } else if (!restT) restT = window.setTimeout(() => { pose([0, 0]); nextPose = 0; }, 600);
      const l = Math.max(0, Math.min(4, Math.round(open * 4)));
      if (l === level) return;
      level = l; apply();
    },
    setLook: draw,
  };
}
