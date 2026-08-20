# Changelog

## v0.8.4 — 2026-08-20

### Fixed
- The duplicate-word bug in js/app.js 

## v0.8.3 — 2026-08-17

### Fixed
- **Japanese ASR could transcribe kanji instead of hiragana for a reading
  answer** — Chrome's `ja-JP` recognizer sometimes guesses a short spoken
  word and returns its kanji spelling rather than transliterating the
  sound, which could never match the kana-only grading check. When the
  transcript (after katakana normalization) still contains kanji and
  exactly matches the quizzed kanji or its example word, it's now resolved
  to the item's own known reading instead of being left ungradeable; any
  other kanji transcript is still surfaced as-is (no dictionary, so no
  guessing).

### Added
- **`Alt+M` keyboard shortcut to toggle the mic**, in addition to clicking
  it — consistent with the app's typing-first, keyboard-driven design.
  Listed in the Settings keyboard-shortcuts reference and the mic button's
  tooltip.

## v0.8.2 — 2026-08-17

### Fixed
- **Voice-input result could still overwrite a manually-typed answer** — the
  previous fix stopped a *stale* recognizer from overwriting a retry, but a
  *still-active* one (question unchanged) would unconditionally overwrite
  the input even if the learner started typing by hand while it was
  listening. Now compares the input's value at recognition-start time
  against its current value, and if they differ, shows the transcript in
  the status line instead of overwriting.
- **A `js/speech.js` load failure could silently hang the whole app** —
  `initMic()` referenced the `Speech` global with no guard; if the script
  failed to load (blocked extension, bad cache entry, etc.), the resulting
  `ReferenceError` was unhandled inside `main()`, so `Data.load()` and
  `renderDashboard()` never ran and nothing indicated why. `initMic()` is
  now called inside a try/catch, isolated from the rest of startup.
- **"Listening…" status could get stuck** after a recognizer ended with no
  result and no error (e.g. the user stopped it via the browser's own mic
  indicator) — `onEnd` now clears the status line, not just the button.
- **Mic pulse-ring animation (added last round) never actually appeared** —
  its 50% keyframe was fully transparent, so it only flickered a tight glow
  on/off instead of pulsing outward. Fixed to the standard sonar-ping
  pattern (visible-and-tight → expand-while-fading).

### Changed
- **Deduplicated the mic UI-reset logic** (repeated across `onError`,
  `onEnd`, and the `start()` failure branch) into one `resetMicUI()`
  helper, and the answer-input/mic-button disable pairing into one
  `setAnswerInputEnabled()` helper — both were flagged as duplication that
  a future terminal state could easily forget one half of.
- **Clicking the mic again immediately after a result now starts a new
  recording** instead of requiring a second click to "stop" the
  already-finished previous one first.
- **`#quiz-mic-status` now unhidden before its text is set**, not after —
  `aria-live` only reliably announces mutations on a node already in the
  accessibility tree, and `.hidden` (`display:none`) removes it entirely.

## v0.8.1 — 2026-08-17

### Fixed
- **Stale voice-input result could overwrite a manually-retyped wrong answer**
  — if the mic was tapped and a recognition was still pending when the
  learner instead typed and submitted an incorrect answer, an in-flight
  recognizer wasn't stopped; a later result could silently overwrite the
  retry input and yank focus mid-retype.
- **Opening Settings while the mic was listening didn't stop it** — the
  gear-icon click bypassed the guard the `S` keyboard shortcut had; a
  result arriving while (or after) the settings dialog was open could
  overwrite the quiz input from underneath it. Both entry points now go
  through one `openSettings()` helper.
- **Silent failure if a browser exposes `SpeechRecognition` but refuses to
  run it** (e.g. a restrictive microphone Permissions-Policy) — construction
  and `start()` weren't guarded, so the exception could propagate out of the
  click handler with no visible feedback. Both are now caught and surfaced
  as the same "Voice input unavailable" status message other failures show.

### Changed
- **Mic lifecycle centralized into `show()`** (the single choke point every
  screen transition already goes through) instead of being hand-called at
  five separate sites — the two bugs above were exactly this kind of gap.
  Simplified the stale-callback guard from a separately-incremented counter
  to comparing each callback's own recognizer against the current one by
  identity, removing a second piece of state that could drift out of sync
  with it.
- **Mic button now disables alongside the answer input** after a correct
  answer or reveal/skip, instead of staying clickable but silently
  no-opping; its `aria-label` also switches to "Stop listening" while active.

## v0.8.0 — 2026-08-17

### Added
- **Optional voice input** — a mic button next to the answer field lets you
  speak instead of type, via the Web Speech API (`js/speech.js`). English
  ASR (`en-US`) for meaning questions, Japanese ASR (`ja-JP`) for reading
  questions. Feature-detected: the button is simply absent in browsers
  without `SpeechRecognition` support (Firefox, most Safari). A result only
  fills the input — it never auto-submits, so a mishearing is always
  caught before grading. Katakana transcripts (common for isolated-word
  Japanese ASR) are converted to hiragana automatically; kanji
  transcriptions are left as-is and shown to the user rather than guessed
  at, since there's no dictionary here to recover a reading from them.
  Note: unlike the rest of this offline-first PWA, voice input needs an
  internet connection in most browsers (the ASR itself runs server-side).

