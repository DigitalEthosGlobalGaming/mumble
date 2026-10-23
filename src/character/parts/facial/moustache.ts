import {definePart} from "../../types";
import {moustache} from "./_moustache";

export default definePart({
  kind: "facial", id: "moustache", weight: {masc: 2}, order: {masc: 2},
  draw: ({k, m}) => ({mous: moustache(m, k.beard)}),
});
