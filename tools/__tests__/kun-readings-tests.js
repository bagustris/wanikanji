// Node-builtin test runner for tools/kun-readings.js
const assert = require('assert');
const K = require('../kun-readings.js');

let pass = 0, fail = 0;
function check(name, got, expected) {
  try { assert.deepStrictEqual(got, expected); pass++; }
  catch (e) { fail++; console.error(`FAIL: ${name}\n  ${e.message}`); }
}
function ok(name, cond) {
  try { assert.ok(cond); pass++; }
  catch (e) { fail++; console.error(`FAIL: ${name}`); }
}

// 正 — the reported case: ただ is a bound stem (ただしい / ただす), まさ is free.
{
  const r = K.deriveReadings({
    readings_on: ['せい', 'しょう'],
    readings_kun: ['ただ.しい', 'ただ.す', 'まさ', 'まさ.に'],
    wk_readings_on: ['せい', 'しょう'],
    wk_readings_kun: ['!ただ', '!まさ'],
  });
  check('正 kun forms only for the bound stem', r.kunForms, { ただ: ['ただ.しい', 'ただ.す'] });
  check('正 free kun', r.freeKun, ['まさ']);
  check('正 primary drops bound stem, keeps on', r.primaryReadings, ['せい', 'しょう', 'まさ']);
  ok('正 accepts the stem', r.acceptReadings.includes('ただ'));
  ok('正 accepts the full form', r.acceptReadings.includes('ただしい'));
  ok('正 accepts the other full form', r.acceptReadings.includes('ただす'));
  ok('正 accepts a free stem\'s form too', r.acceptReadings.includes('まさに'));
}

// 一 — every marked kun is bound, so strict falls back to the on'yomi.
{
  const r = K.deriveReadings({
    readings_on: ['いち', 'いつ'],
    readings_kun: ['ひと-', 'ひと.つ'],
    wk_readings_on: ['いち', 'いつ'],
    wk_readings_kun: ['!ひと'],
  });
  // "ひと-" is a prefix marker, not missing okurigana: ひと is the whole
  // reading (一人), so it is free and shown as-is — but ひとつ still grades.
  check('一 free stem gets no display form', r.kunForms, {});
  ok('一 hyphen-marked bare form counts as free', r.freeKun.includes('ひと'));
  ok('一 accepts the okurigana form anyway', r.acceptReadings.includes('ひとつ'));
  check('一 primary keeps on first', r.primaryReadings, ['いち', 'いつ', 'ひと']);
}

// 生 — mixed: い/う/は bound, なま/き free.
{
  const r = K.deriveReadings({
    readings_on: ['せい', 'しょう'],
    readings_kun: ['い.きる', 'い.かす', 'う.まれる', 'は.える', 'き', 'なま', 'なま-'],
    wk_readings_on: ['せい', 'しょう'],
    wk_readings_kun: ['!い', '!なま', '!う', '!は', '!き'],
  });
  check('生 bound stems get forms', r.kunForms.い, ['い.きる', 'い.かす']);
  ok('生 free stems have no forms', r.kunForms.なま === undefined && r.kunForms.き === undefined);
  check('生 primary', r.primaryReadings, ['せい', 'しょう', 'なま', 'き']);
}

// A "!"-marked on'yomi wins outright.
{
  const r = K.deriveReadings({
    readings_on: ['ちょく', 'じき'],
    readings_kun: ['なお.す', 'なお.る'],
    wk_readings_on: ['!ちょく', 'じき'],
    wk_readings_kun: ['なお'],
  });
  check('marked on wins', r.primaryReadings, ['ちょく']);
}

// Kun-only kanji: no on'yomi to fall back to, so the full okurigana form is
// the primary — never the naked stem.
{
  const r = K.deriveReadings({
    readings_on: [],
    readings_kun: ['さ.く'],
    wk_readings_on: [],
    wk_readings_kun: ['!さ'],
  });
  check('kun-only primary is the word', r.primaryReadings, ['さく']);
  ok('kun-only still accepts the stem', r.acceptReadings.includes('さ'));
}

// Source disagreement: the WK stem already includes its okurigana.
{
  const r = K.deriveReadings({
    readings_on: ['きゃく'],
    readings_kun: ['かえ.って', 'しりぞ.く'],
    wk_readings_on: ['きゃく'],
    wk_readings_kun: ['!かえって'],
  });
  check('whole-word stem keeps its boundary', r.kunForms, { かえって: ['かえ.って'] });
  ok('whole-word stem stays free', r.freeKun.includes('かえって'));
  check('whole-word stem can be primary', r.primaryReadings, ['きゃく', 'かえって']);
}

// Unresolvable stem (KANJIDIC doesn't cover it): kept as-is, not dropped.
{
  const r = K.deriveReadings({
    readings_on: ['かく'],
    readings_kun: ['おのおの'],
    wk_readings_on: ['かく'],
    wk_readings_kun: ['!おの'],
  });
  check('unresolvable stem has no forms', r.kunForms, {});
  check('unresolvable stem still primary-eligible', r.primaryReadings, ['かく', 'おの']);
}

// Kun-only kanji whose readings carry no "!" mark at all (込, 拾, 刈) must
// still fall back to the word, not the naked stem.
{
  const r = K.deriveReadings({
    readings_on: [],
    readings_kun: ['こ.む', 'こ.み', 'こ.める'],
    wk_readings_on: [],
    wk_readings_kun: ['こ'],
  });
  check('unmarked kun-only primary is the word', r.primaryReadings, ['こむ', 'こみ', 'こめる']);
  ok('unmarked kun-only still accepts the stem', r.acceptReadings.includes('こ'));
}

// No marks at all: behave like the old fallback (on'yomi, else kun).
{
  const r = K.deriveReadings({
    readings_on: ['か'],
    readings_kun: [],
    wk_readings_on: ['か'],
    wk_readings_kun: [],
  });
  check('unmarked falls back to on', r.primaryReadings, ['か']);
}

// A "^" (uncommon) mark is stripped, not carried into readings.
{
  const r = K.deriveReadings({
    readings_on: ['こう'],
    readings_kun: [],
    wk_readings_on: ['こう', '^く'],
    wk_readings_kun: [],
  });
  check('caret stripped', r.on, ['こう', 'く']);
}

// Primary is never empty — that would make strict mode unanswerable.
{
  const r = K.deriveReadings({ readings_on: [], readings_kun: [], wk_readings_on: [], wk_readings_kun: [] });
  check('empty entry yields empty lists, not undefined', r.primaryReadings, []);
}

console.log(`kun-readings: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
