/* While they talk the top of the head jumps open by a different amount each syllable (you see right through
   the gap), and every so often the arms snap to a new gesture, South Park style: no tweening. */
import {build} from "./draw";
import {lookFor} from "./look";
import type {Character, Look} from "./types";

const still = matchMedia("(prefers-reduced-motion: reduce)");
const LEVELS = [0, 11, 22, 34, 46]; // flap angle in degrees: choppy on purpose, like cut paper on a pin

export function createCharacter(host: HTMLElement, flip = false, clock?: () => number): Character {
  let head: SVGGElement, flap: SVGGElement, arms: SVGGElement[] = [], hx = 55, hy = 88, hb = 100, level = 0, tilt = 0;
  let pivots: number[][] = [], armMax = [110, 110], nextPose = 0, restT = 0, restAt = 0;
  const apply = () => {
    // the top of the head comes right off: it lifts clear of the jaw, drifts back and tips, all by a bit more or less each syllable
    const j = () => level ? 0.75 + Math.random() * 0.5 : 1;
    const a = LEVELS[level] * 0.6 * j(), lift = level * 7 * j(), back = level * 2.5 * j();
    flap.setAttribute("transform", `translate(${flip ? back : -back} ${-lift}) rotate(${(flip ? 1 : -1) * a} ${hx} ${hy})`);
  };
  /* angles are how far each arm swings out from the body, in degrees */
  const pose = (out: number[]) => arms.forEach((g, i) => {
    const a = Math.min(out[i], armMax[i]);
    g.setAttribute("transform", `rotate(${i ? -a : a} ${pivots[i][0]} ${pivots[i][1]})`);
  });
  const gesture = () => {
    const r = Math.random(), big = () => 35 + Math.random() * 75, small = () => Math.random() * 14;
    const lead = Math.random() < 0.65 ? (flip ? 0 : 1) : (flip ? 1 : 0); // usually the arm towards the other person
    const out = r < 0.2 ? [small(), small()] : r < 0.75 ? [0, 0].map((_, i) => i === lead ? big() : small()) : [20 + Math.random() * 40, 20 + Math.random() * 40];
    pose(out);
  };
  /* tip the whole head (jaw and flap together) about the chin; the video export drives this for questions and emphasis */
  const setTilt = (deg: number, force = false) => {
    if (deg === tilt && !force) return;
    tilt = deg; head.setAttribute("transform", deg ? `rotate(${deg} 100 ${hb})` : "");
  };
  const draw = (look: Look) => {
    const b = build(look, flip); host.innerHTML = b.svg; hx = b.hx; hy = b.hy; hb = b.by; pivots = b.pivots; armMax = b.armMax;
    head = host.querySelector(".head") as SVGGElement; flap = host.querySelector(".flap") as SVGGElement; arms = [...host.querySelectorAll<SVGGElement>(".arm")]; apply(); setTilt(tilt, true);
  };
  draw(lookFor("default", "#c98b5a"));
  return {
    el: host,
    setOpen(open) {
      // with a `clock` (video export) time is driven by the caller, so no timers and no reduced-motion opt-out
      const now = clock ? clock() : performance.now();
      if (open > 0.05){
        clearTimeout(restT); restT = 0; restAt = 0;
        if (now > nextPose && (clock || !still.matches)){ gesture(); nextPose = now + 350 + Math.random() * 650; }
      } else if (clock){
        if (!restAt) restAt = now + 600;
        else if (restAt > 0 && now >= restAt){ pose([0, 0]); nextPose = 0; restAt = -1; }
      } else if (!restT) restT = window.setTimeout(() => { pose([0, 0]); nextPose = 0; }, 600);
      const l = Math.max(0, Math.min(4, Math.round(open * 4)));
      if (l === level) return;
      level = l; apply();
    },
    setLook: draw,
    setTilt,
  };
}
