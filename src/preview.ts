/* Dev-only page (open /preview.html while `npm run dev` is running): shows every registered part on one plain
   person so a new part can be judged on its own, plus a row of random people. */
import {allParts, bare, createCharacter, lookFor, randomSeed, withPart} from "./character";
import type {Look, PartKind} from "./character";

const $ = (id: string) => document.getElementById(id) as HTMLInputElement;
const KINDS: PartKind[] = ["outfit", "hat", "hair", "prop", "facial", "glasses"];

function cell(look: Look, label: string, flip: boolean, open: number) {
  const el = document.createElement("div");
  el.className = "cell";
  const host = document.createElement("div");
  el.append(host);
  const ch = createCharacter(host, flip);
  ch.setLook(look);
  ch.setOpen(open);
  const b = document.createElement("b");
  b.textContent = label;
  el.append(b);
  return el;
}

function render() {
  const seed = $("seed").value || "preview", main = $("col").value, flip = $("flip").checked, open = +$("open").value;
  const base = lookFor(seed, main), out = $("out");
  out.innerHTML = "";
  for (const kind of KINDS) {
    const h = document.createElement("h2");
    h.textContent = kind + "s";
    const grid = document.createElement("div");
    grid.className = "grid";
    // judge one part at a time: strip the rest, except an outfit/hair is shown on the plain base
    const start = bare(base);
    // facial hair and glasses need a plain-faced start too; a hat hides most hair, so show hats over a crop
    for (const p of [...(kind === "prop" || kind === "facial" || kind === "glasses" ? [{id: "none", label: "none"}] : []), ...allParts(kind)] as any[]) {
      const look = p.id === "none" && kind !== "hat" ? start : withPart(start, kind, p.id);
      grid.append(cell(look, p.label ? `${p.label} (${p.id})` : p.id, flip, open));
    }
    out.append(h, grid);
  }
  const h = document.createElement("h2");
  h.textContent = "random people";
  const grid = document.createElement("div");
  grid.className = "grid";
  for (let i = 0; i < 12; i++) { const s = seed + "-" + i; grid.append(cell(lookFor(s, main), s, flip, open)); }
  out.append(h, grid);
}

for (const id of ["seed", "col", "flip", "open"]) $(id).addEventListener("input", render);
$("newSeed").onclick = () => { $("seed").value = randomSeed(); render(); };
render();
