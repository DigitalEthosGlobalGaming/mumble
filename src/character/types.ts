/* The shapes everything else agrees on: a person's `Look`, the drawing context `Ctx` that parts draw with,
   and the six kinds of part (outfit, hat, hair, prop, facial hair, glasses). To add a part you only need the
   types here and one file under parts/ (see parts/README.md). */

export type Rng = () => number;
export type Gender = "fem" | "masc";
/** A value that can differ per gender: `2`, or `{fem: 2, masc: 0}`. */
export type PerGender<T> = T | Partial<Record<Gender, T>>;
export type FringeCut = "straight" | "bangs" | "parted" | "swept";

/* Everything that makes one person look like themselves. Part ids are plain strings (see parts/). */
export interface Look {
  skin: string; main: string; second: string; hair: string; trousers: string; tie: string; shoes: string; hatCol: string; hatCol2: string;
  shirt: string; lip: string; skirtCol: string; beard: string;
  hw: number; hh: number; rTop: number; rBot: number; taper: number; mouthAt: number; fringe: number;
  tw: number; th: number; eyeGap: number; eyeY: number;
  fringeCut: FringeCut;
  brows: "none" | "angry" | "worried" | "flat"; lashes: boolean; lips: boolean;
  outfit: string; hat: string; hairStyle: string; facial: string; glasses: string;
  prop: string;   // held in the outer hand
  inner: string;  // held in the inner hand ("none" for nothing)
  skirt: boolean; tights: string; longSleeves: boolean; letter: string; number: number;
  /** Whatever a part's `roll` returned, keyed by the part's kind. Lets a part have its own random choices. */
  extra: Record<string, any>;
}
export interface Character { el: HTMLElement; setOpen(open: number): void; setLook(look: Look): void; setTilt(deg: number): void }

/* ---------------------------------------------------------------------------------------------------------
   Ctx: the geometry and helpers a part draws with. The viewBox is -20 -24 240 316 and the person is centred
   on x = 100. Every value is already worked out for this person, including the head shape and where the
   hands are, so a part only has to say what to draw.
   --------------------------------------------------------------------------------------------------------- */
export interface Ctx {
  k: Look; flip: boolean; dir: 1 | -1; id: string; // `id` is unique per drawing: use it for SVG <pattern>/<clipPath> ids
  // head: an oval, or a boxy head when a hat sets `box`
  boxed: boolean; hw: number; hh: number; top: number; L: number; R: number; bot: number; m: number; rT: number;
  cy: number; rx: number; ry: number; oval: boolean;
  /** Half the head's width at height y (use `xl(y)` / `xr(y)` for the left and right edge). */
  chord: (y: number) => number; xl: (y: number) => number; xr: (y: number) => number;
  /** SVG path segment running along the jaw to the right edge at height y (continue a path that is on the left edge). */
  jaw: (y: number) => string;
  // body
  FOOT: number; sy: number; tl: number; tr: number; th: number; hip: number; aw: number; al: number; ay: number; hands: number[][];
  // hands: the outer one holds `prop`, the inner one holds `inner`
  ox: number; oy: number; ix: number; iy: number; out: 1 | -1;
  // hair and hat geometry
  fr: number; Lf: number; Rf: number; band: number; BL: number; BR: number;
  /** A cap of hair over the head with the chosen fringe cut. */
  cap: (cut: FringeCut) => string;
  // face
  ey: number; exs: number[];
  // drawing helpers
  rect: (x: number, y: number, w: number, h: number, fill: string, extra?: string) => string;
  text: (s: string | number, x: number, y: number, size: number, fill: string) => string;
  body: (fill: string) => string;                    // the torso rectangle
  tie: string;                                        // a ready-drawn necktie
  vneck: (fill: string, depth: number) => string;
  chestLetter: (fill: string) => string;
  belt: (y: number, col: string, buckle?: string) => string;
  shade: (hex: string, f: number) => string;          // mix towards black (f < 0) or white (f > 0)
  light: (hex: string) => boolean;                    // is this colour light?
  INK: string; RED: string;
}

