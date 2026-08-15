// Load + index data, build items and the unlock/dependency graph. window.Data.
//
// Radicals are NOT SRS items here — they're a lightweight, visual component
// hint subordinate to kanji (a glyph + name shown on the kanji's card), not
// a standalone lesson/review track. Only kanji enter `items`/the SRS queue.
(function (root) {
  'use strict';

  const MAX_LEVEL = 3;

  const Data = {
    radicals: [],       // raw radical records (component lookup only)
    kanji: [],          // raw kanji records
    items: [],          // unified item list (kanji only)
    byId: {},           // id -> item
    radicalByName: {},   // name -> radical record (glyph/name/uncertain)

    async load() {
      const [rads, kanji] = await Promise.all([
        fetch('data/radicals.json').then(r => r.json()),
        fetch('data/kanji.json').then(r => r.json()),
      ]);
      this.radicals = rads;
      this.kanji = kanji;
      this._buildItems();
      return this;
    },

    _buildItems() {
      this.items = [];
      this.byId = {};
      this.radicalByName = {};

      for (const r of this.radicals) {
        this.radicalByName[r.name] = {
          glyph: r.glyph || r.name,
          name: r.name,
          uncertain: !!r.uncertain,
        };
      }
      for (const k of this.kanji) {
        const item = {
          id: 'k:' + k.char,
          type: 'kanji',
          level: k.level,
          glyph: k.char,
          char: k.char,
          meanings: k.meanings,
          readingsOn: k.readingsOn,
          readingsKun: k.readingsKun,
          primaryReadings: k.primaryReadings,
          acceptReadings: k.acceptReadings,
          radicals: k.radicals,           // names
          examples: k.examples || [],
          sentence: k.sentence || null,
          questions: ['meaning', 'reading'],
        };
        this.items.push(item);
        this.byId[item.id] = item;
      }
    },

    levels() {
      const set = new Set(this.items.map(i => i.level));
      return [...set].sort((a, b) => a - b);
    },

    kanjiInLevel(lvl) { return this.items.filter(i => i.type === 'kanji' && i.level === lvl); },

    // A kanji's component radicals (resolved by name), for display only.
    radicalItemsFor(kanjiItem) {
      return (kanjiItem.radicals || []).map(n => this.radicalByName[n]).filter(Boolean);
    },

    MAX_LEVEL,
  };

  root.Data = Data;
})(typeof self !== 'undefined' ? self : this);
