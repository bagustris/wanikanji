// Node-builtin test runner for kana.js
const assert = require('assert');
const { toHiragana } = require('../../kana.js');

let pass = 0, fail = 0;
function eq(input, expected) {
  const got = toHiragana(input);
  try { assert.strictEqual(got, expected); pass++; }
  catch (e) { fail++; console.error(`FAIL: toHiragana(${JSON.stringify(input)}) => ${JSON.stringify(got)}, expected ${JSON.stringify(expected)}`); }
}

// basic gojuon
eq('a', 'あ'); eq('ka', 'か'); eq('shi', 'し'); eq('chi', 'ち'); eq('tsu', 'つ');
eq('konnichiwa', 'こんにちわ');
eq('sushi', 'すし');
// youon
eq('kyo', 'きょ'); eq('sha', 'しゃ'); eq('ryuu', 'りゅう'); eq('jya', 'じゃ');
// sokuon (double consonant)
eq('kitte', 'きって'); eq('gakkou', 'がっこう'); eq('itta', 'いった');
// n handling (IME rule: n before vowel/y is a syllable, else ん)
eq('n', 'ん'); eq('hon', 'ほん'); eq('kanji', 'かんじ');
eq('onna', 'おんな'); eq('konnichiwa', 'こんにちわ');
eq("hon'ya", 'ほんや'); eq('sensei', 'せんせい'); eq('shinbun', 'しんぶん');
// dakuten/handakuten
eq('ga', 'が'); eq('pa', 'ぱ'); eq('da', 'だ'); eq('ji', 'じ'); eq('zu', 'ず');
// long vowel dash
eq('ra-men', 'らーめん');
// mixed / passthrough (already kana)
eq('ひと', 'ひと'); eq('あka', 'あか');
// full word examples from data
eq('ichi', 'いち'); eq('hitotsu', 'ひとつ'); eq('yon', 'よん'); eq('mizu', 'みず');

console.log(`kana: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
