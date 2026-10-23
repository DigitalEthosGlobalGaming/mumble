import {definePart} from "../../types";

export default definePart({
  kind: "outfit", id: "sweater", weight: {fem: 2, masc: 1}, order: {fem: 1, masc: 11}, skirt: "optional",
  draw: ({k, sy, tl, hip, al, body, rect, shade}) => ({
    sleeveLen: k.longSleeves ? al - 10 : 22,
    torso: body(k.main) + `<ellipse cx="91" cy="${sy + 11}" rx="10" ry="6" fill="#fff"/><ellipse cx="109" cy="${sy + 11}" rx="10" ry="6" fill="#fff"/>`
      + rect(tl, hip - 8, k.tw, 8, shade(k.main, -0.15)),
  }),
});
