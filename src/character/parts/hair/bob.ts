import {definePart} from "../../types";
import {cutAtMouth} from "./_cut";

export default definePart({
  kind: "hair", id: "bob", weight: {fem: 2}, order: {fem: 1},
  draw: c => cutAtMouth(c, c.m + 18),
});
