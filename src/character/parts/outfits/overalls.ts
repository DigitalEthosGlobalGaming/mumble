import {definePart} from "../../types";

/* Fishing overalls: a rod in one hand and, usually, the catch in the other. */
export default definePart({
  kind: "outfit", id: "overalls", weight: {masc: 1}, order: {masc: 8},
  hat: r => r() < 0.5 ? "cap" : undefined,        // undefined = fall back to the usual random hat
  prop: r => r() < 0.7 ? "rod" : "none",
  inner: r => r() < 0.7 ? "fish" : "none",
  draw: ({k, sy, tl, tr, th, hip, al, body, rect}) => ({
    sleeve: k.second, sleeveLen: k.longSleeves ? al - 10 : 26, legCol: k.main, shoeH: 16,
    torso: body(k.second) + rect(tl + 6, sy + 26, k.tw - 12, th - 26, k.main) + rect(tl + 4, hip - 8, k.tw - 8, 10, k.main)
      + `<path d="M${tl + 10},${sy + 28} V${sy} M${tr - 10},${sy + 28} V${sy}" style="stroke:${k.main};stroke-width:7"/>`
      + rect(90, sy + 34, 20, 16, "none", `style="stroke-width:1.4"`)
      + `<circle cx="${tl + 10}" cy="${sy + 30}" r="2.5" fill="#e8c33c" style="stroke-width:1"/><circle cx="${tr - 10}" cy="${sy + 30}" r="2.5" fill="#e8c33c" style="stroke-width:1"/>`,
  }),
});
