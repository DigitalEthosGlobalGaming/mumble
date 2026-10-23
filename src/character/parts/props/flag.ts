import {definePart} from "../../types";

export default definePart({
  kind: "prop", id: "flag", chance: 0.06, order: 2,
  draw: ({ox, oy, out, rect, RED}) => `<path d="M${ox},${oy + 6} V${oy - 80}" style="stroke:#6b4226;stroke-width:3"/>` + `<g transform="translate(${ox + (out < 0 ? -40 : 0)},${oy - 80})">`
    + rect(0, 0, 40, 22, "#fff") + `<g class="ns">${rect(0.5, 0.5, 10, 21, RED)}${rect(29.5, 0.5, 10, 21, RED)}<path d="M20,4 l1.6,3.4 2.6,-1 -.8,4 3,.6 -2.6,2.2 .8,1.6 -3.4,-.4 .2,3.6 h-2.8 l.2,-3.6 -3.4,.4 .8,-1.6 -2.6,-2.2 3,-.6 -.8,-4 2.6,1Z" fill="${RED}"/></g></g>`,
});
