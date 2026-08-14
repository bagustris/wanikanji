# ワニ漢字 — WaniKanji

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

- **Radicals → Kanji** progression across **WaniKani Levels 1–3** (72 radicals,
  85 kanji). Vocabulary is out of scope for now; instead each kanji shows
  associated **example words and a sentence** (the "item info" panel) so you
  learn kanji *in order to read* — toggleable in Settings.
- **Full 9-stage SRS** (Apprentice 1–4 → Guru 1–2 → Master → Enlightened →
  Burned) with WaniKani intervals (4h, 8h, 1d, 2d, 1w, 2w, 1mo, 4mo) and the
  incorrect-answer penalty formula.
- **Lessons** introduce new items; **Reviews** quiz the ones that are due;
  **Extra Study** lets you practice learned items any time without touching the
  SRS schedule.
- **Progression gating:** a kanji unlocks once its component radicals reach
  Guru; a level is passed when 90% of its kanji reach Guru, unlocking the next.
- **Typed grading:** readings match any accepted reading (kana); meanings are
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

The source data provides radical **names** but not **glyphs**; the build script
curates a name→glyph map. Four WaniKani custom-art radicals (Narwhal, Fingers,
Leaf, Triceratops) use best-effort Unicode glyphs and are **flagged** in
`data/radicals.json` (`"uncertain": true`) — review/replace as needed.

## Scope / roadmap

MVP is Levels 1–3. The data pipeline already reads all 2,026 kanji, so scaling
to WaniKani's full 60 levels is a matter of raising `MAX_LEVEL` in
`tools/build-data.js` and re-running it. Not yet included: vocabulary as SRS
items, audio readings, mnemonics, cross-device sync. See `PLAN.md` for the
full design and `GOAL.md` for the acceptance criteria.
