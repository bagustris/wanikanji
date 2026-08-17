// Node-builtin test runner for speech.js's pure helpers (the live
// SpeechRecognition wrapper is browser-only and untestable here).
const assert = require('assert');
const { katakanaToHiragana, normalizeReadingTranscript, resolveReadingTranscript, supported } = require('../../speech.js');

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

// resolveReadingTranscript: recovers a reading when ASR transcribed kanji
eq('resolve: kana passthrough', resolveReadingTranscript('やま', { char: '山', reading: 'やま' }), 'やま');
eq('resolve: katakana still converted', resolveReadingTranscript('ヤマ', { char: '山', reading: 'やま' }), 'やま');
eq('resolve: kanji matching target char -> known reading', resolveReadingTranscript('山', { char: '山', reading: 'やま' }), 'やま');
eq('resolve: kanji matching context word -> known reading', resolveReadingTranscript('友達', { char: '友', word: '友達', reading: 'とも' }), 'とも');
eq('resolve: unrelated kanji left as-is (no dictionary)', resolveReadingTranscript('東京', { char: '山', reading: 'やま' }), '東京');
eq('resolve: no target info -> kanji left as-is', resolveReadingTranscript('山', {}), '山');
eq('resolve: whitespace trimmed before compare', resolveReadingTranscript(' 山 ', { char: '山', reading: 'やま' }), 'やま');

// supported(): just shouldn't throw in Node (no `self`/window)
eq('supported: false outside a browser', supported(), false);

console.log(`speech: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
