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
      .replace(/[.,!?;:'"()\-]/g, '')
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
    for (const a of accepted || []) {
      // an accepted entry like "one (thing)" -> also compare each comma part
      const parts = String(a).split(/[,/;]/);
      for (const p of parts) {
        for (const variant of meaningVariants(p)) {
          if (g === variant) return { correct: true, exact: true };
        }
      }
    }
    // fuzzy pass
    for (const a of accepted || []) {
      for (const p of String(a).split(/[,/;]/)) {
        for (const variant of meaningVariants(p)) {
          if (levenshtein(g, variant) <= allowedDistance(variant.length)) {
            return { correct: true, exact: false };
          }
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

  return {
    normalizeMeaning, levenshtein, gradeMeaning, gradeReading, stripReading
  };
});
