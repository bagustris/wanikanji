// localStorage persistence for WaniKanji. window.Progress.
(function (root) {
  'use strict';
  const KEY = 'wanikanji.v1';
  const DEFAULT_SETTINGS = {
    showItemInfo: true,   // show example words + sentence after answering
    autoAdvance: false,   // advance automatically after a correct answer
    romajiInput: true,    // convert romaji -> hiragana in reading fields
    strictReadings: false, // grade readings only against the primary reading
    bypassSchedule: false, // treat all learned items as due (ignores SRS timing)
    batchSize: 5,         // items introduced per lesson batch
  };

  function load() {
    let raw;
    try { raw = JSON.parse(localStorage.getItem(KEY)); } catch (e) { raw = null; }
    const data = raw && typeof raw === 'object' ? raw : {};
    return {
      items: data.items || {},          // id -> SRS state
      settings: { ...DEFAULT_SETTINGS, ...(data.settings || {}) },
      lifetime: data.lifetime || { answered: 0, correct: 0 },
    };
  }

  let state = load();

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* quota */ }
  }

  return (root.Progress = {
    all() { return state; },
    settings() { return state.settings; },
    setSetting(k, v) { state.settings[k] = v; save(); },
    getItem(id) { return state.items[id]; },
    setItem(id, s) { state.items[id] = s; save(); },
    hasItem(id) { return Object.prototype.hasOwnProperty.call(state.items, id); },
    items() { return state.items; },
    recordAnswer(correct) {
      state.lifetime.answered++;
      if (correct) state.lifetime.correct++;
      save();
    },
    lifetime() { return state.lifetime; },
    reset() { state = { items: {}, settings: { ...DEFAULT_SETTINGS }, lifetime: { answered: 0, correct: 0 } }; save(); },
    save,
  });
})(typeof self !== 'undefined' ? self : this);
