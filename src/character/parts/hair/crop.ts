import {definePart} from "../../types";

/* `c.cap(cut)` is a cap of hair that follows the curve of the head, with the person's own fringe cut. */
export default definePart({
  kind: "hair", id: "crop", weight: {fem: 1, masc: 2}, order: {fem: 5, masc: 3},
  draw: ({k, cap}) => ({front: cap(k.fringeCut === "parted" ? "straight" : k.fringeCut)}),
});
