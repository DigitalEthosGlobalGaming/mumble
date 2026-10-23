/* Procedural paper cut-out Canadians: a tall oval head split right across by the mouth line, tiny dot eyes,
   no neck and a stubby, square-cornered body. A seeded random generator assembles each person from a kit of
   parts (outfit, hair, hat, face, something to hold), so the same seed always builds the same person and a
   new seed builds a new one. The top of the head flaps open from the back as they talk; `flip` moves the
   hinge to the other side for someone standing on the right.

   The parts themselves are one file each under parts/; see parts/README.md for how to add one. */
export {createCharacter} from "./animate";
export {lookFor, withPart, bare} from "./look";
export {allParts, getPart} from "./registry";
export {randomSeed} from "./kit";
export type {Look, Character, Part, PartKind} from "./types";
