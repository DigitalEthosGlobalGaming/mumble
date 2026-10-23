// The default cast, mirrored from src/app.js so the Node tools can use them.
const BASE = {name:"Voice", engine:"formant", style:"babble", speaker:0, pitch:128, tract:1, tension:0.6, brightness:0.55,
  breath:0.15, jitter:0.02, creak:0.2, wobRate:0, wobDepth:0, nasality:0, mutter:0, consonants:0.7, smooth:0.4,
  cps:30, decl:3.5, random:1, length:1.15, volume:1};
const DEFAULTS = [
  {name:"Guard", pitch:94, tract:0.96, tension:0.72, brightness:0.5, breath:0.1, creak:0.35, consonants:0.85, decl:3, random:0.6, length:1.2},
  {name:"Villager"},
  {name:"Sister Agnes", speaker:1, pitch:212, tension:0.5, breath:0.28, creak:0.1, decl:4, random:0.9, length:1.2},
  {name:"Pip", speaker:2, pitch:300, tract:1.04, breath:0.2, cps:38, decl:5, random:1.8, length:1.05},
  {name:"Old Barnaby", pitch:136, tension:0.42, brightness:0.4, breath:0.34, jitter:0.035, creak:0.6, wobRate:2.1, wobDepth:0.9, cps:24, length:1.35},
  {name:"Captain Gristle", pitch:102, tract:0.94, mutter:0.7, tension:0.72, brightness:0.42, breath:0.22, jitter:0.03, creak:0.5, nasality:0.1, cps:28, random:1.2, length:1.3},
  {name:"Snig the Goblin", engine:"tract", speaker:1.4, pitch:250, tract:1.1, tension:0.75, nasality:0.6, brightness:0.75, jitter:0.03, cps:36, random:2.2, decl:5},
  {name:"Whiskers", style:"letters", speaker:2, tract:1.15, pitch:380, nasality:0.25, brightness:0.7, cps:34, random:2.2, length:1},
  {name:"Bramble", style:"grunts", pitch:150, tension:0.55, breath:0.25, creak:0.3, random:1.5},
  {name:"Tiny Beeper", style:"beeps", pitch:260, brightness:0.6, random:1.2, decl:3},
  {name:"Unit 7", pitch:150, tension:0.8, brightness:0.9, breath:0, jitter:0, creak:0, decl:0, random:0, smooth:0.1, consonants:0.9}
].map(d => ({...BASE, ...d}));
const byName = n => DEFAULTS.find(v => v.name.toLowerCase().startsWith(String(n).toLowerCase()));
module.exports = {BASE, DEFAULTS, byName};
