/* Rolls a person from a seed. The ORDER of the random draws below is what makes a seed always give the same
   person, so don't reorder them: add new choices at the end. */
import {hash, mulberry} from "./kit";
import {BEARDS, HAIRS, LETTERS, LIPS, SECONDS, SHIRTS, SHOES, SKIRTS, SKINS, TIES, TIGHTS, TROUSERS, HATS} from "./palettes";
import {chainPick, getPart, pickPart} from "./registry";
import type {FringeCut, Gender, Look, PartKind} from "./types";

const BROWS_FEM: Look["brows"][] = ["none", "none", "none", "none", "worried"];
const BROWS_MASC: Look["brows"][] = ["none", "none", "angry", "angry", "worried", "flat"];
const FRINGES: FringeCut[] = ["straight", "bangs", "parted", "swept"];
const GLASSES_RATE = 0.2;

/* The seed is the voice's look seed (or its name); `main` (the voice's colour) becomes the main garment. */
export function lookFor(seed: string, main: string): Look {
  const r = mulberry(hash(seed));
  const pick = <T,>(a: readonly T[]) => a[Math.floor(r() * a.length)];
  const range = (a: number, b: number) => Math.round((a + r() * (b - a)) * 10) / 10;
  const chance = (p: number) => r() < p;
  const fem = chance(0.45), g: Gender = fem ? "fem" : "masc";

  const outfit = pickPart("outfit", g, r);
  const fixed = outfit.fixed || {};
  let hairStyle = fixed.hairStyle ?? pickPart("hair", g, r).id;
  const hat = outfit.hat?.(r) ?? chainPick("hat", r);
  if (hat !== "none" && !getPart("hat", hat)?.allowsTallHair && getPart("hair", hairStyle)?.tall) hairStyle = "crop";
  const prop = outfit.prop?.(r) ?? chainPick("prop", r);
  const hairCol = pick(HAIRS);

  const look: Look = {
    skin: fixed.skin ?? pick(SKINS), main, second: pick(SECONDS), hair: fixed.hair ?? hairCol,
    trousers: pick(TROUSERS), tie: pick(TIES), shoes: pick(SHOES),
    hatCol: pick(HATS), hatCol2: pick(SECONDS),
    hw: range(74, 88), hh: range(90, 104), rTop: range(6, 18), rBot: range(10, 26), taper: range(0, 7),
    mouthAt: range(0.57, 0.65), fringe: range(0.16, 0.27),
    tw: range(70, 84), th: range(78, 92), eyeGap: range(15, 24), eyeY: range(0.33, 0.4),
    fringeCut: pick(FRINGES),
    brows: pick(fem ? BROWS_FEM : BROWS_MASC),
    lashes: fem || !!fixed.lashes, lips: fem ? chance(0.9) : !!fixed.lips,
    facial: fem || fixed.facial !== undefined ? fixed.facial ?? "none" : pickPart("facial", g, r).id,
    glasses: chance(GLASSES_RATE) ? pickPart("glasses", g, r).id : "none",
    hat, hairStyle, outfit: outfit.id,
    skirt: outfit.skirt === "always" || (outfit.skirt === "optional" && fem && chance(0.65)),
    tights: chance(0.3) ? pick(TIGHTS) : "",
    longSleeves: chance(0.5), letter: chance(0.6) ? pick(LETTERS.split("")) : "", number: 2 + Math.floor(r() * 97),
    prop, inner: outfit.inner?.(r) ?? "none",
    // drawn after everything above, so adding colours or parts' own choices doesn't disturb what came before
    shirt: pick(SHIRTS), lip: pick(LIPS), skirtCol: pick(SKIRTS), beard: chance(0.25) ? pick(BEARDS) : hairCol,
    extra: {},
  };
  // each chosen part's own random choices come last of all
  const chosen: [string, PartKind, string][] = [["outfit", "outfit", look.outfit], ["hat", "hat", look.hat], ["hair", "hair", look.hairStyle],
    ["facial", "facial", look.facial], ["glasses", "glasses", look.glasses], ["prop", "prop", look.prop], ["inner", "prop", look.inner]];
  for (const [key, kind, id] of chosen) {
    const part = getPart(kind, id);
    if (part?.roll) look.extra[key] = part.roll(r, look);
  }
  return look;
}

/* Which Look field holds each kind of part. */
const FIELD = {outfit: "outfit", hat: "hat", hair: "hairStyle", prop: "prop", facial: "facial", glasses: "glasses"} as const;

/** A copy of `look` wearing a different part. Keeps everything else the same and fixes up what the swap implies
    (a mime's fixed face, a skirt that goes with a dress, tall hair under a hat). Used by the preview page. */
export function withPart(look: Look, kind: PartKind, id: string): Look {
  const k: Look = {...look, extra: {...look.extra}};
  const part = getPart(kind, id);
  if (kind === "prop" && (part as any)?.hand === "inner") k.inner = id; else k[FIELD[kind]] = id;
  if (kind === "outfit") {
    const o = getPart("outfit", id), f = o?.fixed || {};
    if (f.skin) k.skin = f.skin; if (f.hair) k.hair = f.hair; if (f.hairStyle) k.hairStyle = f.hairStyle;
    if (f.lashes !== undefined) k.lashes = f.lashes; if (f.lips !== undefined) k.lips = f.lips; if (f.facial !== undefined) k.facial = f.facial;
    k.skirt = o?.skirt === "always";
  }
  if (k.hat !== "none" && !getPart("hat", k.hat)?.allowsTallHair && getPart("hair", k.hairStyle)?.tall) k.hairStyle = "crop";
  return k;
}
/** The same person stripped of hat, props, glasses and facial hair, so one part can be judged on its own. */
export const bare = (look: Look): Look => ({...look, hat: "none", prop: "none", inner: "none", glasses: "none", facial: "none", hairStyle: "crop", skirt: false});
