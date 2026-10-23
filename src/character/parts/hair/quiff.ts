import {definePart} from "../../types";

export default definePart({
  kind: "hair", id: "quiff", weight: {masc: 1}, order: {masc: 5}, tall: true,
  draw: ({k, top, xl, xr, cap}) => ({
    front: cap("straight") + `<path d="M${xl(top + 8) - 3},${top + 8} Q${xl(top + 8) - 4},${top - 24} 100,${top - 22} Q${xr(top + 8) + 12},${top - 26} ${xr(top + 8) + 5},${top + 6} Q100,${top - 4} ${xl(top + 8) - 3},${top + 8} Z" fill="${k.hair}"/>`,
  }),
});
