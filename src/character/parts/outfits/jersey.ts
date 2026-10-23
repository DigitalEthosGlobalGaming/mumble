import {definePart} from "../../types";

/* Hockey jersey. `prop` picks what is in the outer hand (a stick, often); `armTrim` adds a stripe to each sleeve. */
export default definePart({
  kind: "outfit", id: "jersey", order: {fem: 6, masc: 10},
  prop: r => r() < 0.6 ? "stick" : "none",
  draw: ({k, tl, sy, hip, body, rect, vneck, text, light, shade}) => {
    const s = light(k.main) ? shade(k.main, -0.6) : k.second;
    return {
      torso: body(k.main) + rect(tl, hip - 30, k.tw, 8, s, `class="ns"`) + rect(tl, hip - 18, k.tw, 8, s, `class="ns"`) + vneck(s, 14) + text(k.number, 100, sy + 48, 24, s),
    };
  },
  armTrim: ({k, ay, aw, rect, light, shade}, x, sleeveLen) => rect(x, ay + sleeveLen - 14, aw, 6, light(k.main) ? shade(k.main, -0.6) : k.second, `class="ns"`),
});
