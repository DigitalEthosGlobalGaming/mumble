import {definePart} from "../../types";
import {frame} from "./_frame";

export default definePart({
  kind: "glasses", id: "square", order: 2,
  draw: c => frame(c, x => `<rect x="${x - 9}" y="${c.ey - 7}" width="18" height="14" rx="2.5" fill="#fff" fill-opacity=".2" style="stroke-width:1.8"/>`),
});
