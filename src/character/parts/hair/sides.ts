import {definePart} from "../../types";

/* Hair only over the ears. */
export default definePart({
  kind: "hair", id: "sides", weight: {masc: 1}, order: {masc: 6},
  draw: ({k, top, hh, xl, xr, rect}) => ({
    front: [xl(top + hh * 0.3) - 4, xr(top + hh * 0.3) - 4].map(x => rect(x, top + hh * 0.18, 8, hh * 0.3, k.hair)).join(""),
  }),
});
