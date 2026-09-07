# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

ワニ漢字 (WaniKanji) — a static, PC-first, **typed-input** WaniKani-style kanji
trainer. Plain HTML/CSS/JS: no framework, no build step, no `package.json`,
no runtime dependencies. Progress lives in `localStorage` only (no backend,
no account sync). Deployed as-is to GitHub Pages.

The defining feature vs. sibling apps (`kanji-drill`, `kotoba`, `jlpt`, which
are multiple-choice) is **typed answers**: romaji auto-converts to hiragana
as-you-type, and a real 9-stage WaniKani-faithful SRS engine drives
scheduling.

## Commands

Serve locally (data is loaded via `fetch()`, which `file://` blocks):

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

Run tests (Node built-ins only, no test framework/runner installed):

```bash
node js/kana/__tests__/run-tests.js       # romaji -> hiragana
node js/grading/__tests__/run-tests.js    # reading + meaning matching
node js/srs/__tests__/run-tests.js        # SRS stages / intervals / penalty
node js/speech/__tests__/run-tests.js     # ASR transcript normalization
node tools/__tests__/furigana-tests.js    # build-time context/furigana derivation
node tools/__tests__/kun-readings-tests.js  # kun okurigana / primary readings
```

There is no `npm test` / single aggregate runner — run each `run-tests.js`
individually (or `for f in js/*/__tests__/run-tests.js tools/__tests__/*-tests.js; do node "$f"; done`).
Each file is a hand-rolled runner (`assert` + a pass/fail counter) — add new
cases as additional calls in the same file, following the existing pattern.

Regenerate `data/*.json` after touching the data pipeline:

```bash
node tools/build-data.js
```

**Note:** `tools/build-data.js` reads example words/sentences from
`vendor/kanji-data` (git submodule, https://github.com/bagustris/kanji-data),
which organizes by data domain rather than by app — grade files (for
example words) are under `kanji/kyoiku-grade*.json`, sentence files under
`sentences/kyoiku-sentences*.json` (see `KD_KANJI`/`KD_SENTENCES` in
`build-data.js`). Run `git submodule update --init` after cloning — the
script (and `tools/furigana.js`, which it calls) won't run without it.
`data/kanji.json` / `data/radicals.json` are themselves committed, so this
only matters when regenerating them; the live site fetches those committed
files directly and never touches the submodule at runtime.

## Architecture

Everything is a browser global (`window.X`) that also `module.exports`
under Node — the same file runs unmodified in both, which is what lets the
engines be unit-tested with plain `node file.js` and no bundler:

```
js/
  kana.js       toHiragana()          — romaji -> hiragana (IME-style: sokuon,
                                         youon, ん-handling)  [pure, tested]
  grading.js    gradeMeaning/Reading  — meaning: normalize + Levenshtein
                                         fuzz + number-word/digit equivalence;
                                         reading: exact kana match
                                         [pure, tested]
  srs.js        applyReview/newItem   — WaniKani's 9-stage engine (stage,
                                         interval, incorrect-penalty)
                                         [pure, tested]
  speech.js     createRecognizer      — optional Web Speech API mic input;
                                         only katakana->hiragana normalization
                                         is pure/tested, the recognizer itself
                                         is browser-only + feature-detected
  progress.js   window.Progress       — localStorage load/save: per-item SRS
                                         state, settings, lifetime stats
  data.js       window.Data           — fetches data/*.json, builds the
                                         unified `items` list (kanji only —
                                         see below) and id -> item index
  app.js        (no export)           — controller: screen routing, lesson/
                                         review/extra-study quiz engine,
                                         settings, keyboard + mic input
```

`index.html` loads these as plain `<script>` tags in dependency order (kana,
grading, srs, speech, progress, data, app) — there's no module system, so a
new file must be added to that list in the right position (whatever it
depends on must load first).

Each engine's `__tests__/run-tests.js` requires the sibling `.js` file
directly (e.g. `js/kana/__tests__/run-tests.js` requires `../../kana.js`).

**Radicals are not SRS items.** Only kanji enter the lesson/review queue.
Radicals are shown as small glyph+name chips on a kanji's card (a
recognition aid — "Made of: 一 Ground …") and carry no SRS state of their
own; `data.js` keeps them in a separate `radicalByName` lookup, never in
`items`.

**Data pipeline:** `data/kanji.json` and `data/radicals.json` are generated
(via `tools/build-data.js`) from `kanji-wanikani.json` (WaniKani metadata:
levels, meanings, on'yomi/kun'yomi readings with `!` marking the preferred
reading, and radical *names*) plus the `vendor/kanji-data` submodule's
`kanji/kyoiku-grade*.json` + `sentences/kyoiku-sentences*.json` (example
words/sentences, sourced from the kanji-drill app's own dataset). Radical
*glyphs* aren't in the source data, so
`build-data.js` resolves `name -> glyph` by a precedence chain documented at
the top of that file and in `README.md` (hand override > WaniKani's real
Unicode glyph from `tools/wk-radicals-source.json` > single-radical kanji
inference > curated Kangxi fallback flagged `uncertain: true`); glyphs that
can't be resolved cleanly are omitted rather than faked, and the affected
radical chip simply doesn't render — this never blocks lessons/reviews since
radicals don't gate anything themselves (kanji unlocking is level-gated, see
below). Reading derivation (kun okurigana, accepted + primary readings) is
split out into `tools/kun-readings.js` — see **Grading** below.

