import {definePart} from "../../types";
import {frame} from "./_frame";

export default definePart({
  kind: "glasses", id: "round", order: 1,
  draw: c => frame(c, x => `<circle cx="${x}" cy="${c.ey}" r="8.5" fill="#fff" fill-opacity=".2" style="stroke-width:1.8"/>`),
});
