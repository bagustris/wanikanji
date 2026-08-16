# ワニ漢字 — WaniKanji

The goal of this project is to help you learn kanji by typing readings and meanings, *in order to read* rather than just memorize readings/meanings.  


A **PC-first, typed-input** WaniKani-style kanji trainer. Unlike its sibling
apps ([kanji-drill](https://github.com/bagustris/kanji-drill),
[kotoba](https://github.com/bagustris/kotoba),
[jlpt](https://github.com/bagustris/jlpt)) which are multiple-choice, WaniKanji
is built around **typing** — you type readings (romaji auto-converts to
hiragana) and meanings, just like WaniKani on a keyboard.

Plain HTML/CSS/JS. **No framework, no build step, no dependencies.** Runs as-is
on GitHub Pages; progress is stored in `localStorage` (per-device).

Live: https://bagustris.github.io/wanikanji

## What it does

- **Kanji-only SRS** across **all 60 WaniKani levels** (2,026 kanji).
  Vocabulary is out of scope for now; instead each kanji shows associated
  **example words and a sentence** (the "item info" panel) so you learn kanji
  *in order to read* — toggleable in Settings.
- **Radicals as a lightweight visual aid, not a review track.** WaniKani's
  223 radicals are shown as small glyph+name chips on each kanji's card
  ("Made of: 一 Ground …") to help recognize its shape — they carry no SRS
  state of their own, are never quizzed, and don't gate anything. Kanji
  memorization is the goal; radicals are a mnemonic, not a 214-radical course.
- **Full 9-stage SRS** (Apprentice 1–4 → Guru 1–2 → Master → Enlightened →
  Burned) with WaniKani intervals (4h, 8h, 1d, 2d, 1w, 2w, 1mo, 4mo) and the
  incorrect-answer penalty formula.
- **Lessons** introduce new kanji; **Reviews** quiz the ones that are due;
  **Extra Study** lets you practice learned items any time without touching the
  SRS schedule. A **Bypass schedule** setting makes every learned item
  reviewable immediately (still updating the SRS) — handy for cramming/testing.
- **Item info** after answering: example words + a sentence for that kanji.
  Toggleable.
- **Progression gating:** a level is passed (unlocking the next) once 90% of
  its kanji reach Guru — no radical prerequisite.
- **Typed grading:** readings match any accepted reading (kana), or only the
  primary reading if **Strict readings** is enabled in Settings; meanings are
  case/space-insensitive with small-typo tolerance (Levenshtein ≤ 1–2).
- Keyboard-first: **Enter** submits and advances, **Esc** reveals the answer,
  **←/→** navigate lesson cards.
- Installable PWA, offline-capable, light/dark theme.

## Run locally

Data is loaded via `fetch()`, which `file://` blocks — serve over HTTP:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Tests

No build tooling; tests use Node built-ins only:

```bash
node js/kana/__tests__/run-tests.js       # romaji -> hiragana
node js/grading/__tests__/run-tests.js    # reading + meaning matching
node js/srs/__tests__/run-tests.js        # SRS stages / intervals / penalty
```

## Data

`data/kanji.json` and `data/radicals.json` are generated from
`kanji-wanikani.json` (WaniKani metadata) plus example words/sentences from the
`kanji-drill` dataset, by:

```bash
node tools/build-data.js
```

### Radical glyphs

The kanji source provides radical **names** but not **glyphs**, so the build
resolves each radical's glyph by precedence (`tools/build-data.js`):

1. **`OVERRIDE`** (4) — hand-resolved cases where the two sources below disagree.
2. **Authoritative** (298) — WaniKani's actual Unicode `character` for the
   radical, from `tools/wk-radicals-source.json`
   ([baerrach/wanikani_exporter], MIT). No inference — WaniKani's real glyph.
3. **Trusted single-radical** (51) — a kanji whose radical list is exactly that
   one radical, so the kanji glyph provably *is* the radical (木 → "Tree").
   Fills names the dataset has since renamed.
4. **Curated** (6) — a small Kangxi fallback, flagged `"uncertain": true` and
   shown with an "≈ approximated" note.

That resolves **359 radicals**. A meaning-match heuristic was tried and
**rejected** (only ~8% of its glyphs were plausible radical shapes — it mapped
"Roof"→屋, "Umbrella"→傘). WaniKani draws ~49 radicals as **custom artwork**
(playful names like *Poop*, *Death Star*) with no Unicode form; those, plus ~70
whose names have drifted, are **omitted** rather than faked and simply don't
appear as a composition chip on the kanji that use them — this has no effect
on lessons/reviews since radicals don't gate anything.

[baerrach/wanikani_exporter]: https://github.com/baerrach/wanikani_exporter

## Scope / roadmap

All 60 WaniKani levels are included. Not yet included: vocabulary as SRS items,
audio readings, mnemonics, cross-device sync, and the ~119 omitted radicals
(custom-art with no Unicode, or renamed in the source). See `PLAN.md` for the
full design and `GOAL.md` for the acceptance criteria.
