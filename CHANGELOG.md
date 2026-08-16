# Changelog

## v0.5.0 — 2026-08-16

Non-standalone kanji (bound on'yomi morphemes with no independent reading,
e.g. 性, 工, 的) are now taught and quizzed inside their most common
compound/okurigana word instead of in isolation.

### Added
- **Compound/okurigana context for non-standalone kanji** — 448 of 2026 kanji
  have no kun'yomi and no standalone example word (e.g. 研 in 研究, 美 in
  美しい). For these, the lesson card and reading quiz now show the kanji
  inside its most common compound (other character furigana'd) or with its
  okurigana, highlighting the target character. Grading is unaffected — it
  still checks the target's own accepted readings; the context is
  presentation only. Resolved for 423/448 (94%) via a build-time
  reading-matching algorithm (`tools/furigana.js`, rendaku/sokuon-aware);
  the rest fall back to the plain isolated glyph, unchanged from before.
- **Meanings + readings in item info** — after answering a lesson/review item,
  the info panel now shows the kanji's meanings and On/Kun readings, in
  addition to the existing example words and example sentence.

### Changed
- **Wider desktop layout** — `--maxw` raised from 560px to 900px. Unlike its
  mobile-first siblings (kanji-drill, kotoba, jlpt), WaniKanji targets PC, so
  the app no longer sits in a narrow centered column on desktop screens.

### Fixed
- **`^`-marked readings/meanings leaking into grading and display** — the
  WaniKani source data prefixes uncommon readings/meanings with `^` (e.g.
  工's second on'yomi is `^く`), separate from the `!` primary-reading marker.
  Only `!` was being stripped, so a literal `^` landed in `acceptReadings`
  for 80 kanji — breaking their exact-match reading grading — and in
  `meanings`, showing raw text like "^Industry" in the UI.

## v0.3.1 — 2026-08-16

### Fixed
- **Romaji `nn` mis-conversion** — typing `nn` (e.g. as the WaniKani-style way to
  force a single ん) produced んん instead of ん. Also fixed the related case
  `"konnya"` converting to こんにゃ instead of こんや. `"onna"` → おんな (second
  `n` starting a new syllable before a plain vowel) is unaffected.

## v0.3.0 — 2026-08-14

Authoritative radical glyphs, radical item info, and a schedule-bypass setting.

### Added
- **Authoritative radical glyphs** — radical shapes now come from WaniKani's real
  Unicode characters (vendored `tools/wk-radicals-source.json`,
  [baerrach/wanikani_exporter], MIT), resolving **359 radicals** (was 223) and
  cutting un-gated kanji from 239 to 83. Precedence: override → authoritative →
  trusted single-radical → curated. Each radical records its `source`.
- **Radical item info** — after answering a radical (or on its lesson card), the
  panel lists the kanji that use it, with meanings (mirrors kanji example words).
- **Bypass schedule** setting — treat all learned items as due, ignoring SRS
  timing (reviews still update the SRS). For cramming/testing.

### Changed
- Dropped the meaning-match heuristic entirely (measured ~8% plausible glyphs).
- Service worker cache bumped to `wanikanji-v3`.

[baerrach/wanikani_exporter]: https://github.com/baerrach/wanikani_exporter

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
