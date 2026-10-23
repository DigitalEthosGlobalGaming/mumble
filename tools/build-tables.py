"""Regenerate the H95 vowel table from the Hillenbrand et al. (1995) data.

Download h95-alldata.zip from https://github.com/santiagobarreda/hillenbrand_et_al_1995,
unzip it next to this script (you need vowdata.dat), then run:
    python tools/build-tables.py path/to/vowdata.dat
It writes data/h95.json and prints a `const H95=...;` line to paste into src/mumble-core.js.
Row format per vowel: F1,F2,F3 at 20% | F1,F2,F3 at 80% | F4 (steady state).
Groups: m = men, w = women, c = children (boys + girls)."""
import json, re, statistics as st, sys, pathlib
src = sys.argv[1] if len(sys.argv) > 1 else "vowdata.dat"
rows = [l.split() for l in open(src) if re.match(r'^[mwbg]\d\d[a-z]{2}\s', l)]
keys = 'iy ih ei eh ae ah aw oa oo uw uh er'.split()
groups = {'m': ['m'], 'w': ['w'], 'c': ['b', 'g']}
def mean(rs, i): return round(st.mean([float(r[i]) for r in rs if float(r[i]) > 0]))
full, table = {}, {}
for g, codes in groups.items():
    full[g], table[g] = {}, {}
    for v in keys:
        rs = [r for r in rows if r[0][0] in codes and r[0][3:5] == v]
        d = dict(f0=mean(rs, 2), dur=mean(rs, 1), ss=[mean(rs, i) for i in (3, 4, 5, 6)], a=[mean(rs, i) for i in (7, 8, 9)], b=[mean(rs, i) for i in (13, 14, 15)])
        full[g][v] = d
        table[g][v] = d['a'] + d['b'] + [d['ss'][3]]
out = pathlib.Path(__file__).resolve().parent.parent / 'data' / 'h95.json'
out.write_text(json.dumps(full, indent=1))
print('const H95=' + json.dumps(table, separators=(',', ':')) + ';')
