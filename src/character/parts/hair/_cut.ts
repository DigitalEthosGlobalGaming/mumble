/* Shared by bob and long: hair cut at the mouth line, so the top lifts off with the head and the rest stays on
   the shoulders. Files starting with an underscore are helpers, not parts, and are not registered. */
import type {Ctx, HairDraw} from "../../types";

export function cutAtMouth(c: Ctx, end: number): HairDraw {
  const {k, oval, xl, xr, m, rx, ry, L, R, top, cap} = c;
  const lift = oval ? `<path d="M${xl(m) - 9},${m} A${rx + 9},${ry + 8} 0 1 1 ${xr(m) + 9},${m} Z" fill="${k.hair}"/>`
    : `<path d="M${L - 8},${m} V${top + 10} Q${L - 8},${top - 6} ${L + 8},${top - 6} H${R - 8} Q${R + 8},${top - 6} ${R + 8},${top + 10} V${m} Z" fill="${k.hair}"/>`;
  const back = `<path d="M${L - 8},${m} V${end - 16} Q${L - 8},${end} ${L + 8},${end} H${R - 8} Q${R + 8},${end} ${R + 8},${end - 16} V${m} Z" fill="${k.hair}"/>`;
  return {lift, back, front: cap(softFringe(k.fringeCut))};
}

/** Long hair has no straight-across fringe: it gets bangs instead. */
export const softFringe = (cut: Ctx["k"]["fringeCut"]) => cut === "swept" ? "swept" : cut === "straight" ? "bangs" : cut;
