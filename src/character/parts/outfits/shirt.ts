import {definePart} from "../../types";

export default definePart({
  kind: "outfit", id: "shirt", weight: {masc: 1}, order: {masc: 2},
  draw: ({k, sy, tr, body, vneck, tie, rect, shade}) => ({
    torso: body(k.main) + vneck(shade(k.main, -0.12), 14) + tie + rect(tr - 24, sy + 24, 14, 12, "none", `style="stroke-width:1.4"`),
  }),
});
