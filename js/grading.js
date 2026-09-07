// Answer grading for readings and meanings. Browser (window.Grading) + Node.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Grading = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function normalizeMeaning(s) {
    return (s || '')
      .toLowerCase()
      .trim()
      .replace(/([0-9]),(?=[0-9])/g, '$1')
      .replace(/[.,!?;:'"()]/g, '')
      .replace(/[-\u2013\u2014]/g, ' ')
      .replace(/\s+/g, ' ');
  }

  // Iterative Levenshtein distance.
  function levenshtein(a, b) {
    if (a === b) return 0;
    const m = a.length, n = b.length;
    if (!m) return n;
    if (!n) return m;
    let prev = Array.from({ length: n + 1 }, (_, i) => i);
    let cur = new Array(n + 1);
    for (let i = 1; i <= m; i++) {
      cur[0] = i;
      for (let j = 1; j <= n; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      }
      [prev, cur] = [cur, prev];
    }
    return prev[n];
  }

  // Allowed typo distance: 0 for short answers, 1 for >3, 2 for long (>=8).
  function allowedDistance(len) {
    if (len >= 8) return 2;
    if (len > 3) return 1;
    return 0;
  }

  // --- number words <-> digits --------------------------------------------
  // Glosses come from mixed sources: some spell numbers out ("Seven"), some
  // use digits ("17", "8 hours"). Canonicalize spelled-out numbers to digits
  // on both sides so "seventeen" matches "17" and vice versa.
  const CARDINALS = {
    zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
    seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
    thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
    eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40,
    fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90
  };
  const SCALES = { hundred: 100, thousand: 1000, million: 1000000, billion: 1000000000 };
  const ORDINALS = {
    first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6,
    seventh: 7, eighth: 8, ninth: 9, tenth: 10, eleventh: 11, twelfth: 12,
    thirteenth: 13, fourteenth: 14, fifteenth: 15, sixteenth: 16,
    seventeenth: 17, eighteenth: 18, nineteenth: 19, twentieth: 20,
    thirtieth: 30, fortieth: 40, fiftieth: 50, sixtieth: 60,
    seventieth: 70, eightieth: 80, ninetieth: 90, hundredth: 100,
    thousandth: 1000, millionth: 1000000
  };

  function ordinalDigits(n) {
    const tens = n % 100, ones = n % 10;
    let suffix = 'th';
    if (tens < 11 || tens > 13) {
      if (ones === 1) suffix = 'st';
      else if (ones === 2) suffix = 'nd';
      else if (ones === 3) suffix = 'rd';
    }
    return `${n}${suffix}`;
  }

  // Rewrite spelled-out number runs in an already-normalized string as digits.
  function numbersToDigits(s) {
    const words = (s || '').split(' ');
    const out = [];
    let i = 0;
    while (i < words.length) {
      const w = words[i];
      const isCardinal = CARDINALS[w] !== undefined || SCALES[w] !== undefined;
      if (!isCardinal) {
        if (ORDINALS[w] !== undefined) out.push(ordinalDigits(ORDINALS[w]));
        else out.push(w);
        i++;
        continue;
      }
      let total = 0, cur = 0, ordinalTail = false;
      while (i < words.length) {
        const t = words[i];
        if (CARDINALS[t] !== undefined) { cur += CARDINALS[t]; i++; }
        else if (SCALES[t] !== undefined) {
          const sc = SCALES[t];
          if (sc >= 1000) { total += (cur || 1) * sc; cur = 0; }
          else { cur = (cur || 1) * sc; }
          i++;
        } else if (ORDINALS[t] !== undefined) { cur += ORDINALS[t]; ordinalTail = true; i++; break; }
        else break;
      }
      const n = total + cur;
      out.push(ordinalTail ? ordinalDigits(n) : String(n));
    }
    return out.join(' ');
  }

  function digitSignature(s) {
    return ((s || '').match(/[0-9]+/g) || []).join(',');
  }

  // Split an accepted-meaning string on its alternative separators, without
  // breaking a comma that groups digits ("100,000 yen").
  function splitAccepted(a) {
    return String(a)
      .split(/\s*[/;]\s*|,(?![0-9])/)
      .map((p) => p.trim())
      .filter(Boolean);
  }

  const COUNTABLE_NUMBER_MEANINGS = new Set([
    'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight',
    'nine', 'ten', 'hundred', 'thousand', 'ten thousand', 'hundred million'
  ]);
  const COUNTABLE_QUALIFIER_RE = /^\s*(.*?)\s*\(\s*(things?|pieces?)\s*\)\s*$/i;

  function meaningVariants(part) {
    const norm = normalizeMeaning(part);
    if (!norm) return [];
    const countable = COUNTABLE_QUALIFIER_RE.exec(String(part));
    const base = countable ? normalizeMeaning(countable[1]) : norm;
    if (COUNTABLE_NUMBER_MEANINGS.has(base)) {
      return [...new Set([
        norm,
        base,
        `${base} thing`,
        `${base} things`,
        `${base} piece`,
        `${base} pieces`
      ])];
    }
    return [norm];
  }

  // Grade a meaning. accepted: array of accepted meaning strings.
  // Returns { correct, exact }.
  function gradeMeaning(input, accepted) {
    const g = normalizeMeaning(input);
    if (!g) return { correct: false, exact: false };
    const gd = numbersToDigits(g);
    const variants = [];
    for (const a of accepted || []) {
      for (const p of splitAccepted(a)) {
        for (const v of meaningVariants(p)) variants.push(v);
      }
    }
    // exact pass (raw or number-canonical)
    for (const v of variants) {
      if (g === v || gd === numbersToDigits(v)) return { correct: true, exact: true };
    }
    // Fuzzy pass, on the raw pair AND the number-canonical pair: raw keeps
    // typo tolerance for a spelled-out number ("sevn" -> "seven"), canonical
    // keeps it for a phrase around one ("8 hurs" -> "8 hours"). Neither is
    // allowed to fuzz across a difference in the numbers themselves, so
    // "9 hours" is not accepted for "8 hours".
    for (const v of variants) {
      for (const [a, b] of [[g, v], [gd, numbersToDigits(v)]]) {
        if (digitSignature(a) !== digitSignature(b)) continue;
        if (levenshtein(a, b) <= allowedDistance(b.length)) {
          return { correct: true, exact: false };
        }
      }
    }
    return { correct: false, exact: false };
  }

  // Grade a reading. input is already-converted hiragana; accepted is an array
  // of hiragana readings. Readings must match exactly (kana, no fuzz), but we
  // strip a leading/trailing okurigana dot notation like "ひと.つ" -> "ひとつ".
  function stripReading(r) {
    return (r || '').replace(/[.\-]/g, '').trim();
  }
  function gradeReading(input, accepted) {
    const g = stripReading(input);
    if (!g) return { correct: false };
    for (const a of accepted || []) {
      if (g === stripReading(a)) return { correct: true };
    }
    return { correct: false };
  }

  // Three-way verdict for a reading question. `accepted` is what THIS prompt
  // asks for; `others` are readings that are valid for the character but not
  // for this prompt (正's ただ when 正 is shown alone; 文's もん when the
  // prompt shows 文章). Answering one of those isn't a mistake to punish —
  // it's a misread of the question — so it gets its own verdict and the
  // caller can nudge instead of marking it wrong.
  function classifyReading(input, accepted, others) {
    if (gradeReading(input, accepted).correct) return 'correct';
    if (gradeReading(input, others || []).correct) return 'off-prompt';
    return 'wrong';
  }

  return {
    normalizeMeaning, levenshtein, gradeMeaning, gradeReading, stripReading,
    numbersToDigits, splitAccepted, classifyReading
  };
});
