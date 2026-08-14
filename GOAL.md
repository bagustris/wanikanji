# Goal — WaniKanji MVP (runnable)

## Task
Build a runnable, PC-first, typed-input WaniKani-style kanji trainer covering
WaniKani Levels 1–3, served statically at `http://localhost:8000` via
`python3 -m http.server 8000`.

## Success Criteria
- [ ] `python3 -m http.server 8000` serves a working app at `/` — no console
      errors, data loads via `fetch()`.
- [ ] Full 9-stage SRS engine (Apprentice 1–4, Guru 1–2, Master, Enlightened,
      Burned) with WaniKani intervals and incorrect-penalty; unit tests pass.
- [ ] Typed input: romaji→hiragana as-you-type; reading graded against the
      `!`-preferred reading; unit tests pass.
- [ ] Meaning graded case/space-insensitive with Levenshtein ≤1 typo
      tolerance; unit tests pass.
- [ ] Item types: Radicals (meaning) + Kanji (meaning + reading). 72 L1–3
      radicals have curated glyphs; 85 L1–3 kanji loaded.
- [ ] Lessons introduce items → enter SRS at Apprentice 1. Reviews present due
      items, grade typed answers, update SRS, show a session summary.
- [ ] Progression: kanji unlock when their radicals reach Guru; level passes
      at 90% kanji Guru'd.
- [ ] **Item info** panel after answering shows the kanji's example WORDS and
      a SENTENCE (sourced from kanji-drill data), toggleable on/off in Settings.
- [ ] Progress persists in localStorage across reloads.
- [ ] PWA: manifest + service worker; dark theme consistent with sibling apps.

## Constraints
- Plain HTML/CSS/JS. No framework, no build step, no `package.json`, no runtime
  deps. (A Node `tools/build-data.js` using built-ins only is allowed to
  generate `data/*.json` — not part of the served runtime.)
- Tests use Node built-ins only, runnable as `node js/<eng>/__tests__/run-tests.js`.
- Keyboard-first UX (Enter submits/advances).

## Verification
- `node js/kana/__tests__/run-tests.js` etc. — all pass.
- `python3 -m http.server 8000`, open `/`: complete a lesson, then a review,
  see item info, toggle it in settings, reload and confirm progress persisted.

## Out of scope (MVP)
- Vocabulary as SRS items, audio, mnemonics, account sync, levels 4–60
  (data pipeline should make scaling trivial later).
