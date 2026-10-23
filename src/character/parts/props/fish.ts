import {definePart} from "../../types";

/* Held in the inner hand; only outfits that ask for it (overalls) give it out. */
export default definePart({
  kind: "prop", id: "fish", hand: "inner",
  draw: ({ix, iy, dir, INK}) => `<g transform="translate(${ix},${iy})"><path d="M0,4 l-7,-9 h14 Z" fill="#9fb0bb"/><ellipse cx="0" cy="28" rx="8" ry="22" fill="#c3cfd7"/><path d="M-5,40 q5,6 10,0" fill="none" style="stroke-width:1.5"/><circle class="ns" cx="${dir * 2.5}" cy="42" r="1.6" fill="${INK}"/></g>`,
});
