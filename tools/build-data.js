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

const ROOT = path.join(__dirname, '..');
const KD = path.join(ROOT, '..', 'kanji-drill', 'data');
const OUT = path.join(ROOT, 'data');
const MAX_LEVEL = 60;

function readJSON(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }

// --- Radical glyph resolution --------------------------------------------
// The source data has radical NAMES but not glyphs. We resolve a glyph from
// only two trustworthy sources:
//   1. CURATED  — hand-mapped standard Kangxi shapes (flagged `uncertain`,
//                 meaning "hand-guessed, may differ from WaniKani's artwork").
//   2. SINGLE   — a kanji whose wk_radicals is exactly [thisRadical]; then the
//                 kanji glyph provably *is* the radical (e.g. 木 -> "Tree").
// A meaning-match heuristic was tried and rejected: only ~8% of its glyphs
// were plausible radical shapes (it mapped "Roof"->屋, "Umbrella"->傘, etc.).
// Radicals we cannot resolve either way are OMITTED from the curriculum
// rather than shown with a wrong/faked glyph; kanji drop them as prereqs.
const CURATED = {
  Toe: '卜', Drop: '丶', Slide: 'ノ', Lid: '亠', Head: '冂', Legs: '儿',
  Private: '厶', Dry: '干', Bow: '弓', Stick: '丨', Winter: '夂', Spoon: '匕',
  Towel: '巾', Canopy: '广', Narwhal: 'ナ',
  Axe: '斤', Coffin: '匚', Flowers: '艹', Frostbite: '冫', Hook: '亅',
  Horns: '丷', Knife: '刂', Net: '网', Pig: '豕', Stamp: '卩', Twenty: '廿',
  Weapon: '戈', Brush: '聿', Bed: '爿', Cactus: '屮', Hills: '阝',
};

function stripMark(r) { return r.replace(/^!/, ''); }
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

    // one sentence whose target word contains this kanji (else none — a
    // sentence where the kanji is incidental would undercut the purpose).
    const sList = sents[ch] || [];
    const sPref = sList[0] || null;

    kanji.push({
      char: ch,
      level: lvl,
      meanings: v.wk_meanings && v.wk_meanings.length ? v.wk_meanings : v.meanings || [],
      readingsOn: on,
      readingsKun: kun,
      primaryReadings: primary.length ? primary : allReadings.slice(0, 1),
      acceptReadings: allReadings.length ? allReadings : [],
      radicals: rads,
      examples: (words[ch] || []).slice(0, 4),
      sentence: sPref ? { sentence: sPref.sentence, translation: sPref.translation } : null,
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
  const omitted = [];
  for (const [name, chars] of Object.entries(radicalKanji)) {
    // CURATED (hand-guessed) wins; else SINGLE (trusted). No glyph -> omit.
    const curated = CURATED[name];
    const glyph = curated || singleGlyph[name] || '';
    if (!glyph) { omitted.push(name); continue; }
    radicals.push({
      name,
      glyph,
      level: radicalLevel[name],
      kanji: chars,
      ...(curated ? { uncertain: true } : {}),   // curated = hand-guessed shape
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
  const uncertain = radicals.filter(r => r.uncertain).map(r => r.name);
  const noExamples = kanji.filter(k => k.examples.length === 0).length;
  const withSentence = kanji.filter(k => k.sentence).length;
  // kanji that lost ALL radical prereqs because their radicals were omitted
  const radNames = new Set(radicals.map(r => r.name));
  const zeroRadical = kanji.filter(k => k.radicals.length && !k.radicals.some(r => radNames.has(r)));
  const zeroL13 = zeroRadical.filter(k => k.level <= 3).length;
  console.log(`kanji: ${kanji.length} (L1=${byLvl(1)} L2=${byLvl(2)} L3=${byLvl(3)}), levels 1..${MAX_LEVEL}`);
  console.log(`radicals resolved: ${radicals.length} (curated/uncertain=${uncertain.length}, trusted single-radical=${radicals.length - uncertain.length})`);
  console.log(`radicals omitted (no reliable glyph): ${omitted.length}`);
  console.log(`kanji with zero resolvable radicals: ${zeroRadical.length} total, ${zeroL13} in L1-3`);
  console.log(`kanji with example words: ${kanji.length - noExamples}/${kanji.length}`);
  console.log(`kanji with a focus-word sentence: ${withSentence}/${kanji.length}`);
}

main();
