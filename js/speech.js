// Optional voice-input via the Web Speech API. Works in browser
// (window.Speech); the pure normalizeReadingTranscript/katakanaToHiragana
// helpers also run in Node for testing. The recognizer itself
// (createRecognizer) is browser-only and feature-detected -- absent
// entirely in unsupported browsers (Firefox, most Safari), so voice input
// is pure progressive enhancement on top of typed input, never required.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Speech = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Katakana -> Hiragana via a fixed Unicode offset (U+30A1-U+30F6 maps to
  // U+3041-U+3096, a constant -0x60). No dictionary needed. Chrome's ja-JP
  // recognizer commonly transcribes an isolated spoken word as katakana
  // (ambiguous without sentence context), so this recovers the hiragana
  // reading grading expects. Kanji, punctuation, and the long-vowel mark ー
  // (outside this range) pass through unchanged.
  function katakanaToHiragana(s) {
    return (s || '').replace(/[ァ-ヶ]/g, ch =>
      String.fromCharCode(ch.charCodeAt(0) - 0x60));
  }

  // Best-effort cleanup of a Japanese ASR transcript before grading a
  // reading. If the ASR guessed the word and transcribed kanji instead of
  // transliterating it, this intentionally does NOT try to recover a
  // reading from it (no dictionary here) -- that transcript is surfaced to
  // the user as-is so they can see and correct it, rather than silently
  // grading against un-derived kana.
  function normalizeReadingTranscript(s) {
    return katakanaToHiragana((s || '').trim());
  }

  function supported() {
    return typeof self !== 'undefined' && !!(self.SpeechRecognition || self.webkitSpeechRecognition);
  }

  // One-shot recognizer for a single answer. Returns null if unsupported OR
  // if the browser exposes the constructor but refuses to instantiate it
  // (e.g. a restrictive Permissions-Policy: microphone header) -- caller
  // should treat null the same as "unsupported" either way.
  // lang: BCP-47 tag ('ja-JP' / 'en-US'). callbacks: onResult(transcript),
  // onEnd(), onError(errorCode).
  function createRecognizer(lang, callbacks) {
    if (!supported()) return null;
    const cb = callbacks || {};
    const Ctor = self.SpeechRecognition || self.webkitSpeechRecognition;
    let rec;
    try { rec = new Ctor(); } catch (e) { return null; }
    rec.lang = lang;
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.continuous = false;
    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      if (cb.onResult) cb.onResult(transcript);
    };
    rec.onerror = (e) => { if (cb.onError) cb.onError(e.error); };
    rec.onend = () => { if (cb.onEnd) cb.onEnd(); };
    return rec;
  }

  return { katakanaToHiragana, normalizeReadingTranscript, supported, createRecognizer };
});
