import {definePart} from "../../types";

export default definePart({
  kind: "outfit", id: "jacket", order: {fem: 7, masc: 4}, skirt: "optional",
  draw: ({k, sy, tl, tr, th, body, chestLetter, rect}) => ({
    torso: body(k.second) + chestLetter(k.second) + rect(tl, sy, 100 - 10 - tl, th, k.main) + rect(110, sy, tr - 110, th, k.main),
  }),
});
