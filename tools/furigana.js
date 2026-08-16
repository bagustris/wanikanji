// Build-time only: for a non-standalone kanji, pick a compound/okurigana
// example word to show as reading-question CONTEXT, so the learner reads the
// target kanji inside real vocabulary instead of in isolation. Not shipped to
// the browser — used only by tools/build-data.js.
//
// A leading/trailing kana run (e.g. the する in 完成する, the しい in 美しい)
// is stripped first if it matches literally between the word and its
// reading — kana IS its own reading, so this is always exact, never a guess.
// What's left ("the core") is handled by two cases, simplest/safest first:
//   (a) core is target + all-kana others: nothing left to derive, the other
//       characters are already kana.
//   (b) core is exactly two kanji (target + one other): the other one's
//       reading is pulled out of the core reading, matched against that
//       kanji's own on'yomi/kun'yomi (with a rendaku voiced variant tried
//       too), anchored to the edge of the string the character sits on.
// If nothing matches, the word is skipped — no guessed/incorrect furigana is
// ever shown. Three-plus-kanji cores and internal (non-edge) kana are out of
// scope for now.

const HIRAGANA_RE = /^[ぁ-ゖゝゞー]+$/; // ぁ-ゖ, ゝゞ, ー

const RENDAKU_VOICE = {
  か: 'が', き: 'ぎ', く: 'ぐ', け: 'げ', こ: 'ご',
  さ: 'ざ', し: 'じ', す: 'ず', せ: 'ぜ', そ: 'ぞ',
  た: 'だ', ち: 'ぢ', つ: 'づ', て: 'で', と: 'ど',
  は: 'ば', ひ: 'び', ふ: 'ぶ', へ: 'べ', ほ: 'ぼ',
};

function voice(reading) {
  const v = RENDAKU_VOICE[reading[0]];
  return v ? v + reading.slice(1) : null;
}

// Gemination: a mora ending in ch/ts/k/i-row sounds (ち, つ, く, き) at the
// END of the first compound element commonly assimilates to a small tsu
// before the next element (一 + 課 -> いっか, not いちか). Only relevant when
// the character being matched sits at the START of the compound, since it's
// the first element's own ending that mutates.
const SOKUON_ENDINGS = new Set(['ち', 'つ', 'く', 'き']);
function sokuon(reading) {
  const last = reading[reading.length - 1];
  return SOKUON_ENDINGS.has(last) ? reading.slice(0, -1) + 'っ' : null;
}

function matchEdge(reading, candidates, edge) {
  for (const c of candidates) {
    if (!c) continue;
    if (edge === 'start') {
      if (reading.startsWith(c)) return c;
      const s = sokuon(c);
      if (s && reading.startsWith(s)) return s;
    }
    if (edge === 'end') {
      if (reading.endsWith(c)) return c;
      const v = voice(c);
      if (v && reading.endsWith(v)) return v;
    }
  }
  return null;
}

function isKana(c) { return HIRAGANA_RE.test(c); }

// readingsByChar: Map/object char -> { on: string[], kun: string[] }
function deriveContext(char, exampleWords, readingsByChar) {
  for (const ex of exampleWords || []) {
    if (!ex || !ex.word || !ex.reading) continue;
    const chars = [...ex.word];
    if (chars.filter(c => c === char).length !== 1) continue; // skip ambiguous/repeated
    const idx = chars.indexOf(char);
    if (idx === -1) continue;

    // Strip a leading/trailing kana run that matches literally in the
    // reading too. The target itself is always kanji, so this never eats
    // into it — both loops stop as soon as they reach a non-kana character.
    const rChars = [...ex.reading];
    let wStart = 0, wEnd = chars.length, rStart = 0, rEnd = rChars.length;
    while (wStart < wEnd && isKana(chars[wStart]) && rChars[rStart] === chars[wStart]) { wStart++; rStart++; }
    while (wEnd > wStart && isKana(chars[wEnd - 1]) && rChars[rEnd - 1] === chars[wEnd - 1]) { wEnd--; rEnd--; }
    if (idx < wStart || idx >= wEnd) continue; // shouldn't happen (target is kanji), guard anyway

    const coreChars = chars.slice(wStart, wEnd);
    const coreReading = rChars.slice(rStart, rEnd).join('');
    const coreIdx = idx - wStart;
    const others = coreChars.filter((c, i) => i !== coreIdx);
    const wrap = coreSegs => [
      ...chars.slice(0, wStart).map(c => ({ text: c, target: false })),
      ...coreSegs,
      ...chars.slice(wEnd).map(c => ({ text: c, target: false })),
    ];

    // (a) core is the target alone (everything else was pure kana, already
    // stripped into the prefix/suffix above — e.g. 美しい).
    if (others.length === 0) {
      return {
        word: ex.word,
        gloss: ex.gloss || '',
        targetIndex: idx,
        segments: wrap([{ text: coreChars[0], target: true }]),
      };
    }

    // (a2) core is target + all-kana others: nothing left to derive.
    if (others.length > 0 && others.every(isKana)) {
      return {
        word: ex.word,
        gloss: ex.gloss || '',
        targetIndex: idx,
        segments: wrap(coreChars.map((c, i) => ({ text: c, target: i === coreIdx }))),
      };
    }

    // (b) core is exactly two kanji (target + one other with known readings).
    if (coreChars.length === 2 && others.length === 1) {
      const otherIdx = coreIdx === 0 ? 1 : 0;
      const otherChar = coreChars[otherIdx];
      const rd = readingsByChar[otherChar];
      if (!rd) continue;
      const candidates = [...(rd.on || []), ...(rd.kun || [])]
        .filter(Boolean).sort((a, b) => b.length - a.length);
      const edge = otherIdx === 0 ? 'start' : 'end';
      const matched = matchEdge(coreReading, candidates, edge);
      if (matched) {
        return {
          word: ex.word,
          gloss: ex.gloss || '',
          targetIndex: idx,
          segments: wrap(coreChars.map((c, i) => i === coreIdx
            ? { text: c, target: true }
            : { text: c, target: false, furigana: matched })),
        };
      }
    }
  }
  return null;
}

module.exports = { deriveContext };
