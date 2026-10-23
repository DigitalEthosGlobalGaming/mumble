import {definePart} from "../../types";

/* A wedding gown, with the veil four times in five. */
export default definePart({
  kind: "outfit", id: "gown", weight: {fem: 1}, order: {fem: 8}, skirt: "always",
  hat: r => r() < 0.8 ? "veil" : "none",
  skirtShape: ({FOOT}) => ({hem: FOOT - 6, flare: 34, col: "#fbfbfb"}),
  draw: ({k, sy, tl, tr, hip, body, rect}) => ({
    sleeveLen: 0,
    torso: body("#fbfbfb") + `<path d="M${tl},${sy + 12} Q100,${sy + 22} ${tr},${sy + 12} V${sy} H${tl} Z" fill="${k.skin}"/>` + rect(tl, hip - 14, k.tw, 6, "#e9e4d8"),
  }),
});
