import {definePart} from "../../types";

export default definePart({
  kind: "prop", id: "coffee", chance: 0.12, order: 1,
  draw: ({ox, oy, rect, RED}) => `<path d="M${ox - 8},${oy - 18} H${ox + 8} L${ox + 6},${oy + 8} H${ox - 6} Z" fill="${RED}"/>` + rect(ox - 9, oy - 23, 18, 6, "#fff", `rx="2"`),
});
