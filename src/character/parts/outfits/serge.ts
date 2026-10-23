import {definePart} from "../../types";

/* A red serge: the Mountie. Wears the hat most of the time. */
export default definePart({
  kind: "outfit", id: "serge", weight: {masc: 1}, order: {masc: 5},
  hat: r => r() < 0.7 ? "mountie" : "none",
  draw: ({k, sy, tl, tr, hip, FOOT, body, rect}) => ({
    sleeve: "#c8202b", legCol: "#1d2a5a",
    torso: body("#c8202b") + rect(tl + 2, sy + 4, k.tw - 4, 10, "#1d2a5a") + `<path d="M${tl + 4},${sy + 6} L${tr - 4},${hip - 18} L${tr - 4},${hip - 8} L${tl + 4},${sy + 18} Z" fill="#2f4f9a"/>`
      + `<path d="M${tl + 4},${sy + 10} L${tr - 4},${hip - 13}" style="stroke:#e8c33c;stroke-width:2.5"/>`
      + [0, 1, 2, 3].map(i => `<circle cx="100" cy="${sy + 22 + i * 13}" r="2.6" fill="#e8c33c" style="stroke-width:1"/>`).join("")
      + rect(tl, hip - 16, k.tw, 8, "#5a3a1e") + rect(tl - 6, sy, 12, 6, "#e8c33c", `rx="2"`) + rect(tr - 6, sy, 12, 6, "#e8c33c", `rx="2"`),
    legsOver: [84, 101].map(x => rect(x + 6, hip, 3, FOOT - hip - 4, "#e8c33c", `class="ns"`)).join(""),
  }),
});
