import {definePart} from "../../types";

export default definePart({
  kind: "facial", id: "beard", weight: {masc: 1}, order: {masc: 4},
  draw: ({k, m, bot, xl, jaw}) => {
    const by = m + (bot - m) * 0.3;
    return {chin: `<path d="M${xl(by)},${by} ${jaw(by)} Q100,${by + (bot - by) * 0.6} ${xl(by)},${by} Z" fill="${k.beard}"/>`};
  },
});
