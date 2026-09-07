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
ok('number accepts singular countable form', G.gradeMeaning('one thing', ['one (thing)']).correct);
ok('number accepts plural countable form', G.gradeMeaning('seven things', ['seven']).correct);
ok('parenthetical pieces accepts bare number', G.gradeMeaning('two', ['two (pieces)']).correct);
ok('parenthetical pieces accepts thing form', G.gradeMeaning('two things', ['two (pieces)']).correct);
ok('parenthetical pieces accepts plural piece form', G.gradeMeaning('two pieces', ['two (pieces)']).correct);
ok('non-number does not accept countable suffix', !G.gradeMeaning('dog thing', ['dog']).correct);
ok('wrong meaning', !G.gradeMeaning('cat', ['Dog']).correct);
ok('exact flag set', G.gradeMeaning('dog', ['Dog']).exact === true);
ok('fuzzy flag clear', G.gradeMeaning('watter', ['Water']).exact === false);
ok('spelled number matches digit gloss', G.gradeMeaning('seventeen', ['17']).correct);
ok('digit matches digit gloss', G.gradeMeaning('17', ['17']).correct);
ok('spelled number in phrase', G.gradeMeaning('seven times', ['7 times']).correct);
ok('digits in phrase vs spelled gloss', G.gradeMeaning('7 times', ['seven times']).correct);
ok('compound spelled number', G.gradeMeaning('twenty-one', ['21']).correct);
ok('spelled large number', G.gradeMeaning('one hundred thousand yen', ['100,000 yen']).correct);
ok('ordinal word matches ordinal digits', G.gradeMeaning('third', ['3rd']).correct);
ok('ordinal digits match ordinal word', G.gradeMeaning('6th', ['sixth']).correct);
ok('digit-grouping comma not an alt split', !G.gradeMeaning('100', ['100,000 yen']).correct);
ok('grouped number answered in full', G.gradeMeaning('100,000 yen', ['100,000 yen']).correct);
ok('no fuzz across differing numbers', !G.gradeMeaning('9 hours', ['8 hours']).correct);
ok('no fuzz across differing spelled numbers', !G.gradeMeaning('nine hours', ['8 hours']).correct);
ok('typo still tolerated alongside numbers', G.gradeMeaning('8 hurs', ['8 hours']).correct);
ok('typo in a spelled-out number still tolerated', G.gradeMeaning('sevn', ['seven']).correct);
ok('typo in a spelled-out number vs digit gloss', G.gradeMeaning('seventen', ['17']).correct === false);
ok('no fuzz between two spelled numbers', !G.gradeMeaning('seven', ['eleven']).correct);
ok('empty input fails', !G.gradeMeaning('', ['One']).correct);

// --- reading ---
ok('reading exact', G.gradeReading('いち', ['いち', 'いつ']).correct);
ok('reading alt', G.gradeReading('いつ', ['いち', 'いつ']).correct);
ok('reading strips dot', G.gradeReading('ひとつ', ['ひと.つ']).correct);
ok('reading wrong', !G.gradeReading('さん', ['いち']).correct);
ok('reading empty fails', !G.gradeReading('', ['いち']).correct);
ok('reading no fuzz', !G.gradeReading('いか', ['いち']).correct);

// --- three-way reading verdict ---
ok('classify correct', G.classifyReading('せい', ['せい', 'しょう'], ['ただ']) === 'correct');
ok('classify off-prompt', G.classifyReading('ただ', ['せい', 'しょう'], ['ただ']) === 'off-prompt');
ok('classify wrong', G.classifyReading('あか', ['せい'], ['ただ']) === 'wrong');
ok('classify prefers correct over off-prompt', G.classifyReading('せい', ['せい'], ['せい']) === 'correct');
ok('classify tolerates missing others', G.classifyReading('せい', ['せい']) === 'correct');
ok('classify empty input is wrong', G.classifyReading('', ['せい'], ['ただ']) === 'wrong');
ok('classify strips okurigana dots', G.classifyReading('ただしい', ['ただ.しい'], []) === 'correct');

// --- levenshtein sanity ---
ok('lev equal', G.levenshtein('abc', 'abc') === 0);
ok('lev one sub', G.levenshtein('abc', 'abd') === 1);
ok('lev insert', G.levenshtein('ab', 'abc') === 1);

console.log(`grading: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
