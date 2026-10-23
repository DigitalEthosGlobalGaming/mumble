import {definePart} from "../../types";

export default definePart({
  kind: "outfit", id: "western", weight: {masc: 1}, order: {masc: 6},
  hat: r => r() < 0.7 ? "cowboy" : "none",
  draw: ({k, sy, tl, tr, hip, body, belt, shade}) => ({
    legCol: "#4a6fa5",
    torso: body(k.main) + `<path d="M${tl},${sy + 16} L100,${sy + 26} L${tr},${sy + 16}" fill="none" style="stroke:${shade(k.main, 0.5)};stroke-width:2"/>`
      + `<path class="ns" d="M${tl + 18},${sy + 28} l2.4,5 5.4,.6 -4,3.7 1.1,5.3 -4.9,-2.7 -4.9,2.7 1.1,-5.3 -4,-3.7 5.4,-.6Z" fill="#e8c33c"/>`
      + belt(hip - 14, "#5a3a1e"),
  }),
});
