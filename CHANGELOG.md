# Changelog

## v0.2.0 — 2026-08-14

Scaled to all 60 WaniKani levels and refined radical/reading handling.

### Added
- **All 60 WaniKani levels** (2,026 kanji, 223 radicals). Dashboard renders only
  unlocked levels plus the next one, so the level list stays usable.
- **Strict readings** setting — grade readings against only the primary reading
  instead of accepting any valid reading (default off).

### Changed
- Radical glyph resolution now uses only trustworthy sources: single-radical
  kanji (192, trusted) + curated Kangxi shapes (31, flagged uncertain). The
  meaning-match heuristic was removed after measurement showed only ~8% of its
  glyphs were plausible radical shapes. 255 unresolvable custom-art radicals are
  omitted from the curriculum rather than shown with faked glyphs; L1–3 kanji
  are unaffected (0 lose their radical prerequisite).
- `data/kanji.json` minified (~944 KB for all 60 levels).
- Example sentences now attach to a kanji only when it is part of the sentence's
  focus (target) word — no incidental matches.
- Service worker cache bumped to `wanikanji-v2`.

## v0.1.0 — 2026-08-14

Initial MVP: PC-first, typed-input WaniKani-style kanji trainer, Levels 1–3.

### Added
- Data pipeline (`tools/build-data.js`) generating `data/kanji.json` (85 kanji)
  and `data/radicals.json` (72 radicals) from `kanji-wanikani.json` plus
  example words/sentences from the `kanji-drill` dataset.
- Romaji→hiragana engine (`js/kana.js`) with as-you-type conversion.
- Answer grading (`js/grading.js`): reading match + fuzzy meaning match
  (Levenshtein-tolerant).
- Full 9-stage SRS engine (`js/srs.js`) with WaniKani intervals and the
  incorrect-answer penalty formula.
- App: dashboard (SRS distribution, level progress), lessons, typed reviews,
  Extra Study, session summary, item-info panel (words + sentence, toggleable),
  settings, localStorage persistence.
- PWA: manifest + service worker (offline), light/dark theme.
- Node-builtin test suites for all three engines; end-to-end progression and
  headless-browser smoke tests.

### Notes
- Four WaniKani custom-art radicals (Narwhal, Fingers, Leaf, Triceratops) use
  best-effort Unicode glyphs, flagged `"uncertain": true` in `radicals.json`.
