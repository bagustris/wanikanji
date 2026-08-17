#!/usr/bin/env node
// Derive data/kanji.json + data/radicals.json for WaniKani Levels 1-3.
// Node built-ins only. Not part of the served runtime.
//
// Sources:
//   ../kanji-wanikani.json                  (WK levels, meanings, readings, radicals)
//   ../../kanji-drill/data/grade*.json       (per-kanji example WORDS)
//   ../../kanji-drill/data/sentences*.json    (example SENTENCES)

const fs = require('fs');
const path = require('path');
const { deriveContext } = require('./furigana.js');

const ROOT = path.join(__dirname, '..');
const KD = path.join(ROOT, '..', 'kanji-drill', 'data');
const OUT = path.join(ROOT, 'data');
const MAX_LEVEL = 60;

function readJSON(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }

// --- Radical glyph resolution --------------------------------------------
// The kanji source has radical NAMES but no glyphs. We resolve a glyph by
// precedence (highest first):
//   1. OVERRIDE — hand-resolved cases where AUTH and SINGLE disagree.
//   2. AUTH     — WaniKani's authoritative Unicode `character` for the radical
//                 (tools/wk-radicals-source.json, matched on name). The right
//                 answer: no inference, just WaniKani's actual character.
//   3. SINGLE   — a kanji whose wk_radicals is exactly [thisRadical]; the kanji
//                 glyph provably *is* the radical (木 -> "Tree"). Fills gaps
//                 where the AUTH dataset's names have drifted from ours.
//   4. CURATED  — small hand-mapped Kangxi fallback, flagged `uncertain`.
// A meaning-match heuristic was tried and rejected (~8% plausible: "Roof"->屋).
// Radicals WaniKani ships only as an image (no Unicode) — and any we still
// can't resolve — are OMITTED; kanji simply drop them as prerequisites.

// AUTH source: name(lowercased) -> Unicode character; image-only names tracked.
const AUTH = {};
const IMG_ONLY = new Set();
for (const r of readJSON(path.join(__dirname, 'wk-radicals-source.json'))) {
  const m = (r.meaning || '').trim().toLowerCase();
  if (r.character) AUTH[m] = r.character;
  else if (r.image) IMG_ONLY.add(m);
}

// Overrides for the 4 AUTH-vs-SINGLE disagreements (AUTH wrong on Elephant/Task).
const OVERRIDE = { Fins: 'ハ', Barb: '亅', Elephant: '象', Task: '用' };

// Kangxi fallback used only when AUTH and SINGLE both miss (and the radical is
// not image-only in AUTH, which would mean WaniKani deliberately has no glyph).
const CURATED = {
  Toe: '卜', Drop: '丶', Slide: 'ノ', Lid: '亠', Head: '冂', Legs: '儿',
  Private: '厶', Dry: '干', Bow: '弓', Winter: '夂', Spoon: '匕',
  Towel: '巾', Canopy: '广', Narwhal: 'ナ',
  Axe: '斤', Coffin: '匚', Flowers: '艹', Frostbite: '冫', Hook: '亅',
  Horns: '丷', Knife: '刂', Net: '网', Pig: '豕', Stamp: '卩', Twenty: '廿',
  Weapon: '戈', Brush: '聿', Bed: '爿', Cactus: '屮', Hills: '阝',
};

// Source markers: "!" = primary reading, "^" = uncommon/nonstandard reading
// or meaning (WaniKani exporter convention). Both are stripped for actual
// use (grading, display) — "^" is not carried through anywhere else, so a
// left-in "^" broke exact-match reading grading and showed literal carets
// in the UI (e.g. 工's second meaning rendered as "^Industry").
function stripMark(r) { return r.replace(/^[!^]/, ''); }
function isPrimary(r) { return r.startsWith('!'); }

// --- Build example WORDS and SENTENCES indexes keyed by kanji char ---
function buildKanjiDrillIndex() {
  const words = {};   // char -> [{word, reading, gloss}]
  const sents = {};   // char -> [{sentence, reading, translation}]
  for (let g = 1; g <= 9; g++) {
    const gf = path.join(KD, `grade${g}.json`);
    if (fs.existsSync(gf)) {
      for (const e of readJSON(gf)) {
        if (e.kanji && Array.isArray(e.examples)) words[e.kanji] = e.examples;
      }
    }
    const sf = path.join(KD, `sentences${g}.json`);
    if (fs.existsSync(sf)) {
      for (const s of readJSON(sf)) {
        // Attach a sentence to a kanji only when it is part of the sentence's
        // TARGET word (the word the sentence is built around) — so the kanji
        // is actually the focus, not merely incidental. "words mostly used
        // with that kanji" per the app's reading-first goal.
        const target = s.target || '';
        for (const ch of new Set(target)) {
          if (/[一-鿿]/.test(ch)) {
            (sents[ch] = sents[ch] || []).push({
              sentence: s.sentence,
              translation: s.translation || '',
              target,
              targetReading: ((s.readings && s.readings[0]) || '').replace(/\./g, ''),
              targetGloss: s.meaning || '',
            });
          }
        }
      }
    }
  }
  return { words, sents };
}

