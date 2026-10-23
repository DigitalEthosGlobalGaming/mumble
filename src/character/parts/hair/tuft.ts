import {definePart} from "../../types";

/* `tall` hair sticks up, so a hat flattens it to a crop (unless the hat sets `allowsTallHair`). */
export default definePart({
  kind: "hair", id: "tuft", weight: {masc: 1}, order: {masc: 2}, tall: true,
  draw: ({k, top}) => ({front: `<path d="M90,${top + 1} l3,-15 l5,10 l4,-16 l4,15 l5,-11 l2,17 Z" fill="${k.hair}"/>`}),
});