**Non-standalone kanji** (bound morphemes with no independent reading, e.g.
性, 工) are shown/quizzed inside a compound word instead of alone; `context`
+ `contextGlyphHTML()` in `app.js` render the target kanji highlighted with
furigana on the rest, derived at build time by `tools/furigana.js`. The
context is **graded, not just displayed**: `context.targetReading` is the
reading the target kanji has in that specific word (surface form, rendaku
included) and is the only accepted answer for that prompt — see **Grading**.

### SRS model

9 stages: Apprentice 1–4 → Guru 1–2 → Master → Enlightened → Burned, with
WaniKani's base intervals (4h, 8h, 1d, 2d, 1w, 2w, 1mo, 4mo) and incorrect-answer
penalty (`ceil(incorrect/2) * penalty`, penalty 2 at/above Guru else 1). Kanji
and vocab items both have two subjects per review (meaning + reading) and
only advance once both are cleared in that session. Progression: a level is
passed (unlocking the next level's kanji) once 90% of its kanji reach Guru —
vocab and radicals don't gate it.

**Adaptive pacing** (deviates from stock WaniKani): each item tracks a
`streak` of consecutive fully-correct reviews. `SRS.streakMultiplier(streak)`
shrinks the next-review interval 10% per streak review, floored at 50% of
the base interval — a well-known item reaches Guru/Burn faster than the
fixed ladder. Any incorrect answer resets the streak to 0 (and the existing
stage-drop penalty above already makes a miss slower, so streak reset is the
only "wrong answer" lever needed).

### Grading

Meanings: case/space-insensitive, and Levenshtein-tolerant (distance 0 for ≤3
chars, 1 for >3, 2 for ≥8 — see `allowedDistance()` in `grading.js`). The
accepted-answer list is split on `/`, `;` and commas — but *not* a comma
between digits, which is a thousands separator ("100,000 yen" is one answer,
not "100" and "000 yen"). Spelled-out numbers and digits are interchangeable
("seventeen" = "17", "seven times" = "7 times", "third" = "3rd") because the
glosses use both forms inconsistently; typo tolerance deliberately stops at
the numbers themselves, so "9 hours" is not accepted for "8 hours".

Readings: exact hiragana match (romaji is converted via `kana.js` first)
against a list **the prompt decides** — see `readingPrompt()` in `app.js`:

| prompt | accepts |
| --- | --- |
| bare glyph (正) | `acceptReadings` minus the bound kun stems, or `primaryReadings` under **Strict readings** |
| context word (可能性 with 性 highlighted) | only `context.targetReading` — the reading the target has *in that word* |
| vocab | the word's own reading(s) |

`Grading.classifyReading()` returns three verdicts, not two:
`correct` / `off-prompt` / `wrong`. **off-prompt** is a reading that really is
the character's but isn't what this prompt asked for (ただ under a bare 正,
もん under 文章). It is not a mistake to penalise — it's a misread of the
question — so the quiz shows an amber nudge naming the mismatch and lets the
learner answer again, with no SRS effect and no stat recorded. Anything that
narrows the accepted set (the two rows above) relies on this: without the
third verdict, narrowing would just turn valid knowledge into wrong answers.

**Kun'yomi are stems in the source data** — WaniKani exports 正's kun reading
as `!ただ`, which is not a word (ただ only surfaces as 正しい / 正す).
`tools/kun-readings.js` (pure, tested) recovers the okurigana from the same
entry's KANJIDIC-style `readings_kun` (`ただ.しい`, where `.` is the stem
boundary and a leading/trailing `-` marks prefix/suffix position) and emits:

- `kunForms` — stem -> okurigana form(s), **only for bound stems**. The UI
  renders these dictionary-style (`ただ・しい`) instead of a naked stem;
  a free-standing kun reading (一's `ひと`, marked `ひと-` = prefix position,
  so the reading itself is complete) gets no entry and is shown as-is.
- `acceptReadings` — on'yomi + kun stems + *every* okurigana form, so both
  ただ and ただしい grade correct.
- `primaryReadings` (what Strict mode demands) — a `!`-marked on'yomi wins;
  otherwise the on'yomi plus any free-standing marked kun reading, because a
  bound stem is not a valid answer for a kanji shown alone (正 -> せい/しょう/
  まさ, never ただ). Kanji with no on'yomi fall back to the stem's full word
  form (込 -> こむ, 咲 -> さく), never the naked stem.

## Design reference

`DESIGN.md` documents the visual design system (colors, typography,
spacing, component styles) as YAML frontmatter + prose — consult it before
making UI/CSS changes so new elements stay consistent with the existing
palette and type scale.

`PLAN.md` and `GOAL.md` are the original build plan/acceptance criteria
(historical — the app has since scaled past their stated Level 1–3 MVP
scope to all 60 levels / 2,026 kanji).
