// Reading derivation for tools/build-data.js — pure, Node-only (build time).
// Unit-tested by tools/__tests__/kun-readings-tests.js.
//
// The WaniKani export gives kun'yomi as bare STEMS ("!ただ" for 正), which is
// not a word: ただ only exists as ただしい / ただす. The same entry's
// KANJIDIC-style `readings_kun` keeps the okurigana with the stem boundary
// marked by ".", and prefix/suffix position by a leading/trailing "-":
//
//   readings_kun:    ["ただ.しい", "ただ.す", "まさ", "まさ.に"]
//   wk_readings_kun: ["!ただ", "!まさ"]
//
// So the okurigana is available in the source and was simply being dropped.
// This module puts it back (`kunForms`) and stops a bound stem from being
// demanded as the answer for a bare kanji (`primaryReadings`).

'use strict';

function stripMark(r) { return String(r).replace(/^[!^]/, ''); }
function isMarked(r) { return String(r).startsWith('!'); }
function undot(r) { return String(r).replace(/\./g, ''); }

// KANJIDIC kun readings, hyphen markers dropped, deduped, order preserved.
function kanjidicKun(entry) {
  const seen = new Set();
  const out = [];
  for (const raw of entry.readings_kun || []) {
    const r = String(raw).replace(/-/g, '').trim();
    if (!r || seen.has(r)) continue;
    seen.add(r);
    out.push(r);
  }
  return out;
}

// For each WaniKani kun stem, three things:
//   kunForms — the okurigana a BOUND stem needs to be a word (ただ ->
//              ただ.しい). This is what the UI displays, so a free-standing
//              stem deliberately gets no entry: it is already answerable and
//              is shown as-is. A trailing/leading "-" in KANJIDIC ("ひと-")
//              marks prefix/suffix *position*, not missing okurigana — ひと is
//              the whole reading of 一 in 一人, so it stays free.
//   freeKun  — the stems that stand alone.
//   allForms — every okurigana form seen, free stems included, so a learner
//              answering 一 with ひとつ is still marked correct.
//
// Two shapes of match, because the two sources don't always agree on where
// the stem ends:
//   stem + okurigana — "ただ" matches "ただ.しい"   (the normal case)
//   stem is the whole word — "かえって" matches "かえ.って", "まず" -> "ま.ず"
// The second kind is already a word, so it stays free.
//
// A stem the KANJIDIC list doesn't cover at all (source disagreements like
// 各 "おの" vs "おのおの", or 察 with no kun list) is left free and formless:
// better to keep showing it as-is than to drop the only reading we have.
function deriveKunForms(entry) {
  const dict = kanjidicKun(entry);
  const bare = new Set(dict.filter((r) => !r.includes('.')));
  const dotted = dict.filter((r) => r.includes('.'));
  const kunForms = {};
  const free = new Set();
  const allForms = new Set();
  for (const stem of (entry.wk_readings_kun || []).map(stripMark)) {
    const withOkurigana = dotted.filter((f) => f.split('.')[0] === stem);
    const wholeWord = dotted.filter((f) => undot(f) === stem);
    for (const f of [...withOkurigana, ...wholeWord]) allForms.add(f);
    if (bare.has(stem) || wholeWord.length || !withOkurigana.length) {
      // Already a word on its own: nothing to attach. A whole-word stem keeps
      // its boundary anyway (かえって -> かえ・って) since that's how it's
      // written; a formless one is simply shown as-is.
      free.add(stem);
      if (wholeWord.length && !bare.has(stem)) kunForms[stem] = wholeWord;
    } else {
      kunForms[stem] = withOkurigana;
    }
  }
  return { kunForms, freeKun: [...free], allForms: [...allForms] };
}

// The reading(s) the optional Strict-readings mode accepts for the bare
// glyph, in the order a learner should think of them:
//
//   1. A "!"-marked on'yomi wins outright — that's the taught reading.
//   2. Otherwise: the on'yomi, plus any "!"-marked kun reading that is a
//      free-standing word. A bound stem (ただ of 正しい, ひと of 一つ) is
//      never a valid answer for the kanji shown alone, so it is replaced by
//      the on'yomi rather than demanded.
//   3. A kanji with no on'yomi at all falls back to the kun readings as
//      WORDS — a bound stem contributes its okurigana form (込 -> こむ,
//      咲 -> さく), never the naked stem.
//   4. Last resort (no marks at all): the on'yomi, else those same word forms.
function derivePrimary(entry, { on, kun, kunForms, freeKun }) {
  const markedOn = (entry.wk_readings_on || []).filter(isMarked).map(stripMark);
  if (markedOn.length) return [...new Set(markedOn)];

  const markedKun = (entry.wk_readings_kun || []).filter(isMarked).map(stripMark);
  const freeSet = new Set(freeKun);
  // A stem as a standalone answer: itself if free, else its okurigana form(s).
  const asWords = (stems) => stems.flatMap((s) => (freeSet.has(s) || !kunForms[s]
    ? [s]
    : kunForms[s].map(undot)));

  let primary = [...new Set([...on, ...markedKun.filter((s) => freeSet.has(s))])];
  if (!primary.length) primary = [...new Set(asWords(markedKun))];
  if (!primary.length) primary = on.length ? on : [...new Set(asWords(kun))];
  return primary;
}

// Everything accepted for a kanji's reading question in normal (non-strict)
// mode: on'yomi, the kun stems, and every okurigana form — so answering 正
// with ただしい is correct, not just the stem ただ.
function deriveReadings(entry) {
  const on = [...new Set((entry.wk_readings_on || []).map(stripMark))];
  const kun = [...new Set((entry.wk_readings_kun || []).map(stripMark))];
  const { kunForms, freeKun, allForms } = deriveKunForms(entry);
  const fullForms = allForms.map(undot);
  const acceptReadings = [...new Set([...on, ...kun, ...fullForms])];
  const primaryReadings = derivePrimary(entry, { on, kun, kunForms, freeKun });
  return { on, kun, kunForms, freeKun, acceptReadings, primaryReadings };
}

module.exports = { deriveReadings, deriveKunForms, derivePrimary, kanjidicKun, undot };
