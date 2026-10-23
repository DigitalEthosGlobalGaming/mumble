# Character parts

Every outfit, hat, hairstyle, prop, facial hair and pair of glasses is one file in the folder for its kind.
Files here are found automatically: drop one in and it exists. Files whose name starts with `_` are helpers
shared between parts and are not registered.

```
parts/
  outfits/  hats/  hair/  props/  facial/  glasses/
  _template.ts      copy this to start a new part
```

## Add a part

1. Copy [`_template.ts`](_template.ts) into the right folder and rename it.
2. Set `kind` and a unique `id`, then write `draw`. It gets a context `c` with the geometry already worked out
   for this person (head edges, hands, body, colours in `c.k`) and returns SVG text. The full list is `Ctx`
   in [`../types.ts`](../types.ts).
3. Open <http://localhost:5173/preview.html> while `npm run dev` runs. Your part appears in its row, on a
   plain base person, with seed / colour / flip / mouth controls.

## Odds, and why seeds move

`weight` is a part's number of tickets in the random draw (default 1, `0` = never random, `{fem: 2, masc: 0}`
per gender). Hats and props instead use `chance` (the chance that the hat is chosen, checked in `order`).

A seed always gives the same person because the random numbers are drawn in a fixed order and each pick is an
index into a list. **Adding a part to a random draw changes the list length, so existing seeds can land on
different outfits/hair.** To add a part without moving anyone, give it `weight: 0` (the `hoodie` does this) and
choose it by hand, or accept the reshuffle. `order` only matters for keeping the old list order; new parts
can leave it out.

## A part's own random choices

`roll: r => ({...})` is called once per person who wears the part, after all the shared choices, and the result
is stored in `look.extra[<kind>]` (read it back as `c.k.extra.outfit` etc.). See
[`outfits/hoodie.ts`](outfits/hoodie.ts). It never disturbs anyone else's look.

## Other hooks

* Outfit: `skirt`, `skirtShape`, `armTrim`, `hat()`/`prop()`/`inner()` to decide what it wears or holds, and
  `fixed` for things it decides itself (the mime).
* Hat: `back` (behind the person), `headTop`, `box` (a paper bag instead of an oval head), `allowsTallHair`.
* Hair: `front` flaps with the head, `lift` lifts with it, `back` stays on the shoulders; `tall` hair is
  flattened under hats.
