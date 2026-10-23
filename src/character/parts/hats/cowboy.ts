import {definePart} from "../../types";

/* No `chance`, so it never turns up in the usual draw: only the western outfit asks for it. */
export default definePart({
  kind: "hat", id: "cowboy",
  draw: ({hw, top, rect}) => {
    const c = "#8a5a32";
    return `<path d="M${100 - hw * 0.33},${top + 2} L${100 - hw * 0.3},${top - 28} Q${100 - hw * 0.15},${top - 34} 100,${top - 27} Q${100 + hw * 0.15},${top - 34} ${100 + hw * 0.3},${top - 28} L${100 + hw * 0.33},${top + 2} Z" fill="${c}"/>`
      + rect(100 - hw * 0.32, top - 8, hw * 0.64, 6, "#4a2e18", `class="ns"`)
      + `<path d="M${100 - hw * 0.8},${top - 6} Q${100 - hw * 0.7},${top + 6} 100,${top + 6} Q${100 + hw * 0.7},${top + 6} ${100 + hw * 0.8},${top - 6} Q${100 + hw * 0.6},${top - 2} 100,${top - 1} Q${100 - hw * 0.6},${top - 2} ${100 - hw * 0.8},${top - 6} Z" fill="${c}"/>`;
  },
});
