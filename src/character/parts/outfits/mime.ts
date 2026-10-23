import {definePart} from "../../types";

/* `fixed` is the part of a person this outfit decides for itself: a mime is always white-faced, in a beret, with no beard. */
export default definePart({
  kind: "outfit", id: "mime", weight: {masc: 1}, order: {masc: 7},
  hat: () => "beret",
  fixed: {skin: "#f8f4ee", hair: "#1a1a1a", hairStyle: "crop", lashes: true, lips: true, facial: "none"},
  draw: ({k, sy, tl, tr, hip, body, rect, INK}) => ({
    sleeve: "#f6f6f6", handCol: "#ffffff", legCol: "#f6f6f6",
    torso: body("#f6f6f6") + `<path d="M${tl + 14},${sy} V${hip} M${tr - 14},${sy} V${hip}" style="stroke:${INK};stroke-width:6"/>`,
    legsOver: rect(tl + 4, hip - 6, k.tw - 8, 26, INK)
      + [84, 101].map(x => [0, 1, 2, 3].map(i => rect(x, hip + 28 + i * 12, 15, 6, INK, `class="ns"`)).join("")).join(""),
  }),
});
