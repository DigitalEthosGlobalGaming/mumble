import {definePart} from "../../types";

/* Plaid is a <pattern> in <defs>; `c.id` keeps its id unique when several people are on the page. */
export default definePart({
  kind: "outfit", id: "flannel", weight: {fem: 1, masc: 2}, order: {fem: 5, masc: 9},
  draw: ({k, id, sy, hip, body, vneck, shade}) => {
    const d = shade(k.main, -0.35), fill = `url(#${id})`;
    return {
      defs: `<pattern id="${id}" width="18" height="18" patternUnits="userSpaceOnUse"><g class="ns"><rect width="18" height="18" fill="${k.main}"/>`
        + `<rect width="7" height="18" fill="${d}" opacity=".55"/><rect width="18" height="7" fill="${d}" opacity=".55"/><rect x="12" width="1.6" height="18" fill="${k.second}" opacity=".5"/></g></pattern>`,
      sleeve: fill,
      torso: body(fill) + `<path d="M100,${sy + 8} V${hip}" style="stroke-width:1.4"/>` + vneck(shade(k.main, -0.2), 12),
    };
  },
});
