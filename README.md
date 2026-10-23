# Mumble

Synthesised "mumble speech" for game dialogue. You type a line, a character says it in made-up speech, and every sound is generated from the text as it types out. There are no audio files.

It started from a Mythfall devlog about building mumble speech from a buzz plus vowel filters. It has since grown two synthesis engines, research vowel data, consonants, and a debugging stepper.

## Quick start

No install and no build step are needed to run it.

- **Run it:** open `src/index.html` in a browser. It also works straight from disk.
- **Single file:** `dist/mumble-voices.html` is the same page in one self-contained file. Rebuild it with `node tools/build.js` after editing `src/`.
- **Tools:** Node 18+ is only needed for the scripts in `tools/`. There are no npm dependencies.

```
npm run build                                  # src/ -> dist/mumble-voices.html
npm run render -- "Hello there!" --voice Guard --out hello.wav
npm run check                                  # formant, level and click checks
```

## Layout

| Path | What it is |
| --- | --- |
| `src/mumble-core.js` | The whole synthesiser: text planning, control frames, both engines. Pure JS and DOM-free, so it runs in the browser and in Node. |
| `src/app.js` | The UI: dialogue box, voice editor, vowel map, streaming playback, sound stepper, import/export, WAV export. |
| `src/styles.css`, `src/index.html` | Page styles and markup. |
| `dist/mumble-voices.html` | Built single-file page. |
| `data/h95.json` | Hillenbrand et al. (1995) vowel means (f0, duration, F1–F4) for men, women and children. |
| `data/tract-shapes.json` | Tongue and lip shapes fitted so the vocal tract engine hits those vowels. |
| `tools/` | Build, WAV render, analysis and data-regeneration scripts. |

## Exporting a conversation as video

In **Two-person chat**, set up the script and voices, then press **Export video**. You get an MP4 (WebM if the browser can't encode MP4) of the animated scene with all the speech mixed in: 1280×720, 30 fps.

It isn't a screen recording. `src/video-export.ts` draws each frame to a canvas from the same plan and track the live page animates from, mixes every line's audio into one buffer, and encodes both with WebCodecs through [mediabunny](https://mediabunny.dev). That makes it much faster than real time and means you can leave the tab. Use **Cancel export** to stop it. It needs a recent Chrome, Edge or Safari.

## Random people in chat

Under each chat person are three dice buttons: **🎲 Person** (new name, outfit and voice), **🎲 Look** (outfit only) and **🎲 Voice** (a random vocal-tract voice, same name and outfit). Person and Voice play one of that person's lines straight away. They are one-offs, held in memory only and marked "not saved" in the picker, so your saved voices never change. Picking a saved voice, or reloading, drops them. They still work in **Export video**.

## How a line becomes sound

This is all in `src/mumble-core.js`.

1. **`parseLine`** pulls out `{purr}`-style effects and `{whisper}…{/whisper}` ranges.
2. **`plan`** works out the timing and the syllables:
   - It gives every letter an appear time. Punctuation is a pause: a comma waits 3× a letter, and `. ! ?` wait 6×.
   - It splits words into syllables (`syllabify`) and picks each vowel from spelling with `vowelFor`. For example, "time" gets a long i and "tim" gets a short one.
   - It applies the punctuation melody: declination, a `?` rise, a `!` start, `...` trailing off, and caps shouting.
   - The speech style (babble, letters, beeps or grunts) decides what counts as a sound.
3. **`makeFrames`** turns syllables into 2 ms control frames: voicing, aspiration, frication, nasal coupling, creak, pitch, F1–F5 targets and tract shape. Each consonant is a place-of-articulation *locus* the formants glide toward, plus closures, bursts and hiss.
4. **`createSynth(...).next(frames)`** renders sample by sample at 32 kHz:
   - **Source:** an LF-model glottal pulse with per-cycle jitter and shimmer, Klatt flutter, filtered aspiration noise and creak.
   - **`engine: "formant"`:** a Klatt cascade, where a nasal pole and zero feed five resonators. Coefficients are interpolated per sample to avoid 500 Hz zipper noise.
   - **`engine: "tract"`:** a Kelly-Lochbaum waveguide with a nasal branch, after Pink Trombone, run twice per sample.
   - Loudness is calibrated once per voice by `calibrate`, then passed through a soft limiter.
5. The UI streams 0.2 s chunks into Web Audio with crossfaded overlaps, so sound starts in milliseconds even on the slower tract engine.

## Using it in a game

`mumble-core.js` has no dependencies, so it can be dropped in as is:

```js
const synth = createSynth("HALT! Who goes there?", myVoice); // myVoice = one line copied from "Copy voice as one line"
synth.next(1e9);                                             // or call next(100) per tick to spread the work
const buf = audioCtx.createBuffer(1, synth.samples.length, SR);
buf.copyToChannel(synth.samples, 0);
// synth.plan.chars[i].t is when letter i should appear, so drive your text box from the same clock
```

`itemsOf(synth.plan, voice)` lists each separate sound with its time range and letters. `synth.track` gives F1/F2/amplitude/f0 every 10 ms, which is useful for lip flaps.

## Things you'll most likely want to tweak

| Where | What |
| --- | --- |
| `FRIC_F`, `FRIC_T`, `WHISPER` | Loudness of consonant hiss in each engine, and of whispering. |
| `PLACE` | Consonant loci, constriction positions, and frication centre, width and level. |
| `vowelFor`, `FUNC`, `DIPH` | Spelling-to-vowel rules, reduced function words and diphthongs. |
| `BW` | Formant bandwidths, from Klatt (1980) defaults. |
| `0.1 / (Math.sqrt(...` in `calibrate` | The overall target loudness. |
| `DEFAULTS` in `src/app.js` | The starting cast. It is mirrored in `tools/voices.js` for the scripts. |

After changing anything sound-related, run `npm run check`. It reports:
- Measured formants against the Hillenbrand targets (`check-formants`).
- Consonant and breath levels relative to the vowel. Real speech puts /s/ and /h/ around 10–15 dB under the vowel (`check-levels`).
- Limiter use and sharp waveform jumps across the whole cast (`scan-clicks`).

## Regenerating the data

- `python tools/build-tables.py path/to/vowdata.dat` rebuilds the H95 table. Get the data from https://github.com/santiagobarreda/hillenbrand_et_al_1995. The script prints a `const H95=...;` line to paste into the core.
- `node tools/fit-tract.js` refits the tract shapes against H95 and prints a `const TRACT_V=...;` line.

## Running outside claude.ai

The published version uses the claude.ai runtime (`window.claude`) for three things. Locally each one falls back automatically, with no code changes needed:

| Feature | On claude.ai | Locally |
| --- | --- | --- |
| Voice storage | Synced to your account | `localStorage` |
| WAV export | Download handled by the runtime, inside a .zip | A plain `.wav` download |
| Account sync check | Uses the `user` capability | Skipped |

## Credits and licences to check before shipping

- **Vowel data:** Hillenbrand, Getty, Clark & Wheeler (1995), *Acoustic characteristics of American English vowels*, JASA. Taken via Santiago Barreda's repository. Check that repo's licence before redistributing `data/h95.json`.
- **Glottal model:** the LF model setup follows the version used in Pink Trombone (Neil Thapen).
- **Vocal tract engine:** a re-implementation of Pink Trombone's waveguide tract. Check Pink Trombone's licence if you ship commercially.
- **Formant engine:** after Klatt (1980), *Software for a cascade/parallel formant synthesizer*, JASA, including the flutter formula and default bandwidths.
