// Node-builtin test runner for speech.js's pure helpers (the live
// SpeechRecognition wrapper is browser-only and untestable here).
const assert = require('assert');
const { katakanaToHiragana, normalizeReadingTranscript, supported } = require('../../speech.js');

let pass = 0, fail = 0;
function eq(name, got, expected) {
  try { assert.strictEqual(got, expected); pass++; }
  catch (e) { fail++; console.error(`FAIL: ${name} => ${JSON.stringify(got)}, expected ${JSON.stringify(expected)}`); }
}

// katakana -> hiragana
eq('kata: full word', katakanaToHiragana('ヤマ'), 'やま');
eq('kata: single char', katakanaToHiragana('ン'), 'ん');
eq('kata: mixed with kanji unaffected', katakanaToHiragana('工ジ'), '工じ');
eq('kata: already hiragana passthrough', katakanaToHiragana('やま'), 'やま');
eq('kata: long vowel mark unaffected', katakanaToHiragana('ラーメン'), 'らーめん');
eq('kata: empty/undefined', katakanaToHiragana(), '');

// normalizeReadingTranscript: trims + converts
eq('normalize: trims whitespace', normalizeReadingTranscript('  やま  '), 'やま');
eq('normalize: katakana transcript', normalizeReadingTranscript('ヤマ'), 'やま');
eq('normalize: kanji left as-is (no dictionary)', normalizeReadingTranscript('山'), '山');

// supported(): just shouldn't throw in Node (no `self`/window)
eq('supported: false outside a browser', supported(), false);

console.log(`speech: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
