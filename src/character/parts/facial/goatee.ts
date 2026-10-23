import {definePart} from "../../types";
import {moustache} from "./_moustache";

export default definePart({
  kind: "facial", id: "goatee", weight: {masc: 1}, order: {masc: 3},
  draw: ({k, m, bot}) => ({
    mous: moustache(m, k.beard),
    chin: `<path d="M92,${m + 4} H108 L106,${bot + 2} Q100,${bot + 6} 94,${bot + 2} Z" fill="${k.beard}"/>`,
  }),
});
