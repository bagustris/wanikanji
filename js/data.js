// Load + index data, build items and the unlock/dependency graph. window.Data.
//
// Radicals are NOT SRS items here — they're a lightweight, visual component
// hint subordinate to kanji (a glyph + name shown on the kanji's card), not
// a standalone lesson/review track. Only kanji enter `items`/the SRS queue.
(function (root) {
  'use strict';

  // Common number-word variants. The first reading in a source record remains
  // primary for Strict readings; these are accepted alternatives otherwise.
  const VOCAB_READING_ALIASES = {
    '十四': ['じゅうよん', 'じゅうし'],
    '十七': ['じゅうなな', 'じゅうしち'],
  };

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
      this._buildVocabItems();
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
          standalone: k.standalone !== false,
          context: k.context || null,
          questions: ['meaning', 'reading'],
        };
        this.items.push(item);
        this.byId[item.id] = item;
      }
    },

    // Vocab items are derived from kanji example words (`k.examples`), not
    // sourced separately — real words built from kanji already in the
    // curriculum, so a word's level is the highest level among its
    // component kanji and it unlocks once those kanji are learned (see
    // prereqMet in app.js). Deduped by word text since the same word can
    // appear as an example under more than one of its component kanji.
    _buildVocabItems() {
      const stripTag = s => s.replace(/\s*\[[^\]]*\]\s*$/, '').trim();
      const seen = new Set();
      for (const k of this.kanji) {
        for (const w of k.examples || []) {
          // A leading "*" in the source data flags an irregular/jukujikun
          // reading word — it's a data marker, not part of the word itself.
          const word = w.word.replace(/^\*/, '');
          if (seen.has(word) || word.length < 2) continue;
          seen.add(word);
          const componentKanji = [...new Set(word.split(''))]
            .filter(ch => this.byId['k:' + ch]);
          if (!componentKanji.length) continue;
          const level = Math.max(...componentKanji.map(ch => this.byId['k:' + ch].level));
          const meanings = w.gloss.split(',').map(stripTag).filter(Boolean);
          if (!meanings.length) continue;
          const item = {
            id: 'v:' + word,
            type: 'vocab',
            level,
            glyph: word,
            meanings,
            acceptReadings: [...new Set([w.reading, ...(VOCAB_READING_ALIASES[word] || [])])],
            primaryReadings: [w.reading],
            readingsOn: [],
            readingsKun: [],
            componentKanji,
            questions: ['meaning', 'reading'],
          };
          this.items.push(item);
          this.byId[item.id] = item;
        }
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
  };

  root.Data = Data;
})(typeof self !== 'undefined' ? self : this);
