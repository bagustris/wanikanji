const assert = require('assert');
const G = require('../../grading.js');

let pass = 0, fail = 0;
function ok(name, cond) {
  try { assert.ok(cond); pass++; }
  catch (e) { fail++; console.error(`FAIL: ${name}`); }
}

// --- meaning ---
ok('exact meaning', G.gradeMeaning('one', ['One']).correct);
ok('case insensitive', G.gradeMeaning('RIGHT', ['right']).correct);
ok('whitespace', G.gradeMeaning('  big  ', ['Big']).correct);
ok('typo1 tolerated', G.gradeMeaning('watter', ['Water']).correct);       // dist 1, len 5
ok('short no fuzz', !G.gradeMeaning('an', ['One']).correct);              // "one" len3 -> dist0 only
ok('comma alt accepted', G.gradeMeaning('below', ['below; under']).correct);
ok('slash alt accepted', G.gradeMeaning('under', ['below/under']).correct);
ok('wrong meaning', !G.gradeMeaning('cat', ['Dog']).correct);
ok('exact flag set', G.gradeMeaning('dog', ['Dog']).exact === true);
ok('fuzzy flag clear', G.gradeMeaning('watter', ['Water']).exact === false);
ok('empty input fails', !G.gradeMeaning('', ['One']).correct);

// --- reading ---
ok('reading exact', G.gradeReading('いち', ['いち', 'いつ']).correct);
ok('reading alt', G.gradeReading('いつ', ['いち', 'いつ']).correct);
ok('reading strips dot', G.gradeReading('ひとつ', ['ひと.つ']).correct);
ok('reading wrong', !G.gradeReading('さん', ['いち']).correct);
ok('reading empty fails', !G.gradeReading('', ['いち']).correct);
ok('reading no fuzz', !G.gradeReading('いか', ['いち']).correct);

// --- levenshtein sanity ---
ok('lev equal', G.levenshtein('abc', 'abc') === 0);
ok('lev one sub', G.levenshtein('abc', 'abd') === 1);
ok('lev insert', G.levenshtein('ab', 'abc') === 1);

console.log(`grading: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
