# Agent notes

## How scripts work

A script is the plain text in the **Two-person chat** box (`#script`). It is saved in `localStorage` under `mumble.script`. The default is `CHAT_DEFAULT` in `src/app.ts`.

- One line of dialogue per line of text. Blank lines are ignored.
- A line starts with `L:` (left person) or `R:` (right person). The letter is case-insensitive.
- A line with no prefix goes to whoever did not speak last. The first unprefixed line goes to `L`.
- `parseScript` in `src/app.ts` turns the text into `{side, text}` objects. Play and Export video both use it.
- The voice and look for each side come from the two pickers (`#vsL`, `#vsR`). Names in the script are only text and do not pick a voice.

### Inside a line

Handled by `parseLine` and `plan` in `src/mumble-core.ts`.

- Effects: `{purr}`, `{snort}`, `{sigh}`, `{hmm}`, `{laugh}`. They pause the typing for a moment (`FX_DUR`).
- Whisper: `{whisper}like this{/whisper}`.
- Punctuation sets the timing and melody: a comma is a short pause, `. ! ?` a longer one, `?` rises, `!` starts high, `...` trails off, and CAPS are shouted.
- Words are not read. The text only decides syllables and vowels, so spelling matters for how it sounds ("time" gets a long i).

### Writing one

Give each speaker a distinct voice, keep lines short, and use effects and punctuation for the acting. To use named characters, set the pickers to matching voices. Adding a default voice means editing `DEFAULTS` in `src/app.ts`, which only applies to users with no saved voices.
