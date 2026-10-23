/* Builds the SVG for one person. This file knows the head, the body frame and the draw order; what any
   individual outfit, hat, hairstyle, prop, beard or pair of glasses looks like lives in parts/. */
import {BAG, INK, RED, light, shade} from "./kit";
import {getPart} from "./registry";
import type {Ctx, FringeCut, Look} from "./types";

let uid = 0;
export function build(k: Look, flip: boolean) {
  const dir = flip ? -1 : 1, id = "ch" + (++uid);
  const outfit = getPart("outfit", k.outfit) ?? getPart("outfit", "tee")!;
  const hatP = getPart("hat", k.hat), box = hatP?.box, boxed = !!box;

  // ---- head: an oval (a hat can swap it for a box, like a paper bag) ----
  const hw = box ? k.hw + box.dw : k.hw, hh = box ? k.hh + box.dh : k.hh, top = box ? box.top : 40;
  const L = 100 - hw / 2, R = 100 + hw / 2, bot = top + hh, m = top + hh * k.mouthAt;
  const tp = boxed ? 0 : k.taper, rT = boxed ? 3 : k.rTop, rB = boxed ? 3 : Math.min(k.rBot, bot - m - 2);
  // a chord through the ellipse at the mouth line splits it into the lid and the jaw
  const oval = !boxed, cy = top + hh / 2, rx = hw / 2, ry = hh / 2;
  const chord = (y: number) => rx * Math.sqrt(Math.max(0, 1 - ((y - cy) / ry) ** 2)); // half the head's width at height y
  const xl = (y: number) => oval ? 100 - chord(y) : L + tp * (y - top) / hh, xr = (y: number) => oval ? 100 + chord(y) : R - tp * (y - top) / hh;
  const Lb = L + tp, Rb = R - tp;
  const upper = oval ? `M${xl(m)},${m} A${rx},${ry} 0 ${m > cy ? 1 : 0} 1 ${xr(m)},${m} Z`
    : `M${xl(m)},${m} L${L},${top + rT} Q${L},${top} ${L + rT},${top} H${R - rT} Q${R},${top} ${R},${top + rT} L${xr(m)},${m} Z`;
  const jaw = (y: number) => oval ? `A${rx},${ry} 0 ${y > cy ? 0 : 1} 0 ${xr(y)},${y}`
    : `L${Lb},${bot - rB} Q${Lb},${bot} ${Lb + rB},${bot} H${Rb - rB} Q${Rb},${bot} ${Rb},${bot - rB} L${xr(y)},${y}`;
  const lower = `M${xl(m)},${m} ${jaw(m)} Z`;
  const headFill = box ? box.skin : k.skin;

  // ---- body frame ----
  const FOOT = 284;
  const sy = bot - 8, tl = 100 - k.tw / 2, tr = 100 + k.tw / 2, th = k.th, hip = sy + th;
  const aw = 14, al = th - 8, ay = sy + 4, ax = [tl - aw + 3, tr - 3];
  const hands = ax.map(x => [x + aw / 2, ay + al + 3]);
  const [ox, oy] = hands[flip ? 1 : 0], [ix, iy] = hands[flip ? 0 : 1], out = flip ? 1 : -1;

  const rect = (x: number, y: number, w: number, h: number, fill: string, extra = "") => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" ${extra}/>`;
  const text = (s: string | number, x: number, y: number, size: number, fill: string) => `<text class="ns" x="${x}" y="${y}" font-size="${size}" text-anchor="middle" fill="${fill}">${s}</text>`;
  const tie = `<path d="M96,${sy + 6} H104 L103,${sy + 12} L106,${sy + 44} L100,${sy + 52} L94,${sy + 44} L97,${sy + 12} Z" fill="${k.tie}"/>`;
  const vneck = (fill: string, depth: number) => `<path d="M88,${sy} L100,${sy + depth} L112,${sy} Z" fill="${fill}"/>`;
  const body = (fill: string) => rect(tl, sy, k.tw, th, fill); // body parts are hard-edged, no rounded corners
  const chestLetter = (fill: string) => k.letter ? text(k.letter, 100, sy + th * 0.62, 30, light(fill) ? INK : "#fff") : "";
  const belt = (y: number, col: string, buckle = "#d9b23a") => rect(tl, y, k.tw, 7, col) + rect(96, y - 1, 8, 9, buckle, `rx="1.5"`);

  // ---- hair and hat geometry ----
  const fr = top + hh * k.fringe, Lf = xl(fr) - 3, Rf = xr(fr) + 3; // where the hairline meets the sides of the head
  const edges: Record<FringeCut, string> = {
    straight: `L${Lf},${fr}`,
    bangs: `Q${100 + hw * 0.25},${fr + 6} 100,${fr} Q${100 - hw * 0.25},${fr + 6} ${Lf},${fr}`,
    parted: `Q${100 + hw * 0.18},${top + 6} 100,${top + 2} Q${100 - hw * 0.18},${top + 6} ${Lf},${fr + 4}`,
    swept: `Q${R - 8},${top + 4} ${100 + dir * hw * 0.22},${top + 3} Q${100 - dir * hw * 0.1},${fr} ${Lf},${fr + 8}`,
  };
  const cap = (cut: FringeCut) => oval
    ? `<path d="M${Lf},${fr} A${rx + 3},${ry + 3} 0 0 1 ${Rf},${fr} ${edges[cut]} Z" fill="${k.hair}"/>` // hair over the curve of the head
    : `<path d="M${L - 3},${fr} V${top + rT} Q${L - 3},${top - 5} ${L + rT},${top - 5} H${R - rT} Q${R + 3},${top - 5} ${R + 3},${top + rT} V${fr} ${edges[cut]} Z" fill="${k.hair}"/>`;
  const band = top + hh * 0.2, BL = xl(band) - 4, BR = xr(band) + 4; // hats hug the head at the hat line
  const ey = top + hh * k.eyeY, exs = [100 - k.eyeGap / 2, 100 + k.eyeGap / 2];

  const c: Ctx = {k, flip, dir, id, boxed, hw, hh, top, L, R, bot, m, rT, cy, rx, ry, oval, chord, xl, xr, jaw,
    FOOT, sy, tl, tr, th, hip, aw, al, ay, hands, ox, oy, ix, iy, out, fr, Lf, Rf, band, BL, BR, cap, ey, exs,
    rect, text, body, tie, vneck, chestLetter, belt, shade, light, INK, RED};

  // ---- body: the outfit decides the torso, sleeves and legs ----
  const od = outfit.draw(c);
  const sleeve = od.sleeve ?? k.main, sleeveLen = od.sleeveLen ?? al - 10, handCol = od.handCol ?? k.skin, shoeH = od.shoeH ?? 10;
  let legCol = od.legCol ?? k.trousers, skirt = "";
  if (k.skirt) {
    const s = outfit.skirtShape?.(c) ?? {hem: hip + 36, flare: 12, col: k.skirtCol};
    skirt = `<path d="M${tl + 2},${hip - 10} H${tr - 2} L${tr + s.flare},${s.hem} H${tl - s.flare} Z" fill="${s.col}"/>`;
    legCol = k.tights || k.skin;
  }
  const leg = (x: number) => rect(x, hip - 4, 15, FOOT - hip, legCol) + rect(x - 3, FOOT - shoeH, 21, shoeH + 2, k.shoes);
  const arm = (x: number) => rect(x, ay, aw, al, k.skin) + (sleeveLen ? rect(x, ay, aw, sleeveLen, sleeve) : "") + (outfit.armTrim?.(c, x, sleeveLen) ?? "");
  const hand = ([x, y]: number[]) => `<rect x="${x - 7}" y="${y - 7}" width="14" height="14" fill="${handCol}"/>`;
  const pivots = ax.map(x => [x + aw / 2, ay + 5]);

  // ---- things to hold: the main prop goes in the outer hand, the other in the inner one ----
  const propP = getPart("prop", k.prop), innerP = getPart("prop", k.inner);
  const props = propP ? propP.draw(c) : "", inner = innerP ? innerP.draw(c) : "";
  // each arm swings from the shoulder with whatever its hand holds
  const outerI = flip ? 1 : 0, held = [0, 1].map(i => i === outerI ? props : inner);
  const arms = [0, 1].map(i => `<g class="arm">${arm(ax[i])}${held[i]}${hand(hands[i])}</g>`).join("");
  const armMax = [0, 1].map(i => held[i] ? 18 : 110); // something in the hand keeps that arm low

  // ---- hair: a back layer that stays put and a front layer that flaps with the head ----
  const hairD = (boxed ? undefined : getPart("hair", k.hairStyle))?.draw(c) ?? {};
  const hairFront = hairD.front ?? "", hairLift = hairD.lift ?? "", hairBack = (hatP?.back?.(c) ?? "") + (hairD.back ?? "");

  // ---- face ----
  let eyes = boxed
    ? exs.map(x => `<ellipse class="ns" cx="${x}" cy="${ey + 4}" rx="3.6" ry="4.6" fill="${INK}"/>`).join("")
    : exs.map(x => `<ellipse cx="${x}" cy="${ey}" rx="4.2" ry="5.2" fill="#fff" style="stroke-width:1.3"/><ellipse class="ns" cx="${x + dir * 1.3}" cy="${ey + 0.8}" rx="1.9" ry="2.8" fill="${INK}"/>`).join("");
  if (k.lashes && !boxed) eyes += exs.map(x => `<path d="M${x - 3},${ey - 4.4} l-2.2,-3 M${x},${ey - 5.2} v-3.6 M${x + 3},${ey - 4.4} l2.2,-3" fill="none" style="stroke-width:1.3"/>`).join("");
  let face = "";
  if (!boxed && k.brows !== "none") face += exs.map((x, i) => {
    const s = i ? 1 : -1, by = ey - 10, tilt = k.brows === "angry" ? 3 : k.brows === "worried" ? -3 : 0;
    return `<path d="M${x + s * 6},${by - tilt} L${x - s * 5},${by + tilt}" fill="none" style="stroke-width:2.4;stroke-linecap:round"/>`;
  }).join("");
  const glassesP = boxed ? undefined : getPart("glasses", k.glasses);
  if (glassesP) face += glassesP.draw(c);
  const fd = (boxed ? undefined : getPart("facial", k.facial))?.draw(c) ?? {};
  const mous = fd.mous ?? "", chin = fd.chin ?? "";
  const lipsUp = k.lips && !boxed ? `<path d="M92,${m} A8,4.5 0 0 1 108,${m}Z" fill="${k.lip}"/>` : "";
  const lipsLo = k.lips && !boxed ? `<path d="M92,${m} A8,5.5 0 0 0 108,${m}Z" fill="${k.lip}"/>` : "";
  const headTop = hatP?.headTop?.(c) ?? "";
  const hat = hatP?.draw(c) ?? "";

  const hinge = flip ? xr(m) : xl(m);
  const svg = `<svg class="ch" viewBox="-20 -24 240 316" aria-hidden="true">${od.defs ? `<defs>${od.defs}</defs>` : ""}
  ${hairBack}
  ${leg(84)}${leg(101)}${od.legsOver ?? ""}${skirt}
  ${arms}
  ${od.torso}
  <g class="head"><path d="${lower}" fill="${headFill}"/>${chin}${lipsLo}
  <g class="flap" transform="rotate(0 ${hinge} ${m})">
    ${hairLift}<path d="${upper}" fill="${headFill}"/>${headTop}${hairFront}
    <g class="eyes">${eyes}</g>${face}${mous}${lipsUp}${hat}
  </g></g>
</svg>`;
  return { svg, hx: hinge, hy: m, by: bot, pivots, armMax };
}
