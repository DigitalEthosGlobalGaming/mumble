/* PART TEMPLATE. Copy this file into the folder for its kind (parts/outfits, hats, hair, props, facial or
   glasses), rename it, and edit. Files in parts/ are picked up automatically; files starting with `_` are not
   (use that for helpers shared by several parts). Delete what you do not need.

   This example is an outfit. Each kind's `draw` gets the same context `c` (see `Ctx` in ../types.ts for the
   full list) and returns SVG text:
     outfit   draw -> {torso, sleeveLen?, sleeve?, legsOver?, legCol?, handCol?, shoeH?, defs?}
     hat      draw -> SVG over the head;  back?, headTop?, box?, allowsTallHair?, chance?
     hair     draw -> {front?, lift?, back?};  tall?
     prop     draw -> SVG at the hand (c.ox, c.oy outer; c.ix, c.iy inner);  hand?, chance?
     facial   draw -> {mous?, chin?}
     glasses  draw -> SVG over the eyes (c.ey, c.exs) */
import {definePart} from "../types";

export default definePart({
  kind: "outfit",
  id: "template",       // unique within its kind
  label: "Template",    // shown on the preview page
  weight: 0,            // tickets in the random draw: 0 = never random (pick by hand), 1 = normal, 2 = twice as likely. {fem: 2, masc: 0} for per gender.
                        // NB turning this on for a new part reshuffles the outcome of existing seeds.
  // roll: r => ({stripe: r() < 0.5}),   // own random choices, read back as c.k.extra.outfit
  draw: ({k, body, chestLetter}) => ({
    sleeveLen: 26,      // 0 = sleeveless, leave out for long sleeves
    torso: body(k.main) + chestLetter(k.main),
  }),
});
