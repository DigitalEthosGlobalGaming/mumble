import {definePart} from "../../types";

/* `back` draws behind the whole person (the veil hanging down), `draw` is the circlet on the head.
   `allowsTallHair` lets a bun or quiff stay tall under it, where any other hat would flatten it. */
export default definePart({
  kind: "hat", id: "veil", allowsTallHair: true,
  back: ({L, R, top, hip}) => `<path d="M${L + 6},${top - 4} L${L - 22},${hip + 40} H${R + 22} L${R - 6},${top - 4} Z" fill="#ffffff" opacity=".8" style="stroke:#c9c9c9;stroke-width:1.2"/>`,
  draw: ({L, R, top}) => `<path d="M${L + 10},${top + 1} Q100,${top - 12} ${R - 10},${top + 1}" fill="none" style="stroke:#d8d2c2;stroke-width:5;stroke-linecap:round"/>`,
});
