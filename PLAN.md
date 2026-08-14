# WaniKanji (ワニ漢字) — Implementation Plan

## Summary

A static, browser-only WaniKani-style kanji trainer, **built for PC / typed
input** (not multiple choice, unlike its sibling apps). No backend — plain
HTML/CSS/JS, no build step, no framework, hosted on GitHub Pages at
`bagustris.github.io/wanikanji`. Progress lives in `localStorage` (per-device,
no login/sync), matching `kanji-drill`, `kotoba`, and `jlpt`.

The defining feature versus the sibling apps: a real **SRS engine** and
**typed-answer grading** (romaji→kana conversion + fuzzy meaning matching).
Those two engines are the heart of the project and are built test-first.

**Decisions locked in from Q&A:**
- **SRS:** full WaniKani model — 9 stages (Apprentice 1–4, Guru 1–2, Master,
  Enlightened, Burned), time-gated reviews, level-up gated on radical→kanji
  progression.
- **Item types:** Radicals + Kanji (no vocabulary in MVP — we don't have a
  vocab dataset yet).
- **Level range:** WaniKani Levels **1–3** first (85 kanji, 72 distinct
  radicals), then scale to all 60 levels (2,026 kanji) once the loop is solid.
- **Stack / deploy / storage:** as above (static, buildless, GitHub Pages,
  localStorage).

## Data source & the one real gap

`kanji-wanikani.json` (in repo root, 2,026 kanji) already provides, per kanji:
`wk_level`, `wk_meanings`, `wk_readings_on` / `wk_readings_kun` (the `!` prefix
marks the WaniKani-preferred reading), and `wk_radicals` (radical **names**,
e.g. `"Ground"`, `"Arrow"`).

**The gap:** the data has radical *names* but not radical *glyphs*. WaniKani
radical reviews show the shape and you type the name — so we must curate a
`name → glyph` mapping. For Levels 1–3 that is **72 radicals**, hand-checkable.
Risk: a few WaniKani radicals use custom artwork with no clean Unicode glyph;
we substitute the closest Unicode radical/kanji form and **flag** any that
don't map cleanly. This curation is the main data task in Chunk 1.

## Open items to confirm before/while building

