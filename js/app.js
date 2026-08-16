// WaniKanji controller. Depends on Kana, Grading, SRS, Progress, Data.
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const now = () => Date.now();

  // ---- unlock / progress helpers ----
  const stateOf = (id) => Progress.getItem(id);
  const isLearned = (id) => Progress.hasItem(id);
  const stageOf = (id) => { const s = stateOf(id); return s ? s.stage : 0; };

  function levelPassed(lvl) {
    const ks = Data.kanjiInLevel(lvl);
    if (!ks.length) return false;
    const guru = ks.filter(k => stageOf(k.id) >= SRS.GURU).length;
    return guru / ks.length >= 0.9;
  }
  function levelUnlocked(lvl) { return lvl === 1 || levelPassed(lvl - 1); }

  function prereqMet(item) { return levelUnlocked(item.level); }
  function availableLessons() {
    return Data.items
      .filter(i => !isLearned(i.id) && prereqMet(i))
      .sort((a, b) => a.level - b.level);
  }
  function dueReviews(t) {
    // Bypass mode: every learned, non-burned item counts as due (ignores SRS
    // timing). Reviews still update the SRS, unlike Extra Study.
    if (Progress.settings().bypassSchedule) return learnedActive();
    return Data.items.filter(i => { const s = stateOf(i.id); return s && SRS.isDue(s, t); });
  }
  function learnedActive() {
    return Data.items.filter(i => { const s = stateOf(i.id); return s && !SRS.isBurned(s.stage); });
  }

  // ---- screen switching ----
  const SCREENS = ['dashboard', 'lesson', 'quiz', 'summary'];
  function show(name) {
    SCREENS.forEach(s => $('screen-' + s).classList.toggle('hidden', s !== name));
  }

  // ============================ DASHBOARD ============================
  function renderDashboard() {
    const t = now();
    const lessons = availableLessons();
    const reviews = dueReviews(t);
    const active = learnedActive();

    $('num-lessons').textContent = lessons.length;
    $('num-reviews').textContent = reviews.length;
    $('btn-lessons').disabled = lessons.length === 0;
    $('btn-reviews').disabled = reviews.length === 0;
    $('btn-extra').disabled = active.length === 0;

    // SRS distribution
    const cats = { apprentice: 0, guru: 0, master: 0, enlightened: 0, burned: 0 };
    for (const i of Data.items) { const s = stateOf(i.id); if (s) cats[SRS.category(s.stage)]++; }
    const labels = { apprentice: '見習', guru: '達人', master: '師範', enlightened: '悟り', burned: '燃' };
    const en = { apprentice: 'Appr.', guru: 'Guru', master: 'Master', enlightened: 'Enlt.', burned: 'Burned' };
    $('srs-distribution').innerHTML = Object.keys(cats).map(c =>
      `<div class="srs-cell srs-${c}"><span class="n">${cats[c]}</span><span class="k">${en[c]}</span></div>`
    ).join('');

    // Level progress — show only unlocked levels plus the first locked one
    // (rendering all 60 would be an unusable wall of rows).
    const allLevels = Data.levels();
    const firstLocked = allLevels.find(l => !levelUnlocked(l));
    const shownLevels = allLevels.filter(l => levelUnlocked(l) || l === firstLocked);
    $('level-progress').innerHTML = shownLevels.map(lvl => {
      const ks = Data.kanjiInLevel(lvl);
      const kGuru = ks.filter(k => stageOf(k.id) >= SRS.GURU).length;
      const unlocked = levelUnlocked(lvl);
      const passed = levelPassed(lvl);
      const status = passed ? '✓ passed' : unlocked ? 'in progress' : '🔒 locked';
      return `<div class="level-row">
        <div class="level-row-head"><strong>Level ${lvl}</strong><span class="${unlocked ? '' : 'locked'}">${status}</span></div>
        <div class="level-bars">
          <div class="level-bar">
            <div class="level-bar-track"><div class="level-bar-fill fill-kanji" style="width:${pct(kGuru, ks.length)}%"></div></div>
            <div class="level-bar-label"><span>Kanji</span><span>${kGuru}/${ks.length}</span></div>
          </div>
        </div>
      </div>`;
    }).join('');

    // Next review hint
    if (reviews.length === 0) {
      const upcoming = Data.items.map(i => stateOf(i.id)).filter(s => s && s.dueAt && s.dueAt > t);
      if (upcoming.length) {
        const next = Math.min(...upcoming.map(s => s.dueAt));
        $('next-review-hint').textContent = `Next review ${relTime(next - t)}. Use Extra Study to practice now.`;
      } else if (active.length === 0) {
        $('next-review-hint').textContent = 'Start with Lessons to learn your first kanji.';
      } else {
        $('next-review-hint').textContent = '';
      }
    } else {
      $('next-review-hint').textContent = '';
    }
  }
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
  function relTime(ms) {
    const h = ms / 3600000;
    if (h < 1) return `in ${Math.max(1, Math.round(ms / 60000))} min`;
    if (h < 24) return `in ${Math.round(h)} h`;
    return `in ${Math.round(h / 24)} d`;
  }

  // ============================ LESSONS ============================
  let lessonBatch = [], lessonIdx = 0;

  function startLessons() {
    const size = Progress.settings().batchSize;
    lessonBatch = availableLessons().slice(0, size);
    if (!lessonBatch.length) return;
    lessonIdx = 0;
    show('lesson');
    renderLessonCard();
  }
  function renderLessonCard() {
    const item = lessonBatch[lessonIdx];
    $('lesson-progress').textContent = `${lessonIdx + 1} / ${lessonBatch.length}`;
    $('lesson-card').innerHTML = itemCardHTML(item);
    $('btn-lesson-prev').disabled = lessonIdx === 0;
    $('btn-lesson-next').innerHTML = lessonIdx === lessonBatch.length - 1
      ? 'クイズへ<span>Quiz Enter</span>' : '次 &rarr;<span>Enter</span>';
  }
  function lessonNext() {
    if (lessonIdx < lessonBatch.length - 1) { lessonIdx++; renderLessonCard(); }
    else startQuiz(lessonBatch.slice(), 'lesson');
  }
  function lessonPrev() { if (lessonIdx > 0) { lessonIdx--; renderLessonCard(); } }

  // Kanji with no independent reading (bound on'yomi morphemes like 性, 工)
  // are shown inside their most common compound/okurigana word instead of
  // alone, so the learner reads them the way they're actually used. The
  // OTHER character(s) get furigana (or are already kana); the target
  // itself is highlighted. Shared by the lesson card (first exposure) and
  // the reading-quiz glyph.
  function contextGlyphHTML(context) {
    return context.segments.map(seg => seg.target
      ? `<span class="ctx-target">${seg.text}</span>`
      : (seg.furigana ? `<ruby>${seg.text}<rt>${seg.furigana}</rt></ruby>` : `<span class="ctx-kana">${seg.text}</span>`)
    ).join('');
  }

  function itemCardHTML(item) {
    const on = item.readingsOn.join('、') || '—';
    const kun = item.readingsKun.join('、') || '—';
    // Radicals are a lightweight visual hint here, not a quizzable item:
    // just glyph + name, no SRS state of their own.
    const rads = Data.radicalItemsFor(item)
      .map(r => `<span class="rad${r.uncertain ? ' rad-uncertain' : ''}">${r.glyph} ${r.name}</span>`).join('');
    const glyphHTML = item.context
      ? `<div class="glyph badge-kanji-glyph quiz-glyph-context">${contextGlyphHTML(item.context)}</div>
         <p class="quiz-context-caption">in ${item.context.word}${item.context.gloss ? ` · ${item.context.gloss}` : ''}</p>`
      : `<div class="glyph badge-kanji-glyph">${item.char}</div>`;
    return `<span class="type-badge badge-kanji">Kanji 漢字</span>
      ${glyphHTML}
      <div class="primary-meaning">${item.meanings[0]}</div>
      <div class="readings">on: <b>${on}</b> &nbsp; kun: <b>${kun}</b></div>
      <div class="composition">Made of: ${rads || '—'}</div>
      ${itemInfoHTML(item)}`;
  }

  // ============================ QUIZ ENGINE ============================
  // Shared by lessons-quiz, reviews, extra study.
  // mode: 'lesson' | 'review' | 'extra'
  let quiz = null;

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function startQuiz(items, mode) {
    const perItem = {};
    const readingQ = [], meaningQ = [];
    for (const it of items) {
      perItem[it.id] = { item: it, incorrect: 0, remaining: new Set(it.questions), erred: false };
      for (const q of it.questions) {
        (q === 'reading' ? readingQ : meaningQ).push({ id: it.id, qtype: q });
      }
    }
    // Blocked, not interleaved: all reading questions (items shuffled among
    // themselves) come first, then all meaning questions (items shuffled).
    const queue = [...shuffle(readingQ), ...shuffle(meaningQ)];
    quiz = { queue, perItem, mode, total: queue.length, done: 0, finished: [], answeredCorrect: 0, answeredWrong: 0 };
    show('quiz');
    nextQuestion();
  }

  function currentItem() { return quiz.perItem[quiz.queue[0].id].item; }

  function nextQuestion() {
    if (quiz.queue.length === 0) return finishQuiz();
    const q = quiz.queue[0];
    const item = quiz.perItem[q.id].item;
    $('quiz-progress').textContent = `${quiz.done} / ${quiz.total}`;
    const isReading = q.qtype === 'reading';
    const glyph = $('quiz-glyph');
    const caption = $('quiz-context-caption');
    // The target is still what gets graded, via its own acceptReadings —
    // the context is presentation only (see contextGlyphHTML above).
    if (isReading && item.context) {
      glyph.innerHTML = contextGlyphHTML(item.context);
      glyph.className = 'quiz-glyph quiz-glyph-context ' + item.type;
      // Word only, no English gloss: reading and meaning are both quizzed
      // this session, so showing the gloss here would give away the answer
      // to this item's meaning question.
      caption.textContent = `in ${item.context.word}`;
      caption.classList.remove('hidden');
    } else {
      glyph.textContent = item.glyph;
      glyph.className = 'quiz-glyph ' + item.type;
      caption.textContent = '';
      caption.classList.add('hidden');
    }
    $('quiz-type-badge').textContent = 'Kanji';
    $('quiz-type-badge').className = 'type-badge badge-kanji';
    const qtypeClass = isReading ? 'qtype-reading' : 'qtype-meaning';
    const label = isReading
      ? `読み方 <b class="${qtypeClass}">Reading</b> (hiragana)`
      : `意味 <b class="${qtypeClass}">Meaning</b>`;
    const qtypeLabel = isReading ? 'READING 読み方' : 'MEANING 意味';
    $('quiz-prompt').innerHTML =
      `<span class="qtype-badge ${qtypeClass}">${qtypeLabel}</span>${label}`;
    const input = $('quiz-input');
    input.value = '';
    input.className = 'quiz-input ' + (isReading ? 'mode-reading' : 'mode-meaning');
    input.disabled = false;
    input.lang = isReading ? 'ja' : 'en';
    input.placeholder = isReading ? 'reading (hiragana)…' : 'meaning (English)…';
    $('quiz-feedback').textContent = '';
    $('quiz-feedback').className = 'quiz-feedback';
    $('quiz-continue').classList.add('hidden');
    $('item-info').classList.add('hidden');
    quiz.awaitingContinue = false;
    input.focus();
  }

  function acceptedFor(item, qtype) {
    if (qtype === 'reading') {
      // Strict mode: only the primary reading (the WaniKani-taught one).
      return Progress.settings().strictReadings ? item.primaryReadings : item.acceptReadings;
    }
    return item.meanings;
  }

  function submitAnswer() {
    if (quiz.awaitingContinue) return advance();
    const q = quiz.queue[0];
    const rec = quiz.perItem[q.id];
    const item = rec.item;
    const input = $('quiz-input');
    let val = input.value.trim();
    if (!val) return;
    let result;
    if (q.qtype === 'reading') {
      val = Kana.toHiragana(val);
      result = Grading.gradeReading(val, acceptedFor(item, 'reading'));
    } else {
      result = Grading.gradeMeaning(val, acceptedFor(item, 'meaning'));
    }

    if (result.correct) {
      input.value = val;
      input.className = 'quiz-input correct';
      input.disabled = true;
      $('quiz-feedback').textContent = result.exact === false ? '正解！ (close enough)' : '正解！ Correct';
      $('quiz-feedback').className = 'quiz-feedback correct';
      quiz.answeredCorrect++;
      if (quiz.mode !== 'extra') Progress.recordAnswer(true);
      rec.remaining.delete(q.qtype);
      quiz.queue.shift();
      quiz.done++;
      if (rec.remaining.size === 0) resolveItem(rec);
      maybeShowItemInfo(item);
      $('quiz-continue').classList.remove('hidden');
      quiz.awaitingContinue = true;
      if (Progress.settings().autoAdvance) setTimeout(() => { if (quiz && quiz.awaitingContinue) advance(); }, 700);
    } else {
      input.className = 'quiz-input incorrect shake';
      $('quiz-feedback').textContent = 'ちがう… try again (or press Esc to reveal)';
      $('quiz-feedback').className = 'quiz-feedback incorrect';
      rec.incorrect++;
      rec.erred = true;
      quiz.answeredWrong++;
      if (quiz.mode !== 'extra') Progress.recordAnswer(false);
      setTimeout(() => input.classList.remove('shake'), 300);
      input.select();
    }
  }

  // Reveal answer & skip this question (counts as incorrect, clears it).
  function revealSkip() {
    if (quiz.awaitingContinue) return;
    const q = quiz.queue[0];
    const rec = quiz.perItem[q.id];
    const item = rec.item;
    // Reveal exactly what grading would accept (respects Strict-readings mode).
    const answer = q.qtype === 'reading'
      ? acceptedFor(item, 'reading').map(Grading.stripReading).join('、')
      : item.meanings.join(', ');
    const input = $('quiz-input');
    input.value = answer;
    input.className = 'quiz-input incorrect';
    input.disabled = true;
    rec.erred = true;
    rec.incorrect = Math.max(rec.incorrect, 1);
    $('quiz-feedback').textContent = `Answer: ${answer}`;
    $('quiz-feedback').className = 'quiz-feedback incorrect';
    rec.remaining.delete(q.qtype);
    quiz.queue.shift();
    quiz.done++;
    if (rec.remaining.size === 0) resolveItem(rec);
    maybeShowItemInfo(item);
    $('quiz-continue').classList.remove('hidden');
    quiz.awaitingContinue = true;
  }

  function resolveItem(rec) {
    quiz.finished.push(rec);
    if (quiz.mode === 'lesson') {
      Progress.setItem(rec.item.id, SRS.newItem(now()));
    } else if (quiz.mode === 'review') {
      const cur = stateOf(rec.item.id) || SRS.newItem(now());
      Progress.setItem(rec.item.id, SRS.applyReview(cur, rec.incorrect, now()));
    }
    // extra: no SRS change
  }

  function advance() {
    quiz.awaitingContinue = false;
    nextQuestion();
  }

  function finishQuiz() {
    const missed = quiz.finished.filter(r => r.erred);
    const correctItems = quiz.finished.filter(r => !r.erred);
    show('summary');
    const titleMap = { lesson: 'レッスン完了！', review: '復習完了！', extra: '練習完了！' };
    $('summary-title').innerHTML = `${titleMap[quiz.mode]}<span>Session complete</span>`;
    $('summary-stats').innerHTML =
      `<div class="summary-stat"><strong>${quiz.finished.length}</strong><span>Items</span></div>
       <div class="summary-stat"><strong style="color:var(--correct)">${correctItems.length}</strong><span>No errors</span></div>
       <div class="summary-stat"><strong style="color:var(--incorrect)">${missed.length}</strong><span>Had errors</span></div>`;
    $('summary-items').innerHTML = quiz.finished.map(r =>
      `<span class="summary-chip ${r.erred ? 'missed' : ''}">${r.item.glyph}</span>`).join('');
    quiz = null;
  }

  // ============================ ITEM INFO ============================
  function maybeShowItemInfo(item) {
    if (!Progress.settings().showItemInfo) return;
    // Post-answer panel includes meanings/readings (the lesson card already
    // shows those inline, so itemCardHTML doesn't pass this).
    const html = itemInfoHTML(item, { withMeta: true });
    if (!html) return;
    $('item-info').innerHTML = html;
    $('item-info').classList.remove('hidden');
  }

  function itemInfoHTML(item, { withMeta = false } = {}) {
    let html = '';
    if (withMeta && item.meanings && item.meanings.length) {
      html += `<h4>意味 · Meanings</h4><p class="meta-line">${item.meanings.join(', ')}</p>`;
    }
    if (withMeta && ((item.readingsOn && item.readingsOn.length) || (item.readingsKun && item.readingsKun.length))) {
      html += '<h4>読み · Readings</h4><p class="meta-line">';
      if (item.readingsOn && item.readingsOn.length) html += `<span class="reading-group">音 On: ${item.readingsOn.join('、')}</span>`;
      if (item.readingsKun && item.readingsKun.length) html += `<span class="reading-group">訓 Kun: ${item.readingsKun.join('、')}</span>`;
      html += '</p>';
    }
    if (item.examples && item.examples.length) {
      html += '<h4>例の言葉 · Example words</h4><div class="word-list">';
      html += item.examples.map(w =>
        `<div class="word"><span class="jp">${w.word}</span><span class="rd">${w.reading}</span><span class="gl">${w.gloss}</span></div>`
      ).join('');
      html += '</div>';
    }
    if (item.sentence) {
      html += '<h4>例文 · Example sentence</h4>';
      html += `<p class="sentence">${item.sentence.sentence}</p>`;
      if (item.sentence.translation) html += `<p class="sentence-tr">${item.sentence.translation}</p>`;
    }
    if (!html) html = '<p class="sentence-tr">No example words available.</p>';
    return `<div class="item-info">${html}</div>`;
  }

  // ============================ SETTINGS ============================
  function initSettings() {
    const s = Progress.settings();
    $('setting-item-info').checked = s.showItemInfo;
    $('setting-romaji').checked = s.romajiInput;
    $('setting-strict').checked = s.strictReadings;
    $('setting-bypass').checked = s.bypassSchedule;
    $('setting-auto-next').checked = s.autoAdvance;
    document.querySelectorAll('#setting-batch .segmented-btn').forEach(b => {
      const on = +b.dataset.value === s.batchSize;
      b.classList.toggle('active', on);
      b.setAttribute('aria-checked', on);
    });

    $('setting-item-info').addEventListener('change', e => Progress.setSetting('showItemInfo', e.target.checked));
    $('setting-romaji').addEventListener('change', e => Progress.setSetting('romajiInput', e.target.checked));
    $('setting-strict').addEventListener('change', e => Progress.setSetting('strictReadings', e.target.checked));
    $('setting-bypass').addEventListener('change', e => { Progress.setSetting('bypassSchedule', e.target.checked); renderDashboard(); });
    $('setting-auto-next').addEventListener('change', e => Progress.setSetting('autoAdvance', e.target.checked));
    document.querySelectorAll('#setting-batch .segmented-btn').forEach(b =>
      b.addEventListener('click', () => {
        document.querySelectorAll('#setting-batch .segmented-btn').forEach(x => {
          x.classList.remove('active');
          x.setAttribute('aria-checked', 'false');
        });
        b.classList.add('active');
        b.setAttribute('aria-checked', 'true');
        Progress.setSetting('batchSize', +b.dataset.value);
      }));

    $('btn-settings').addEventListener('click', () => $('settings-overlay').classList.remove('hidden'));
    $('btn-settings-close').addEventListener('click', () => $('settings-overlay').classList.add('hidden'));
    $('settings-overlay').addEventListener('click', e => { if (e.target === $('settings-overlay')) $('settings-overlay').classList.add('hidden'); });
    $('btn-reset').addEventListener('click', () => {
      if (confirm('Reset all progress? This cannot be undone.')) {
        Progress.reset(); initSettings(); $('settings-overlay').classList.add('hidden'); renderDashboard();
      }
    });
  }

  // ============================ INPUT / KEYBOARD ============================
  function initInput() {
    const input = $('quiz-input');
    // live romaji -> hiragana for reading questions
    input.addEventListener('input', () => {
      if (!quiz || quiz.awaitingContinue) return;
      const q = quiz.queue[0];
      if (!q || q.qtype !== 'reading' || !Progress.settings().romajiInput) return;
      const v = input.value;
      let conv;
      if (/n$/i.test(v) && !/nn$/i.test(v)) conv = Kana.toHiragana(v.slice(0, -1)) + v.slice(-1);
      else conv = Kana.toHiragana(v);
      if (conv !== v) input.value = conv;
    });
    $('quiz-form').addEventListener('submit', e => { e.preventDefault(); submitAnswer(); });

    document.addEventListener('keydown', e => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'Escape') {
        if (!$('settings-overlay').classList.contains('hidden')) { $('settings-overlay').classList.add('hidden'); return; }
        if (!$('screen-quiz').classList.contains('hidden') && quiz && !quiz.awaitingContinue) { revealSkip(); e.preventDefault(); return; }
      }
      const key = e.key.toLowerCase();

      // dashboard: L/R/E mirror the Lessons/Reviews/Extra Study buttons
      if (!$('screen-dashboard').classList.contains('hidden')) {
        if (key === 'l' && !$('btn-lessons').disabled) { $('btn-lessons').click(); e.preventDefault(); return; }
        if (key === 'r' && !$('btn-reviews').disabled) { $('btn-reviews').click(); e.preventDefault(); return; }
        if (key === 'e' && !$('btn-extra').disabled) { $('btn-extra').click(); e.preventDefault(); return; }
      }
      // lesson navigation: arrows or vim h/l, Q to quit (no text input on this screen)
      if (!$('screen-lesson').classList.contains('hidden')) {
        if (e.key === 'Enter' || e.key === 'ArrowRight' || key === 'l') { lessonNext(); e.preventDefault(); return; }
        if (e.key === 'ArrowLeft' || key === 'h') { lessonPrev(); e.preventDefault(); return; }
        if (key === 'q') { document.querySelector('#screen-lesson .btn-quit-session').click(); e.preventDefault(); return; }
      }
      // quiz continue: input is disabled while awaiting continue, so letter shortcuts are safe here
      if (!$('screen-quiz').classList.contains('hidden') && quiz && quiz.awaitingContinue) {
        if (e.key === 'Enter' || e.key === 'ArrowRight' || e.key === ' ' || key === 'l' || key === 'j') { advance(); e.preventDefault(); return; }
        if (key === 'q') { document.querySelector('#screen-quiz .btn-quit-session').click(); e.preventDefault(); return; }
      }
    });
  }

  // ============================ WIRE UP ============================
  function initButtons() {
    $('btn-lessons').addEventListener('click', startLessons);
    $('btn-reviews').addEventListener('click', () => startQuiz(dueReviews(now()), 'review'));
    $('btn-extra').addEventListener('click', () => startQuiz(learnedActive(), 'extra'));
    $('btn-lesson-next').addEventListener('click', lessonNext);
    $('btn-lesson-prev').addEventListener('click', lessonPrev);
    $('btn-summary-home').addEventListener('click', () => { show('dashboard'); renderDashboard(); });
    document.querySelectorAll('.btn-quit-session').forEach(b =>
      b.addEventListener('click', () => { quiz = null; show('dashboard'); renderDashboard(); }));
  }

  // The About panel's version is read from CHANGELOG.md (the single source of
  // truth) rather than duplicated here: parse the newest `## vX.Y.Z` heading
  // and show it. The static v-number in index.html is the offline/pre-fetch
  // fallback, so a failed fetch just leaves that in place.
  async function loadAppVersion() {
    try {
      const res = await fetch('CHANGELOG.md');
      if (!res.ok) return;
      const text = await res.text();
      const match = text.match(/^##\s*v(\d+\.\d+\.\d+)/m);
      if (match) $('about-version').textContent = `v${match[1]}`;
    } catch {
      // offline / fetch blocked — keep the static fallback from index.html
    }
  }

  async function main() {
    if (location.protocol === 'file:') { $('file-protocol-warning').classList.remove('hidden'); return; }
    initSettings();
    initInput();
    initButtons();
    loadAppVersion();
    try {
      await Data.load();
    } catch (err) {
      $('load-error-banner').textContent = 'Failed to load data: ' + err.message;
      $('load-error-banner').classList.remove('hidden');
      return;
    }
    renderDashboard();
  }

  document.addEventListener('DOMContentLoaded', main);
})();
