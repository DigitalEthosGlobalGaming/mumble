import {definePart} from "../../types";

export default definePart({
  kind: "outfit", id: "suit", weight: {fem: 1, masc: 2}, order: {fem: 4, masc: 1}, skirt: "optional",
  draw: ({k, sy, hip, body, vneck, tie}) => ({
    torso: body(k.main) + vneck(k.shirt, 34) + tie + `<path d="M87,${sy} L98,${sy + 46} M113,${sy} L102,${sy + 46} M100,${sy + 46} V${hip}" fill="none" style="stroke-width:1.6"/>`,
  }),
});