- **Reading acceptance:** WaniKani accepts only the *taught* reading (usually
  the on'yomi, marked with `!` in our data). Plan: grade against the
  `!`-marked reading(s); accept other listed readings as "close, but not what
  we're looking for" (shake + hint) rather than as correct. Confirm this vs.
  "accept any listed reading."
- **Romaji vs. direct kana input:** support typing romaji (auto-converted to
  hiragana as you type, IME-style) *and* pasted/typed kana. Default on.
- **Meaning fuzziness:** accept case/whitespace-insensitive matches plus small
  typos (Levenshtein ≤1 for answers >3 chars), matching WaniKani. Confirm.
- **Session size:** default review batches to ~10 items at a time (WaniKani
  queues all due; we can cap the on-screen queue). Tunable.

---

## Architecture

```
index.html            # single-page app shell, screen containers
style.css             # dark theme consistent with sibling apps
manifest.json, sw.js, icon.svg   # PWA (offline-capable, installable)
README.md, PLAN.md, CHANGELOG.md

data/
  radicals.json       # curated: [{ name, glyph, wk_level, kanji:[...] }]
  kanji.json          # L1–3 subset derived from kanji-wanikani.json
tools/
  build-data.js       # Node: derive data/*.json from kanji-wanikani.json
js/
  data.js             # load + index data; unlock/dependency graph
  kana.js             # romaji→hiragana converter        (+ __tests__)
  grading.js          # reading + meaning answer matching (+ __tests__)
  srs.js              # stages, intervals, scheduling      (+ __tests__)
  progress.js         # localStorage read/write, migration
  app.js              # controller: screens, lessons, reviews, dashboard
```

Testing follows the `kanji-drill` convention: Node built-ins only, run e.g.
`node js/srs/__tests__/run-tests.js`. The three engines (`kana`, `grading`,
`srs`) are pure functions and are built test-first before any UI.

### SRS model (WaniKani-faithful)

| Stage | Name          | Interval to next |
|-------|---------------|------------------|
| 1     | Apprentice 1  | 4 h              |
| 2     | Apprentice 2  | 8 h              |
| 3     | Apprentice 3  | 1 d              |
| 4     | Apprentice 4  | 2 d              |
| 5     | Guru 1        | 1 w              |
| 6     | Guru 2        | 2 w              |
| 7     | Master        | 1 mo             |
| 8     | Enlightened   | 4 mo             |
| 9     | Burned        | — (retired)      |

- **Correct** → advance one stage, schedule `now + interval(newStage)`.
- **Incorrect** → drop stages by `ceil(incorrect/2) × penalty`, where
  `penalty = 2` if current stage ≥ Guru else `1` (WaniKani's formula); never
  below stage 1.
- A **kanji** has two subjects to answer per review — **meaning** and
  **reading** — and only advances when both are cleared that session;
  incorrect answers on either accumulate. **Radicals** have meaning only.
- Per-item state persisted: `{ stage, dueAt, correct, incorrect, unlockedAt,
  burnedAt }`.

### Progression / unlock logic

- Starting a level unlocks that level's **radicals** for lessons.
- A **kanji** unlocks for lessons once all its component radicals reach
  **Guru** (stage ≥ 5).
- The level is **passed** (next level's radicals unlock) when **90%** of the
  level's kanji reach Guru — WaniKani's rule.

---

## Chunks

Each chunk is implemented and verified (serve locally, `python3 -m
http.server`, or run the Node tests) before moving on.

**Chunk 1 — Data pipeline & radical curation**
- `tools/build-data.js` derives `data/kanji.json` (L1–3 subset with
  meanings + `!`-flagged readings) from `kanji-wanikani.json`.
- Curate `data/radicals.json`: the 72 L1–3 radicals with `name → glyph` and
  the kanji each composes. Flag any radical with no clean Unicode glyph.
- Sanity-check counts (18 / 36 / 31 kanji for L1/2/3).

**Chunk 2 — Engines, test-first (no UI)**
- `kana.js`: romaji→hiragana — small tsu (っ), ん, youon (ゃゅょ), long
  vowels; full test suite.
- `grading.js`: reading match (against `!`-preferred) and meaning match
  (normalize + Levenshtein ≤1); test suite.
- `srs.js`: stage transitions, interval math, incorrect-penalty; test suite.

**Chunk 3 — App shell, data loading & persistence**
- `index.html` + `style.css` (dark theme like siblings), screen router in
  `app.js`, `data.js` indexing, `progress.js` localStorage layer + a dashboard
  showing per-stage counts and what's due.

**Chunk 4 — Lessons flow**
- Introduce new radicals/kanji (meaning + reading info cards), then enter them
  into SRS at Apprentice 1 with a first `dueAt`.

**Chunk 5 — Reviews flow**
- Typed-input review session: romaji→kana field, grading, shake-don't-fail
  retry, per-item SRS update, end-of-session summary.

**Chunk 6 — Progression & unlock gating**
- Radical→kanji unlocking, 90% level-up rule, "lessons available" and
  "reviews due" counts driving the dashboard.

**Chunk 7 — PWA polish**
- `manifest.json`, `sw.js` offline cache, icon, keyboard-first UX (Enter to
  submit/advance), responsive but PC-first layout.

**Chunk 8 — Scale-out (post-MVP)**
- Extend the data pipeline to all 60 levels / 2,026 kanji; verify performance
  and the radical curation at scale.

## Out of scope for MVP (possible later)
- Vocabulary items (needs a dataset), audio readings, mnemonics, account
  sync / cross-device, custom SRS timing, reordering/scripts.
