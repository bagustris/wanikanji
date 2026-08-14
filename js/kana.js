// Romaji -> Hiragana converter. Works in browser (window.Kana) and Node (require).
// Handles: gojuon, dakuten/handakuten, youon (kya->きゃ), sokuon (kk->っk),
// ん (n / nn / n'), and passes through already-kana text.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Kana = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Longest keys first matters; we match greedily by trying length 3,2,1.
  const MAP = {
    // youon
    kya: 'きゃ', kyu: 'きゅ', kyo: 'きょ', sha: 'しゃ', shu: 'しゅ', sho: 'しょ',
    sya: 'しゃ', syu: 'しゅ', syo: 'しょ', cha: 'ちゃ', chu: 'ちゅ', cho: 'ちょ',
    tya: 'ちゃ', tyu: 'ちゅ', tyo: 'ちょ', nya: 'にゃ', nyu: 'にゅ', nyo: 'にょ',
    hya: 'ひゃ', hyu: 'ひゅ', hyo: 'ひょ', mya: 'みゃ', myu: 'みゅ', myo: 'みょ',
    rya: 'りゃ', ryu: 'りゅ', ryo: 'りょ', gya: 'ぎゃ', gyu: 'ぎゅ', gyo: 'ぎょ',
    ja: 'じゃ', ju: 'じゅ', jo: 'じょ', jya: 'じゃ', jyu: 'じゅ', jyo: 'じょ',
    zya: 'じゃ', zyu: 'じゅ', zyo: 'じょ', bya: 'びゃ', byu: 'びゅ', byo: 'びょ',
    pya: 'ぴゃ', pyu: 'ぴゅ', pyo: 'ぴょ',
    // digraph consonants
    shi: 'し', chi: 'ち', tsu: 'つ',
    // basic
    ka: 'か', ki: 'き', ku: 'く', ke: 'け', ko: 'こ',
    sa: 'さ', si: 'し', su: 'す', se: 'せ', so: 'そ',
    ta: 'た', ti: 'ち', tu: 'つ', te: 'て', to: 'と',
    na: 'な', ni: 'に', nu: 'ぬ', ne: 'ね', no: 'の',
    ha: 'は', hi: 'ひ', fu: 'ふ', hu: 'ふ', he: 'へ', ho: 'ほ',
    ma: 'ま', mi: 'み', mu: 'む', me: 'め', mo: 'も',
    ya: 'や', yu: 'ゆ', yo: 'よ',
    ra: 'ら', ri: 'り', ru: 'る', re: 'れ', ro: 'ろ',
    wa: 'わ', wo: 'を', wi: 'ゐ', we: 'ゑ',
    ga: 'が', gi: 'ぎ', gu: 'ぐ', ge: 'げ', go: 'ご',
    za: 'ざ', zi: 'じ', ji: 'じ', zu: 'ず', ze: 'ぜ', zo: 'ぞ',
    da: 'だ', di: 'ぢ', du: 'づ', de: 'で', do: 'ど',
    ba: 'ば', bi: 'び', bu: 'ぶ', be: 'べ', bo: 'ぼ',
    pa: 'ぱ', pi: 'ぴ', pu: 'ぷ', pe: 'ぺ', po: 'ぽ',
    fa: 'ふぁ', fi: 'ふぃ', fe: 'ふぇ', fo: 'ふぉ',
    a: 'あ', i: 'い', u: 'う', e: 'え', o: 'お',
    '-': 'ー',
  };

  function toHiragana(input) {
    const s = (input || '').toLowerCase();
    let out = '';
    let i = 0;
    while (i < s.length) {
      const ch = s[i];
      // pass through anything already non-latin (kana, kanji, punctuation)
      if (!/[a-z\-']/.test(ch)) { out += s[i]; i++; continue; }
      // n -> ん unless it starts a syllable (n + vowel/y). Consumes a single n,
      // so "onna" -> おんな, "konnichiwa" -> こんにちわ. n' consumes the apostrophe.
      if (ch === 'n') {
        const next = s[i + 1];
        if (next === "'") { out += 'ん'; i += 2; continue; }
        if (next === undefined || !/[aiueoy]/.test(next)) { out += 'ん'; i += 1; continue; }
      }
      // sokuon: doubled consonant (except n) -> っ
      const next = s[i + 1];
      if (ch !== 'n' && next === ch && /[a-z]/.test(ch) && !/[aiueo]/.test(ch)) {
        out += 'っ'; i += 1; continue;
      }
      // greedy match length 3,2,1
      let matched = false;
      for (let len = 3; len >= 1; len--) {
        const chunk = s.substr(i, len);
        if (MAP[chunk]) { out += MAP[chunk]; i += len; matched = true; break; }
      }
      if (!matched) { out += s[i]; i++; }
    }
    return out;
  }

  return { toHiragana };
});
