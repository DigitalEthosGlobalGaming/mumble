import {definePart} from "../../types";
import {softFringe} from "./_cut";

export default definePart({
  kind: "hair", id: "bun", weight: {fem: 1}, order: {fem: 3}, tall: true,
  draw: ({k, top, cap}) => ({front: `<circle cx="100" cy="${top - 10}" r="13" fill="${k.hair}"/>` + cap(softFringe(k.fringeCut))}),
});
