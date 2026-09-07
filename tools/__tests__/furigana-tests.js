// Node-builtin test runner for tools/furigana.js
const assert = require('assert');
const { deriveContext } = require('../furigana.js');

let pass = 0, fail = 0;
function check(name, got, expected) {
  try { assert.deepStrictEqual(got, expected); pass++; }
  catch (e) { fail++; console.error(`FAIL: ${name}\n  ${e.message}`); }
}

// (a) kanji + okurigana: no reading derivation needed, other chars pass through.
{
  const ctx = deriveContext('美', [{ word: '美しい', reading: 'うつくしい', gloss: 'beautiful' }], {});
  check('okurigana word/gloss', { word: ctx.word, gloss: ctx.gloss }, { word: '美しい', gloss: 'beautiful' });
  check('okurigana segments', ctx.segments, [
    { text: '美', target: true },
    { text: 'し', target: false },
    { text: 'い', target: false },
  ]);
  check('okurigana target reading', ctx.targetReading, 'うつく');
}

// (b) two-kanji compound, target first, other char's on'yomi matches the tail.
{
  const readingsByChar = { 究: { on: ['きゅう'], kun: ['きわ'] } };
  const ctx = deriveContext('研', [{ word: '研究', reading: 'けんきゅう', gloss: 'research' }], readingsByChar);
  check('compound target-first segments', ctx.segments, [
    { text: '研', target: true },
    { text: '究', target: false, furigana: 'きゅう' },
  ]);
  check('compound target-first reading', ctx.targetReading, 'けん');
}

// (b) two-kanji compound, target second, other char's reading matches the head.
{
  const readingsByChar = { 大: { on: ['たい', 'だい'], kun: ['おお'] } };
  const ctx = deriveContext('学', [{ word: '大学', reading: 'だいがく', gloss: 'university' }], readingsByChar);
  check('compound target-second segments', ctx.segments, [
    { text: '大', target: false, furigana: 'だい' },
    { text: '学', target: true },
  ]);
  check('compound target-second reading', ctx.targetReading, 'がく');
}

// rendaku: other char's own on'yomi is unvoiced, but the compound voices it.
{
  const readingsByChar = { 花: { on: [], kun: ['はな'] } };
  const ctx = deriveContext('火', [{ word: '花火', reading: 'はなび', gloss: 'fireworks' }], readingsByChar);
  check('rendaku voiced match', ctx.segments, [
    { text: '花', target: false, furigana: 'はな' },
    { text: '火', target: true },
  ]);
  // The target's own reading is voiced here (ひ -> び): the surface form is
  // what the learner has to say when reading 花火, so that's what's stored.
  check('rendaku target keeps its surface reading', ctx.targetReading, 'び');
}

// trailing する suffix stripped, then the 2-kanji core matches (対する).
{
  const readingsByChar = { 反: { on: ['はん'], kun: [] } };
  const ctx = deriveContext('対', [{ word: '反対する', reading: 'はんたいする', gloss: 'to oppose' }], readingsByChar);
  check('trailing suru-suffix core match', ctx.segments, [
    { text: '反', target: false, furigana: 'はん' },
    { text: '対', target: true },
    { text: 'す', target: false },
    { text: 'る', target: false },
  ]);
}

// core reduces to the target alone once the trailing kana run is stripped
// (完 in 完成する, other char resolved separately for 成's own item — here
// just checking the "target alone after stripping" path for a single-kanji
// tail, e.g. 慣れる -> stem 慣 + kana suffix れる).
{
  const ctx = deriveContext('慣', [{ word: '慣れる', reading: 'なれる', gloss: 'to get used to' }], {});
  check('target-alone-after-strip segments', ctx.segments, [
    { text: '慣', target: true },
    { text: 'れ', target: false },
    { text: 'る', target: false },
  ]);
  check('target-alone-after-strip reading', ctx.targetReading, 'な');
}

// sokuon gemination: other char's own reading is いち, but the compound
// assimilates it to いっ before か (一課 -> いっか).
{
  const readingsByChar = { 一: { on: ['いち', 'いつ'], kun: ['ひと'] } };
  const ctx = deriveContext('課', [{ word: '一課', reading: 'いっか', gloss: 'section 1' }], readingsByChar);
  check('sokuon gemination match', ctx.segments, [
    { text: '一', target: false, furigana: 'いっ' },
    { text: '課', target: true },
  ]);
  check('sokuon target reading', ctx.targetReading, 'か');
}

// core kana that did NOT match literally (irregular reading): the kana is
// peeled off the reading's edge when it lines up, and the target reading is
// left null rather than guessed when it doesn't.
{
  const ctx = deriveContext('人', [{ word: '一人', reading: 'ひとり', gloss: 'one person' }], {});
  check('unresolvable other kanji -> null', ctx, null);
}

// no usable example -> null (three-plus-kanji compound is out of scope for now).
{
  const ctx = deriveContext('性', [{ word: '可能性', reading: 'かのうせい', gloss: 'possibility' }], {});
  check('unsupported word length -> null', ctx, null);
}

// no readings known for the other character -> null (never guess).
{
  const ctx = deriveContext('研', [{ word: '研究', reading: 'けんきゅう', gloss: 'research' }], {});
  check('missing other-char readings -> null', ctx, null);
}

// second example is used when the first doesn't match.
{
  const readingsByChar = { 究: { on: ['きゅう'], kun: [] } };
  const ctx = deriveContext('研', [
    { word: '可能性', reading: 'かのうせい', gloss: 'possibility' }, // no 研 in this word at all
    { word: '研究', reading: 'けんきゅう', gloss: 'research' },
  ], readingsByChar);
  check('falls through to a later example', ctx.word, '研究');
}

console.log(`furigana: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