function main() {
  const wk = readJSON(path.join(ROOT, 'kanji-wanikani.json'));
  const { words, sents } = buildKanjiDrillIndex();

  const kanji = [];
  const radicalKanji = {};   // name -> [chars]
  const radicalLevel = {};   // name -> min level
  let sentenceWordFoldedIn = 0;

  // char -> {on, kun}, for ALL WaniKani kanji regardless of level filter, so
  // deriveContext() can look up a compound partner's readings even when that
  // partner is outside 1..MAX_LEVEL.
  const readingsByChar = {};
  for (const [ch, v] of Object.entries(wk)) {
    readingsByChar[ch] = {
      on: (v.wk_readings_on || []).map(stripMark),
      kun: (v.wk_readings_kun || []).map(stripMark),
    };
  }

  for (const [ch, v] of Object.entries(wk)) {
    const lvl = v.wk_level;
    if (!(lvl >= 1 && lvl <= MAX_LEVEL)) continue;

    const on = (v.wk_readings_on || []).map(stripMark);
    const kun = (v.wk_readings_kun || []).map(stripMark);
    const marked = [...(v.wk_readings_on || []), ...(v.wk_readings_kun || [])]
      .filter(isPrimary).map(stripMark);
    const allReadings = [...new Set([...on, ...kun])];
    // "primary" reading used by the optional Strict-readings mode: the
    // "!"-marked reading(s) if present, else all on'yomi, else kun.
    const primary = marked.length ? marked : (on.length ? on : kun);

    const rads = v.wk_radicals || [];
    for (const r of rads) {
      (radicalKanji[r] = radicalKanji[r] || []).push(ch);
      radicalLevel[r] = Math.min(radicalLevel[r] ?? 99, lvl);
    }

    // One sentence whose target word contains this kanji (else none — a
    // sentence where the kanji is incidental would undercut the purpose).
    // Prefer a sentence built around a word already in the example-words
    // list, so the sentence never introduces vocabulary the learner hasn't
    // seen; if every candidate sentence's target word is new, fold that
    // word into the example list instead of teaching it silently.
    //
    // Matching is done modulo a trailing な (na-adjective inflection) so a
    // sentence targeting "丁寧" doesn't get folded in as a "new" word next
    // to the already-present "丁寧な" — same vocabulary, different surface
    // form. When that happens, the example-list entry is swapped to the
    // form actually used in the sentence rather than carrying both.
    const stripNa = w => w.replace(/な$/, '');
    const exampleWords = (words[ch] || []).slice(0, 4);
    const sList = sents[ch] || [];
    const sPref = sList.find(s => exampleWords.some(w => stripNa(w.word) === stripNa(s.target))) || sList[0] || null;
    const matchIdx = sPref ? exampleWords.findIndex(w => stripNa(w.word) === stripNa(sPref.target)) : -1;
    let examples;
    if (sPref && matchIdx !== -1 && exampleWords[matchIdx].word !== sPref.target) {
      examples = exampleWords.map((w, i) => i === matchIdx
        ? { word: sPref.target, reading: sPref.targetReading, gloss: sPref.targetGloss }
        : w);
    } else {
      const sentenceIntroducesNewWord = sPref && matchIdx === -1;
      if (sentenceIntroducesNewWord) sentenceWordFoldedIn++;
      examples = sentenceIntroducesNewWord
        ? [...exampleWords, { word: sPref.target, reading: sPref.targetReading, gloss: sPref.targetGloss }].slice(0, 5)
        : exampleWords;
    }

    // Whether this kanji can be sensibly asked about on its own: it has a
    // kun'yomi (so it can carry okurigana / stand alone as a native word) or
    // one of its example words is just the bare kanji itself. Kanji that are
    // on'yomi-only bound morphemes (性, 的, 工, ...) fail both and are almost
    // never read/used in isolation — quizzing them alone teaches a reading
    // nobody uses standalone.
    const standalone = kun.length > 0 || examples.some(w => w.word === ch);
    // Only non-standalone kanji need a display context (compound/okurigana)
    // for the reading question — standalone kanji are already fine to ask
    // about in isolation. Uses `examples` (not `exampleWords`) so a
    // sentence-folded-in word (e.g. 訟, which has no kanji-drill examples of
    // its own) is available to derive from too.
    const context = standalone ? null : deriveContext(ch, examples, readingsByChar);

    kanji.push({
      char: ch,
      level: lvl,
      meanings: (v.wk_meanings && v.wk_meanings.length ? v.wk_meanings : v.meanings || []).map(stripMark),
      readingsOn: on,
      readingsKun: kun,
      primaryReadings: primary.length ? primary : allReadings.slice(0, 1),
      acceptReadings: allReadings.length ? allReadings : [],
      radicals: rads,
      examples,
      sentence: sPref ? { sentence: sPref.sentence, translation: sPref.translation } : null,
      standalone,
      context,
    });
  }

  // --- Radicals ---
  // Auto-fill glyph from a single-radical kanji when possible.
  const singleGlyph = {};
  for (const k of kanji) {
    if (k.radicals.length === 1) {
      const r = k.radicals[0];
      if (!(r in singleGlyph)) singleGlyph[r] = k.char;
    }
  }
  const radicals = [];
  const omitted = { imageOnly: [], unknown: [] };
  for (const [name, chars] of Object.entries(radicalKanji)) {
    const lower = name.toLowerCase();
    // Precedence: OVERRIDE > AUTH (WaniKani char) > SINGLE (trusted) > CURATED.
    let glyph = '', source = '';
    if (OVERRIDE[name]) { glyph = OVERRIDE[name]; source = 'override'; }
    else if (AUTH[lower]) { glyph = AUTH[lower]; source = 'wanikani'; }
    else if (singleGlyph[name]) { glyph = singleGlyph[name]; source = 'single'; }
    else if (CURATED[name] && !IMG_ONLY.has(lower)) { glyph = CURATED[name]; source = 'curated'; }
    if (!glyph) { (IMG_ONLY.has(lower) ? omitted.imageOnly : omitted.unknown).push(name); continue; }
    radicals.push({
      name,
      glyph,
      source,
      level: radicalLevel[name],
      kanji: chars,
      ...(source === 'curated' ? { uncertain: true } : {}),
    });
  }

  kanji.sort((a, b) => a.level - b.level || 0);
  radicals.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));

  fs.mkdirSync(OUT, { recursive: true });
  // kanji.json is large (all 60 levels) -> minified. radicals.json stays
  // pretty so the curated/uncertain glyphs are easy to review by hand.
  fs.writeFileSync(path.join(OUT, 'kanji.json'), JSON.stringify(kanji));
  fs.writeFileSync(path.join(OUT, 'radicals.json'), JSON.stringify(radicals, null, 1));

  // --- Report ---
  const byLvl = l => kanji.filter(k => k.level === l).length;
  const bySource = s => radicals.filter(r => r.source === s).length;
  const noExamples = kanji.filter(k => k.examples.length === 0).length;
  const withSentence = kanji.filter(k => k.sentence).length;
  // kanji that lost ALL radical prereqs because their radicals were omitted
  const radNames = new Set(radicals.map(r => r.name));
  const zeroRadical = kanji.filter(k => k.radicals.length && !k.radicals.some(r => radNames.has(r)));
  const zeroL13 = zeroRadical.filter(k => k.level <= 3).length;
  console.log(`kanji: ${kanji.length} (L1=${byLvl(1)} L2=${byLvl(2)} L3=${byLvl(3)}), levels 1..${MAX_LEVEL}`);
  console.log(`radicals resolved: ${radicals.length} ` +
    `(wanikani=${bySource('wanikani')}, single=${bySource('single')}, ` +
    `curated=${bySource('curated')}, override=${bySource('override')})`);
  console.log(`radicals omitted: image-only=${omitted.imageOnly.length}, unknown=${omitted.unknown.length}`);
  console.log(`kanji with zero resolvable radicals: ${zeroRadical.length} total, ${zeroL13} in L1-3`);
  console.log(`kanji with example words: ${kanji.length - noExamples}/${kanji.length}`);
  console.log(`kanji with a focus-word sentence: ${withSentence}/${kanji.length}`);
  console.log(`sentences whose target word had to be folded into examples: ${sentenceWordFoldedIn}`);
  const nonStandaloneKanji = kanji.filter(k => !k.standalone);
  const withContext = nonStandaloneKanji.filter(k => k.context).length;
  console.log(`kanji flagged non-standalone (no kun, no bare-kanji example word): ${nonStandaloneKanji.length}/${kanji.length}`);
  console.log(`  of those, resolved a display context (compound/okurigana): ${withContext}/${nonStandaloneKanji.length}`);
  if (zeroL13 > 0) {
    console.error(`\n✗ FAIL: ${zeroL13} L1-3 kanji lost their radical prerequisite: ` +
      zeroRadical.filter(k => k.level <= 3).map(k => k.char).join(''));
    process.exit(1);
  }
}

main();
