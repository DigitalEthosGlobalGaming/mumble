import {definePart} from "../../types";

/* A knitted toque. `chance` is how likely anyone is to wear it in the usual random draw (hats are tried in `order`). */
export default definePart({
  kind: "hat", id: "toque", chance: 0.12, order: 2,
  draw: ({k, top, band, BL, BR, rect, shade}) => {
    const hc = k.hatCol;
    return `<path d="M${BL},${band} V${top + 2} Q${BL},${top - 22} 100,${top - 22} Q${BR},${top - 22} ${BR},${top + 2} V${band} Z" fill="${hc}"/>`
      + rect(BL + 3, top - 8, BR - BL - 6, 6, k.hatCol2, `class="ns"`) + rect(BL - 2, band - 10, BR - BL + 4, 13, shade(hc, -0.25), `rx="3"`) + `<circle cx="100" cy="${top - 24}" r="8" fill="${k.hatCol2}"/>`;
  },
});
