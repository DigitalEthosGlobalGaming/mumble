import {definePart} from "../../types";

/* `skirt: "always"` puts the skirt on; `skirtShape` says where the hem is, how much it flares and its colour. */
export default definePart({
  kind: "outfit", id: "dress", weight: {fem: 2}, order: {fem: 3}, skirt: "always",
  skirtShape: ({k, hip}) => ({hem: hip + 44, flare: 18, col: k.main}),
  draw: ({k, tl, hip, body, rect}) => ({
    sleeveLen: 22,
    torso: body(k.main) + rect(tl, hip - 14, k.tw, 7, k.second),
  }),
});
