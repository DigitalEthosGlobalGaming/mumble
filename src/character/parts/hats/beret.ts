import {definePart} from "../../types";

export default definePart({
  kind: "hat", id: "beret",
  draw: ({dir, hw, top, RED, INK}) => `<path d="M${100 + dir * 8},${top - 10} q${dir * 4},-14 ${-dir * 2},-22 q${-dir * 6},-8 ${dir * 2},-16" fill="none" style="stroke-width:1.6"/>`
    + `<circle cx="${100 + dir * 8}" cy="${top - 50}" r="6" fill="${RED}"/><circle class="ns" cx="${100 + dir * 8}" cy="${top - 50}" r="2.2" fill="#f2d44a"/>`
    + `<ellipse cx="${100 - dir * 4}" cy="${top - 3}" rx="${hw * 0.54}" ry="9" fill="${INK}"/>`,
});
