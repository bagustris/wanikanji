const assert = require('assert');
const SRS = require('../../srs.js');

let pass = 0, fail = 0;
function ok(name, cond) {
  try { assert.ok(cond); pass++; }
  catch (e) { fail++; console.error(`FAIL: ${name}`); }
}
function eq(name, a, b) {
  try { assert.strictEqual(a, b); pass++; }
  catch (e) { fail++; console.error(`FAIL: ${name} (${a} !== ${b})`); }
}

// nextStage: correct advances one
eq('correct advances', SRS.nextStage(1, 0), 2);
eq('correct caps at burned', SRS.nextStage(9, 0), 9);
// incorrect below guru: ceil(inc/2)*1
eq('1 wrong apprentice', SRS.nextStage(4, 1), 3);      // ceil(1/2)=1, drop1 -> 3
eq('2 wrong apprentice', SRS.nextStage(4, 2), 3);      // ceil(2/2)=1 -> 3
eq('3 wrong apprentice', SRS.nextStage(4, 3), 2);      // ceil(3/2)=2 -> 2
// incorrect at/above guru: penalty 2
eq('1 wrong guru', SRS.nextStage(5, 1), 3);            // ceil(1/2)=1 *2 =2 -> 3
eq('2 wrong guru', SRS.nextStage(6, 2), 4);            // ceil(2/2)=1 *2 =2 -> 4
eq('never below 1', SRS.nextStage(2, 5), 1);

// categories
eq('cat apprentice', SRS.category(4), 'apprentice');
eq('cat guru', SRS.category(5), 'guru');
eq('cat master', SRS.category(7), 'master');
eq('cat enlightened', SRS.category(8), 'enlightened');
eq('cat burned', SRS.category(9), 'burned');
ok('isGuru true at 5', SRS.isGuru(5));
ok('isGuru false at 4', !SRS.isGuru(4));

// scheduling
const now = 1_000_000_000_000;
eq('due at apprentice1 = +4h', SRS.nextDueAt(1, now), now + 4 * 3600 * 1000);
eq('burned has no due', SRS.nextDueAt(9, now), null);

// newItem
const it = SRS.newItem(now);
eq('new stage 1', it.stage, 1);
ok('new due set', it.dueAt === now + 4 * 3600 * 1000);
ok('not due before time', !SRS.isDue(it, now));
ok('due at time', SRS.isDue(it, it.dueAt));

// applyReview correct then incorrect
const r1 = SRS.applyReview(it, 0, it.dueAt);
eq('review correct -> stage 2', r1.stage, 2);
eq('correct count', r1.correct, 1);
const r2 = SRS.applyReview(r1, 2, r1.dueAt);
eq('review wrong -> stage 1', r2.stage, 1);      // stage2, 2 wrong -> ceil1*1=1 -> 1
eq('incorrect count', r2.incorrect, 1);

// burned flow
let b = { stage: 8, dueAt: now, correct: 5, incorrect: 1, burnedAt: null };
const burned = SRS.applyReview(b, 0, now);
eq('advance to burned', burned.stage, 9);
ok('burnedAt set', burned.burnedAt === now);
ok('burned not due', !SRS.isDue(burned, now + 999 * 3600 * 1000));

// adaptive streak pacing
eq('no streak = full interval', SRS.streakMultiplier(0), 1);
eq('streak 1 = 90%', SRS.streakMultiplier(1), 0.9);
eq('streak floors at 50%', SRS.streakMultiplier(5), 0.5);
eq('streak floors at 50%, never below', SRS.streakMultiplier(20), 0.5);
eq('nextDueAt honors streak', SRS.nextDueAt(1, now, 1), now + 4 * 3600 * 1000 * 0.9);

const s0 = SRS.newItem(now);
eq('newItem starts with streak 0', s0.streak, 0);
const s1 = SRS.applyReview(s0, 0, s0.dueAt);
eq('correct review builds streak', s1.streak, 1);
eq('stage-2 interval compressed by streak 1', s1.dueAt, s0.dueAt + 8 * 3600 * 1000 * 0.9);
const s2 = SRS.applyReview(s1, 2, s1.dueAt); // incorrect resets streak
eq('incorrect resets streak', s2.streak, 0);

console.log(`srs: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