/* ---------------------------------------------------------------------------------------------------------
   Parts. Every part has a `kind`, a unique `id` (within its kind) and, optionally:
     weight  how many tickets it has in the random draw (a whole number, default 1; 0 keeps it out of the draw).
             Per gender if you like: `{fem: 2, masc: 0}`.
     order   its place in the draw list (lower first). Only matters for keeping old seeds stable; new parts can
             leave it out and are placed after the existing ones.
     roll    called once when a person is created, to make the part's own random choices. The result lands in
             `look.extra[kind]`, and the part reads it back as `c.k.extra[kind]` while drawing.
   NB adding a part to a random draw changes the odds, so seeds that used to land on one outfit may land on
   another. To keep one person exactly as they are, give them a `look` seed and don't add parts to its draw
   (or give the new part weight 0 and pick it by hand).
   --------------------------------------------------------------------------------------------------------- */
interface PartBase<K extends string> {
  kind: K; id: string; label?: string;
  weight?: PerGender<number>; order?: PerGender<number>;
  roll?: (r: Rng, look: Look) => unknown;
}

export interface OutfitDraw {
  torso: string;               // SVG, drawn over the legs and arms
  legsOver?: string;           // SVG drawn over the legs (stripes, shorts...)
  defs?: string;               // SVG <defs> content, e.g. a pattern (use c.id in its id)
  sleeve?: string;             // sleeve colour or `url(#pattern)`; default is the main colour
  sleeveLen?: number;          // 0 for sleeveless; default al - 10 (long)
  legCol?: string; handCol?: string; shoeH?: number;
}
export interface Outfit extends PartBase<"outfit"> {
  draw: (c: Ctx) => OutfitDraw;
  /** Whether a skirt goes over it: "always", "optional" (feminine people sometimes) or "never" (default). */
  skirt?: "always" | "optional" | "never";
  /** Where the hem of the skirt is, how much it flares and its colour. */
  skirtShape?: (c: Ctx) => {hem: number; flare: number; col: string};
  /** Extra SVG for each arm, at x. */
  armTrim?: (c: Ctx, x: number, sleeveLen: number) => string;
  /** Choose the hat for this outfit. Return a hat id (or "none"), or undefined to use the usual random hat. */
  hat?: (r: Rng) => string | undefined;
  /** Same for what they hold in the outer hand. */
  prop?: (r: Rng) => string | undefined;
  /** What they hold in the inner hand, e.g. a fish ("none" for nothing). */
  inner?: (r: Rng) => string;
  /** Parts of the person this outfit decides for itself (a mime always looks like a mime). These skip the random draw. */
  fixed?: { skin?: string; hair?: string; hairStyle?: string; lashes?: boolean; lips?: boolean; facial?: string };
}

export interface Hat extends PartBase<"hat"> {
  draw: (c: Ctx) => string;               // in front, on the head
  back?: (c: Ctx) => string;              // behind the whole person (a veil)
  headTop?: (c: Ctx) => string;           // on top of the head shape but under the hair
  /** Chance of this hat in the usual random draw (checked in `order`). Leave out for hats only certain outfits wear. */
  chance?: number;
  /** Swaps the oval head for a plain box (a paper bag): wider by dw, taller by dh, top edge at `top`, filled with `skin`. */
  box?: {dw: number; dh: number; top: number; skin: string};
  /** Whether tall hair (quiff, tuft, bun) can poke out under it. */
  allowsTallHair?: boolean;
}

export interface HairDraw { front?: string; lift?: string; back?: string }
export interface Hair extends PartBase<"hair"> {
  /** `front` flaps with the head, `lift` is the top layer of long hair that lifts off with it, `back` stays on the shoulders. */
  draw: (c: Ctx) => HairDraw;
  tall?: boolean;                          // sticks up, so a hat flattens it to a crop
}

export interface Prop extends PartBase<"prop"> {
  draw: (c: Ctx) => string;
  hand?: "outer" | "inner";                // default outer
  chance?: number;                         // as for hats: the usual random draw, checked in `order`
}

export interface Facial extends PartBase<"facial"> {
  draw: (c: Ctx) => {mous?: string; chin?: string};
}

export interface Glasses extends PartBase<"glasses"> {
  draw: (c: Ctx) => string;
}

export type Part = Outfit | Hat | Hair | Prop | Facial | Glasses;
export type PartKind = Part["kind"];
export interface PartOf { outfit: Outfit; hat: Hat; hair: Hair; prop: Prop; facial: Facial; glasses: Glasses }

/** Identity function that type-checks a part definition: `export default definePart({...})`. */
export const definePart = <T extends Part>(p: T): T => p;
