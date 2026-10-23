import {definePart} from "../../types";
import {BAG} from "../../kit";

/* A paper bag over the head. `box` swaps the oval head for a box (wider by dw, taller by dh, top edge at `top`,
   filled with `skin`), and the face goes plain: two dots for eyes and nothing else. `headTop` draws the crinkled top. */
export default definePart({
  kind: "hat", id: "bag", chance: 0.05, order: 1,
  box: {dw: 10, dh: 12, top: 34, skin: BAG},
  headTop: ({L, hw, top}) => `<path d="M${L},${top + 1} ${Array.from({length: 8}, (_, i) => `L${L + hw * (i + 0.5) / 8},${top - 5 + (i % 2) * 3} L${L + hw * (i + 1) / 8},${top + 1}`).join(" ")} Z" fill="${BAG}"/>`,
  draw: () => "",
});
