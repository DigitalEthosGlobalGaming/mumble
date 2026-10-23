import {definePart} from "../../types";

export default definePart({
  kind: "hair", id: "side", weight: {fem: 1, masc: 2}, order: {fem: 4, masc: 4},
  draw: ({cap}) => ({front: cap("swept")}),
});
