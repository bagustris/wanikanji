// WaniKani-faithful SRS engine. Browser (window.SRS) + Node.
// Stages 1..9. 9 = Burned (retired). Guru starts at stage 5.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SRS = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const HOUR = 3600 * 1000;
  const STAGES = {
    1: { name: 'Apprentice 1', interval: 4 * HOUR },
    2: { name: 'Apprentice 2', interval: 8 * HOUR },
    3: { name: 'Apprentice 3', interval: 23 * HOUR },       // ~1 day
    4: { name: 'Apprentice 4', interval: 47 * HOUR },       // ~2 days
    5: { name: 'Guru 1', interval: 167 * HOUR },            // ~1 week
    6: { name: 'Guru 2', interval: 335 * HOUR },            // ~2 weeks
    7: { name: 'Master', interval: 719 * HOUR },            // ~1 month
    8: { name: 'Enlightened', interval: 2879 * HOUR },      // ~4 months
    9: { name: 'Burned', interval: null },
  };
  const MIN_STAGE = 1;
  const MAX_STAGE = 9;
  const GURU = 5;

  function stageName(stage) { return (STAGES[stage] || {}).name || '—'; }
  function isGuru(stage) { return stage >= GURU; }
  function isBurned(stage) { return stage >= MAX_STAGE; }

  // Categorise for dashboard counts.
  function category(stage) {
    if (stage >= 9) return 'burned';
    if (stage === 8) return 'enlightened';
    if (stage === 7) return 'master';
    if (stage >= 5) return 'guru';
    return 'apprentice';
  }

  // Compute the next stage after a review.
  // incorrect = number of incorrect answers accrued this review for the item.
  // Correct (incorrect 0) advances one stage. Incorrect drops by
  // ceil(incorrect/2) * penalty, penalty=2 at/above Guru else 1 (WaniKani rule).
  function nextStage(current, incorrect) {
    if (incorrect <= 0) return Math.min(current + 1, MAX_STAGE);
    const penalty = isGuru(current) ? 2 : 1;
    const drop = Math.ceil(incorrect / 2) * penalty;
    return Math.max(current - drop, MIN_STAGE);
  }

  // Adaptive pacing: a streak of consecutive fully-correct reviews (no
  // incorrect answers on either subject) compresses the wait before the
  // next review, so consistently-known items reach Guru/Burn sooner than
  // WaniKani's fixed ladder — 10% shorter per streak review, floored at
  // 50% of the normal interval (never so fast it undermines retention).
  // A single incorrect review resets the streak to 0 (back to the normal
  // interval) — the existing stage-drop penalty in nextStage already
  // makes a miss slower, so this only needs to handle the speed-up side.
  function streakMultiplier(streak) {
    return Math.max(0.5, 1 - (streak || 0) * 0.1);
  }

  // Given a new stage and the current time (ms), return the next due timestamp.
  // Burned items return null (never scheduled again).
  function nextDueAt(stage, nowMs, streak) {
    const s = STAGES[stage];
    if (!s || s.interval == null) return null;
    return nowMs + s.interval * streakMultiplier(streak);
  }

  // Apply a review result to an item state
  // {stage, dueAt, correct, incorrect, streak}. Returns a new state object.
  function applyReview(state, incorrect, nowMs) {
    const cur = state.stage || 1;
    const ns = nextStage(cur, incorrect);
    const streak = incorrect <= 0 ? (state.streak || 0) + 1 : 0;
    return {
      ...state,
      stage: ns,
      streak,
      dueAt: nextDueAt(ns, nowMs, streak),
      correct: (state.correct || 0) + (incorrect <= 0 ? 1 : 0),
      incorrect: (state.incorrect || 0) + (incorrect > 0 ? 1 : 0),
      burnedAt: isBurned(ns) ? nowMs : state.burnedAt || null,
    };
  }

  // Fresh state for a newly-learned item.
  function newItem(nowMs) {
    return { stage: 1, dueAt: nextDueAt(1, nowMs, 0), correct: 0, incorrect: 0, streak: 0, burnedAt: null };
  }

  function isDue(state, nowMs) {
    return state && state.dueAt != null && state.dueAt <= nowMs && !isBurned(state.stage);
  }

  return {
    STAGES, GURU, MAX_STAGE, MIN_STAGE,
    stageName, isGuru, isBurned, category,
    nextStage, nextDueAt, streakMultiplier, applyReview, newItem, isDue,
  };
});
