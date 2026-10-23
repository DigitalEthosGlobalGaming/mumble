import {definePart} from "../../types";

export default definePart({
  kind: "hat", id: "cap", chance: 0.08, order: 3,
  draw: ({k, hw, top, band, BL, BR, text, shade}) => {
    const hc = k.hatCol;
    return `<path d="M${BL},${band} V${top + 2} Q${BL},${top - 18} 100,${top - 18} Q${BR},${top - 18} ${BR},${top + 2} V${band} Z" fill="${hc}"/>`
      + `<path d="M${100 - hw * 0.28},${band} V${top} Q${100 - hw * 0.28},${top - 15} 100,${top - 15} Q${100 + hw * 0.28},${top - 15} ${100 + hw * 0.28},${top} V${band} Z" fill="#f4f4f4"/>`
      + (k.letter ? text(k.letter, 100, top + 6, 16, hc) : "")
      + `<path d="M${BL - 3},${band} Q100,${band + 13} ${BR + 3},${band} Q100,${band + 4} ${BL - 3},${band} Z" fill="${shade(hc, -0.25)}"/>`;
  },
});
