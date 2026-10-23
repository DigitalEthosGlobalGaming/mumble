import {definePart} from "../../types";
import {cutAtMouth} from "./_cut";

export default definePart({
  kind: "hair", id: "long", weight: {fem: 2}, order: {fem: 2},
  draw: c => cutAtMouth(c, c.sy + 40),
});
