import {definePart} from "../../types";

export default definePart({
  kind: "hat", id: "mountie",
  draw: ({hw, top, rect}) => `<path d="M${100 - hw * 0.32},${top} Q${100 - hw * 0.3},${top - 18} 100,${top - 34} Q${100 + hw * 0.3},${top - 18} ${100 + hw * 0.32},${top} Z" fill="#a87a46"/>`
    + `<path d="M100,${top - 34} V${top - 14} M${100 - hw * 0.12},${top - 22} L${100 - hw * 0.06},${top - 12} M${100 + hw * 0.12},${top - 22} L${100 + hw * 0.06},${top - 12}" fill="none" style="stroke-width:1.5"/>`
    + rect(100 - hw * 0.32, top - 6, hw * 0.64, 5, "#5a3a1e", `class="ns"`) + rect(100 - hw * 0.8, top - 2, hw * 1.6, 7, "#a87a46", `rx="3.5"`),
});
