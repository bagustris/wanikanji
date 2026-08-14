// Load + index data, build items and the unlock/dependency graph. window.Data.
(function (root) {
  'use strict';

  const MAX_LEVEL = 3;

  const Data = {
    radicals: [],       // raw radical records
    kanji: [],          // raw kanji records
    items: [],          // unified item list
    byId: {},           // id -> item
    radicalByName: {},   // name -> radical item

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
        const item = {
          id: 'r:' + r.name,
          type: 'radical',
          level: r.level,
          glyph: r.glyph || r.name,
          name: r.name,
          meanings: [r.name],
          questions: ['meaning'],
          radicals: [],
          kanji: r.kanji || [],   // kanji that use this radical (for item info)
          uncertain: !!r.uncertain,
        };
        this.items.push(item);
        this.byId[item.id] = item;
        this.radicalByName[r.name] = item;
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
    radicalsInLevel(lvl) { return this.items.filter(i => i.type === 'radical' && i.level === lvl); },

    // A kanji's radical items (resolved by name).
    radicalItemsFor(kanjiItem) {
      return (kanjiItem.radicals || []).map(n => this.radicalByName[n]).filter(Boolean);
    },

    MAX_LEVEL,
  };

  root.Data = Data;
})(typeof self !== 'undefined' ? self : this);
