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
                                         fuzz; reading: exact kana match
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
below).

**Non-standalone kanji** (bound morphemes with no independent reading, e.g.
性, 工) are shown/quizzed inside a compound word instead of alone; `context`
+ `contextGlyphHTML()` in `app.js` render the target kanji highlighted with
furigana on the rest, derived at build time by `tools/furigana.js`.

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

Meanings: case/space-insensitive, comma/slash-split accepted-answer list,
Levenshtein-tolerant (distance 0 for ≤3 chars, 1 for >3, 2 for ≥8 — see
`allowedDistance()` in `grading.js`). Readings: exact hiragana match against
the accepted-reading list (or only the primary/`!`-marked reading if
**Strict readings** is on in Settings); romaji is converted via `kana.js`
before grading.

## Design reference

`DESIGN.md` documents the visual design system (colors, typography,
spacing, component styles) as YAML frontmatter + prose — consult it before
making UI/CSS changes so new elements stay consistent with the existing
palette and type scale.

`PLAN.md` and `GOAL.md` are the original build plan/acceptance criteria
(historical — the app has since scaled past their stated Level 1–3 MVP
scope to all 60 levels / 2,026 kanji).
