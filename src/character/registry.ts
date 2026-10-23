/* Finds every file under parts/ (except those starting with an underscore) and files it by kind and id.
   Adding a part is adding a file; nothing here needs to change. */
import type {Gender, Part, PartKind, PartOf, PerGender, Rng} from "./types";

const modules = import.meta.glob<{default: Part}>(["./parts/**/*.ts", "!./parts/**/_*.ts"], {eager: true});
const KINDS: PartKind[] = ["outfit", "hat", "hair", "prop", "facial", "glasses"];
const store = Object.fromEntries(KINDS.map(k => [k, new Map<string, Part>()])) as Record<PartKind, Map<string, Part>>;

for (const [path, mod] of Object.entries(modules)) {
  const p = mod.default;
  if (!p || !store[p.kind]) throw new Error(`${path}: expected \`export default definePart({kind: "outfit" | "hat" | "hair" | "prop" | "facial" | "glasses", ...})\``);
  if (store[p.kind].has(p.id)) throw new Error(`${path}: there is already a ${p.kind} called "${p.id}"`);
  store[p.kind].set(p.id, p);
}

export const getPart = <K extends PartKind>(kind: K, id: string) => store[kind].get(id) as PartOf[K] | undefined;
export const allParts = <K extends PartKind>(kind: K) => [...store[kind].values()] as PartOf[K][];

/* `unset` is the value when the field is left out; `missing` is the value for a gender left out of `{fem, masc}`
   (a weight of `{fem: 2}` means 0 for masc, but an order of `{fem: 2}` just means "no special place"). */
const perGender = (v: PerGender<number> | undefined, g: Gender, unset: number, missing = unset) => v === undefined ? unset : typeof v === "number" ? v : v[g] ?? missing;
const weightOf = (v: PerGender<number> | undefined, g: Gender) => perGender(v, g, 1, 0);

/* The draw list: each part appears `weight` times, in `order`. Picking is `list[floor(r() * list.length)]`. */
const pools = new Map<string, Part[]>();
function pool<K extends PartKind>(kind: K, g: Gender): PartOf[K][] {
  const key = kind + g;
  let list = pools.get(key);
  if (!list) {
    list = [];
    const sorted = allParts(kind).map(p => ({p, w: weightOf(p.weight, g), o: perGender(p.order, g, 100)}))
      .filter(x => x.w > 0).sort((a, b) => a.o - b.o || (a.p.id < b.p.id ? -1 : 1));
    for (const {p, w} of sorted) for (let i = 0; i < w; i++) list.push(p);
    pools.set(key, list);
  }
  return list as PartOf[K][];
}
export const pickPart = <K extends PartKind>(kind: K, g: Gender, r: Rng) => { const l = pool(kind, g); return l[Math.floor(r() * l.length)]; };

/* The usual random hat or prop: each candidate with a `chance` is tried in `order`, and the first to hit wins. */
export function chainPick(kind: "hat" | "prop", r: Rng): string {
  const tries = (allParts(kind) as {id: string; chance?: number; order?: PerGender<number>}[]).filter(p => p.chance !== undefined)
    .sort((a, b) => perGender(a.order, "masc", 100) - perGender(b.order, "masc", 100) || (a.id < b.id ? -1 : 1));
  for (const p of tries) if (r() < p.chance!) return p.id;
  return "none";
}
