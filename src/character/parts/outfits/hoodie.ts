import {definePart} from "../../types";

/* Example of a new outfit that uses its own random choices (`roll`) and the geometry helpers.
   `weight: 0` keeps it out of the random draw so every existing seed still gives the same person; choose it by
   hand on the preview page (/preview.html), or change the weight to 1 to let it turn up (which reshuffles who
   gets which outfit for seeds that have not been given a fixed `look`). */
const POUCH = ["#d9d9d9", "#2f3b52", "#7a2e2e", "#3d5a40"];

export default definePart({
  kind: "outfit", id: "hoodie", label: "Hoodie", weight: 0,
  roll: r => ({pouch: POUCH[Math.floor(r() * POUCH.length)], stripe: r() < 0.5}),
  draw: ({k, sy, tl, hip, th, al, body, rect, vneck, shade}) => {
    const x = k.extra.outfit || {pouch: POUCH[0], stripe: false};     // absent when picked by hand rather than rolled
    return {
      sleeveLen: al - 10,
      torso: body(k.main)
        + vneck(shade(k.main, -0.3), 14)                               // the hood bunched at the neck
        + rect(tl + 10, hip - th * 0.4, k.tw - 20, th * 0.3, x.pouch)  // front pouch
        + (x.stripe ? rect(tl, sy + 20, k.tw, 5, "#fff") : ""),
    };
  },
});
