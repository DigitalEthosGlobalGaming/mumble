import {definePart} from "../../types";

export default definePart({
  kind: "outfit", id: "tee", weight: 2, order: {fem: 2, masc: 3}, skirt: "optional",
  draw: ({k, body, chestLetter}) => ({
    sleeveLen: 26,
    torso: body(k.main) + chestLetter(k.main),
  }),
});
