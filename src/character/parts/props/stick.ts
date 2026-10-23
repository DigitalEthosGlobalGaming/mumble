import {definePart} from "../../types";

export default definePart({
  kind: "prop", id: "stick",
  draw: ({ox, oy, out, FOOT, INK}) => `<path d="M${ox - out * 6},${oy - 70} L${ox + out * 6},${FOOT - 8}" style="stroke:${INK};stroke-width:7;stroke-linecap:round"/><path d="M${ox - out * 6},${oy - 70} L${ox + out * 6},${FOOT - 8}" style="stroke:#d2a868;stroke-width:4;stroke-linecap:round"/><path d="M${ox + out * 6},${FOOT - 8} h${out * 30}" style="stroke:${INK};stroke-width:7;stroke-linecap:round"/>`,
});
