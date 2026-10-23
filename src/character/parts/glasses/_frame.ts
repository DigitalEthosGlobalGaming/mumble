import type {Ctx} from "../../types";

/* Two lenses plus the bridge and the arms to the sides of the head; a glasses part only supplies the lens shape. */
export const frame = ({ey, exs, xl, xr}: Ctx, lens: (x: number) => string) =>
  lens(exs[0]) + lens(exs[1]) + `<path d="M${exs[0] + 8.5},${ey} H${exs[1] - 8.5} M${exs[0] - 8.5},${ey} H${xl(ey)} M${exs[1] + 8.5},${ey} H${xr(ey)}" fill="none" style="stroke-width:1.8"/>`;
