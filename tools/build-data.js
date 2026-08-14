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
const MAX_LEVEL = 3;

function readJSON(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }

// --- Curated radical name -> glyph. Single-kanji radicals are auto-filled
//     from the source below; this map covers radicals with no obvious glyph.
//     `uncertain` flags WK custom-art radicals to review.
const RADICAL_GLYPH = {
  Toe: '卜', Drop: '丶', Slide: 'ノ', Lid: '亠', Head: '冂', Legs: '儿',
  Private: '厶', Dry: '干', Bow: '弓', Stick: '丨', Winter: '夂', Spoon: '匕',
  Towel: '巾', Canopy: '广',
  // WK custom-art radicals — best-effort glyph, review these:
  Narwhal: 'ナ', Leaf: '万', Fingers: '爿', Triceratops: '䒑',
};
const UNCERTAIN = new Set(['Narwhal', 'Leaf', 'Fingers', 'Triceratops']);

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
    const primary = [...(v.wk_readings_on || []), ...(v.wk_readings_kun || [])]
      .filter(isPrimary).map(stripMark);
    const allReadings = [...new Set([...on, ...kun])];

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
      acceptReadings: allReadings,
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
  for (const [name, chars] of Object.entries(radicalKanji)) {
    const glyph = RADICAL_GLYPH[name] || singleGlyph[name] || '';
    radicals.push({
      name,
      glyph,
      level: radicalLevel[name],
      kanji: chars,
      ...(UNCERTAIN.has(name) || !glyph ? { uncertain: true } : {}),
    });
  }

  kanji.sort((a, b) => a.level - b.level || 0);
  radicals.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));

  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'kanji.json'), JSON.stringify(kanji, null, 1));
  fs.writeFileSync(path.join(OUT, 'radicals.json'), JSON.stringify(radicals, null, 1));

  // --- Report ---
  const byLvl = l => kanji.filter(k => k.level === l).length;
  const noGlyph = radicals.filter(r => !r.glyph).map(r => r.name);
  const uncertain = radicals.filter(r => r.uncertain).map(r => r.name);
  const noExamples = kanji.filter(k => k.examples.length === 0).map(k => k.char);
  const withSentence = kanji.filter(k => k.sentence);
  const noSentence = kanji.filter(k => !k.sentence).map(k => k.char);
  // integrity: every radical name referenced by a kanji must resolve
  const radNames = new Set(radicals.map(r => r.name));
  const unresolved = new Set();
  for (const k of kanji) for (const r of k.radicals) if (!radNames.has(r)) unresolved.add(r);
  console.log(`kanji: ${kanji.length} (L1=${byLvl(1)} L2=${byLvl(2)} L3=${byLvl(3)})`);
  console.log(`radicals: ${radicals.length}`);
  console.log(`radicals missing glyph: ${noGlyph.length ? noGlyph.join(' ') : 'none'}`);
  console.log(`radicals flagged uncertain: ${uncertain.join(' ')}`);
  console.log(`unresolved radical names in kanji: ${unresolved.size ? [...unresolved].join(' ') : 'none'}`);
  console.log(`kanji missing example words (${noExamples.length}): ${noExamples.join('')}`);
  console.log(`kanji with a focus-word sentence: ${withSentence.length}/${kanji.length}`);
  console.log(`kanji missing sentence (${noSentence.length}): ${noSentence.join('')}`);
}

main();
