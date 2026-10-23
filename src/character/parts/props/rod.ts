import {definePart} from "../../types";

export default definePart({
  kind: "prop", id: "rod",
  draw: ({ox, oy, out}) => `<path d="M${ox},${oy - 140} V${oy + 44}" style="stroke:#4a4a4a;stroke-width:3.5"/><path d="M${ox},${oy - 140} q${out * 8},50 ${out * 4},110" fill="none" style="stroke:#666;stroke-width:.8"/><circle cx="${ox - out * 6}" cy="${oy + 20}" r="5" fill="#cfcfcf" style="stroke-width:1.5"/>`,
});