## v0.7.2 — 2026-08-17

### Changed
- **Compound-context target kanji: highlight box instead of underline** — an
  underline under a kanji glyph can visually merge with its bottom strokes;
  a tinted background box around the character reads more clearly as "this
  is the one to answer" without touching the glyph itself.

## v0.7.1 — 2026-08-17

### Fixed
- **Near-duplicate example words** (e.g. 丁寧な *and* 丁寧, 幸せな *and* 幸せ) —
  the build pipeline's sentence-word-folding step matched by exact string, so
  a sentence targeting a na-adjective's bare stem ("丁寧") wasn't recognized
  as the same word as the already-listed inflected form ("丁寧な") and got
  folded in as a spurious 5th entry. 11 kanji affected. Fixed by matching
  modulo a trailing な, and — when a match is found — keeping the surface
  form the example *sentence* actually uses instead of carrying both.
  (kanji-drill's source only lists 4 example words per kanji, so there was
  no other distinct word to substitute in; the fix dedupes to the 4
  original words rather than inventing a fake 5th.)

## v0.7.0 — 2026-08-17

Keyboard-navigation pass (this app is typing-first — every control should be
reachable without a mouse) plus clearer SRS-stage info.

### Added
- **`D` (dashboard) and `S` (settings) shortcuts** — work from any screen,
  including the session summary screen, which previously had no keyboard
  shortcut at all (mouse-only "Back to dashboard" button). Suppressed while
  actively typing a quiz answer, so a `d`/`s` reading/meaning never gets
  eaten. A "Keyboard shortcuts" reference row was added to Settings listing
  every binding.
- **Arrow-key navigation for the lesson-batch-size selector** (3/5/10) —
  `←`/`→`/`↑`/`↓` move focus and selection between options (wraps at the
  ends), matching native radiogroup behavior; previously mouse/click-only.
- **"Reviews needed to level up" on each SRS-stage tile** — e.g. Apprentice
  now shows "4 correct to Guru", Guru shows "2 correct to Master", etc.
  Learners previously had no way to know how many correct reviews move a
  kanji from one SRS stage to the next.

### Changed
- **Full SRS-stage names instead of abbreviations** — "Appr." → "Apprentice",
  "Enlt." → "Enlightened" on the dashboard's SRS-stage tiles.

### Fixed
- **Reading/meaning question type shown twice** — the quiz prompt showed a
  redundant badge (e.g. "MEANING 意味") directly above the identical
  "意味 Meaning" label. Removed the duplicate badge and its now-dead CSS.
- **Bold example words unreadable for some kanji** — `.item-info .word .jp`
  no longer forces `font-weight: 700`; bold strokes were clipping/merging on
  visually dense kanji.

## v0.6.0 — 2026-08-17

Dashboard restyled around a new "Zenith Kanji" design system (see
`DESIGN.md`), inspired by a Google Stitch mockup.

### Changed
- **Dashboard/visual redesign** — new color tokens, radius scale, and
  typography roles (mono for technical labels/readings, headline font for
  numbers/glyphs) applied throughout. Lessons/Reviews CTA cards changed from
  solid gradient fills to white "tonal" cards with a colored status dot and
  pill-shaped "Start" button. Root font size raised to 19px for PC reading
  distance. Accessibility pass: `role="radio"`/`aria-checked` on the lesson-
  batch-size control, `aria-live` on quiz feedback and banners, heading
  hierarchy fix.

### Fixed
- **White text unreadable on pastel buttons/tiles in dark mode** — several
  category colors intentionally go pastel-light in dark mode (correct for
  text drawn on the dark background), but were also reused as *backgrounds*
  paired with hardcoded white text (CTA buttons, SRS-stage tiles, primary
  buttons, radical chips, toggle switches, the active batch-size pill) —
  nearly invisible in dark mode. Added theme-constant `--fill-*` tokens
  (≥4.5:1 contrast against white in both themes) for anything pairing a
  solid color with white text/icons.
- **`--enlightened` SRS-stage color failed contrast even in light mode**
  (2.56:1, vs. the 4.5:1 AA minimum) — replaced with a darker blue (4.90:1).
- **`--incorrect` (wrong-answer red) had no dark-mode override** — stayed at
  its light-mode value, ~2.5:1 contrast against the dark background for
  quiz feedback text/borders and the "Reset progress" button.
- **Stale PWA theme colors** — `manifest.json` and `index.html`'s
  `theme-color` still referenced the pre-redesign dark background.
- **Service worker cache version not bumped** despite `style.css`/`app.js`/
  `index.html` all changing — installed-PWA users would see one stale load
  before updating.

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
