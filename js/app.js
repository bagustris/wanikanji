// WaniKanji controller. Depends on Kana, Grading, SRS, Progress, Data.
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const now = () => Date.now();

  // Explicit sentence playback is an on-demand aid, independent of voice
  // input and of the automatic-advance preference.
  function canSpeakJapanese() {
    return typeof window !== 'undefined' && !!window.speechSynthesis;
  }
  function speakJapanese(text) {
    if (!text || !canSpeakJapanese()) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP';
    window.speechSynthesis.speak(utterance);
  }

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

  function prereqMet(item) {
    if (!levelUnlocked(item.level)) return false;
    if (item.type === 'vocab') return item.componentKanji.every(ch => isLearned('k:' + ch));
    return true;
  }
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
    stopMic(); // every screen change interrupts any active question
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
    const en = { apprentice: 'Apprentice', guru: 'Guru', master: 'Master', enlightened: 'Enlightened', burned: 'Burned' };
    // How many correct-in-a-row reviews move an item from the START of this
    // category into the next one (best case, no incorrect answers) — e.g.
    // a freshly-lessoned item enters Apprentice at stage 1 and needs 4
    // correct reviews to reach Guru (stage 5). Answers "how many reviews
    // until this kanji levels up?", which the tiles alone don't convey.
    const toNext = { apprentice: '4 correct to Guru', guru: '2 correct to Master', master: '1 correct to Enlightened', enlightened: '1 correct to Burned', burned: 'Max stage' };
    $('srs-distribution').innerHTML = Object.keys(cats).map(c =>
      `<div class="srs-cell srs-${c}"><span class="n">${cats[c]}</span><span class="k">${en[c]}</span><span class="nx">${toNext[c]}</span></div>`
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
    if (item.type === 'vocab') {
      return `<span class="type-badge badge-vocab">Vocab 単語</span>
        <div class="glyph badge-vocab-glyph">${item.glyph}</div>
        <div class="primary-meaning">${item.meanings[0]}</div>
        <div class="readings">reading: <b>${item.primaryReadings.join('、')}</b></div>`;
    }
    const on = item.readingsOn.join('、') || '—';
    const kun = item.readingsKun.join('、') || '—';
    // Radicals are a lightweight visual hint here, not a quizzable item:
    // just glyph + name, no SRS state of their own.
    const rads = Data.radicalItemsFor(item)
      .map(r => `<span class="rad${r.uncertain ? ' rad-uncertain' : ''}">${r.glyph} ${r.name}</span>`).join('');
    const glyphHTML = item.context
      ? `<div class="glyph badge-kanji-glyph quiz-glyph-context">${contextGlyphHTML(item.context)}</div>
         ${item.context.gloss ? `<p class="quiz-context-caption">${item.context.gloss}</p>` : ''}`
      : `<div class="glyph badge-kanji-glyph">${item.char}</div>`;
    return `<span class="type-badge badge-kanji">Kanji 漢字</span>
      ${glyphHTML}
      <div class="primary-meaning">${item.meanings[0]}</div>
      <div class="readings">on: <b>${on}</b> &nbsp; kun: <b>${kun}</b></div>
      <div class="composition">Made of: ${rads || '—'}</div>
      ${itemInfoHTML(item).html}`;
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

  // Blocked, not interleaved, by priority tier — reading before meaning for
  // the same type (a fresh reading shouldn't be spoiled by having just
  // typed the meaning), and vocab before kanji within each (reading real
  // words transfers to actual text more directly than isolated-glyph
  // drilling, so it's reinforced first): vocab reading, vocab meaning,
  // kanji meaning, kanji reading. Each tier is shuffled internally.
  function priorityTier(item, qtype) {
    if (item.type === 'vocab') return qtype === 'reading' ? 0 : 1;
    return qtype === 'meaning' ? 2 : 3;
  }

  function startQuiz(items, mode) {
    const perItem = {};
    const tiers = [[], [], [], []];
    for (const it of items) {
      perItem[it.id] = { item: it, incorrect: 0, remaining: new Set(it.questions), erred: false, erredTypes: new Set() };
      for (const q of it.questions) {
        tiers[priorityTier(it, q)].push({ id: it.id, qtype: q });
      }
    }
    const queue = tiers.flatMap(shuffle);
    quiz = { queue, perItem, mode, total: queue.length, done: 0, finished: [], answeredCorrect: 0, answeredWrong: 0, qToken: 0 };
    show('quiz');
    nextQuestion();
  }

  function currentItem() { return quiz.perItem[quiz.queue[0].id].item; }

  // The answer input and mic button always enable/disable together (no mic
  // input once an answer is locked in) — one place to pair them so a future
  // terminal state can't forget one half.
  function setAnswerInputEnabled(enabled) {
    $('quiz-input').disabled = !enabled;
    $('quiz-mic').disabled = !enabled;
  }

  function nextQuestion() {
    stopMic();
    quiz.qToken++; // invalidates any stale auto-advance timer from the previous question
    if (quiz.queue.length === 0) return finishQuiz();
    const q = quiz.queue[0];
    const item = quiz.perItem[q.id].item;
    $('quiz-progress').textContent = `${quiz.done} / ${quiz.total}`;
    const isReading = q.qtype === 'reading';
    const glyph = $('quiz-glyph');
    const caption = $('quiz-context-caption');
    // The target is still what gets graded, via its own acceptReadings —
    // the context is presentation only (see contextGlyphHTML above). No
    // caption here: contextGlyphHTML already renders the full context word,
    // and no gloss is shown (reading and meaning are both quizzed this
    // session, so a gloss would give away the meaning answer).
    if (isReading && item.context) {
      glyph.innerHTML = contextGlyphHTML(item.context);
      glyph.className = 'quiz-glyph quiz-glyph-context ' + item.type;
    } else {
      glyph.textContent = item.glyph;
      glyph.className = 'quiz-glyph ' + item.type;
    }
    caption.textContent = '';
    caption.classList.add('hidden');
    $('quiz-type-badge').textContent = item.type === 'vocab' ? 'Vocab' : 'Kanji';
    $('quiz-type-badge').className = 'type-badge badge-' + item.type;
    const qtypeClass = isReading ? 'qtype-reading' : 'qtype-meaning';
    const label = isReading
      ? `読み方 <b class="${qtypeClass}">Reading</b> (hiragana)`
      : `意味 <b class="${qtypeClass}">Meaning</b>`;
    $('quiz-prompt').innerHTML = label;
    const input = $('quiz-input');
    input.value = '';
    input.className = 'quiz-input ' + (isReading ? 'mode-reading' : 'mode-meaning');
    setAnswerInputEnabled(true);
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
      stopMic();
      input.value = val;
      input.className = 'quiz-input correct';
      setAnswerInputEnabled(false);
      $('quiz-feedback').textContent = result.exact === false ? '正解！ (close enough)' : '正解！ Correct';
      $('quiz-feedback').className = 'quiz-feedback correct';
      quiz.answeredCorrect++;
      if (quiz.mode !== 'extra') Progress.recordAnswer(true);
      rec.remaining.delete(q.qtype);
      quiz.queue.shift();
      quiz.done++;
      const itemResolved = rec.remaining.size === 0;
      if (itemResolved) resolveItem(rec);
      const infoShown = maybeShowItemInfo(item, q.qtype, itemResolved);
      $('quiz-continue').classList.remove('hidden');
      quiz.awaitingContinue = true;
      // Guarded by qToken (not just awaitingContinue): a fast run of correct
      // answers with Auto-advance on could otherwise let this timer fire
      // after the learner has already moved on to a *later* question, and
      // cut that question's own feedback display short.
      if (Progress.settings().autoAdvance) {
        // Longer hold when item info actually rendered something to read —
        // not just because the setting is on (a placeholder needs no hold).
        const delay = infoShown ? 5000 : 700;
        const token = quiz.qToken;
        setTimeout(() => { if (quiz && quiz.awaitingContinue && quiz.qToken === token) advance(); }, delay);
      }
    } else {
      stopMic(); // don't let a stale in-flight result overwrite the retry
      input.className = 'quiz-input incorrect shake';
      $('quiz-feedback').textContent = 'ちがう… try again (or press Esc to reveal)';
      $('quiz-feedback').className = 'quiz-feedback incorrect';
      rec.incorrect++;
      rec.erred = true;
      rec.erredTypes.add(q.qtype);
      quiz.answeredWrong++;
      if (quiz.mode !== 'extra') Progress.recordAnswer(false);
      setTimeout(() => input.classList.remove('shake'), 300);
      input.select();
    }
  }

  // Reveal answer & skip this question (counts as incorrect, clears it).
  function revealSkip() {
    if (quiz.awaitingContinue) return;
    stopMic();
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
    setAnswerInputEnabled(false);
    rec.erred = true;
    rec.erredTypes.add(q.qtype);
    rec.incorrect++;
    if (quiz.mode !== 'extra') Progress.recordAnswer(false);
    $('quiz-feedback').textContent = `Answer: ${answer}`;
    $('quiz-feedback').className = 'quiz-feedback incorrect';
    rec.remaining.delete(q.qtype);
    quiz.queue.shift();
    quiz.done++;
    const itemResolved = rec.remaining.size === 0;
    if (itemResolved) resolveItem(rec);
    maybeShowItemInfo(item, q.qtype, itemResolved);
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

  // Items missed in the most recently finished session, offered back for
  // an immediate redrill (see btn-summary-redrill below) — retrieval
  // practice right after a miss is one of the more effective uses of a
  // typed-input trainer, and doesn't need to wait for the SRS to re-queue
  // the item hours/days later.
  let lastMissedItems = [];

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
    // Redrill only the side(s) actually missed — an item erred on reading
    // shouldn't force a meaning question back into the redrill queue (and
    // vice versa), since that's a needless double drill of an already-known side.
    lastMissedItems = missed.map(r => ({ ...r.item, questions: [...r.erredTypes] }));
    $('btn-summary-redrill').classList.toggle('hidden', lastMissedItems.length === 0);
    quiz = null;
  }

  // ============================ ITEM INFO ============================
  // `qtype` is the question just answered, `resolved` means both the
  // item's reading and meaning questions are now answered this session.
  // Meanings/readings are shown only for the side just tested (plus the
  // other side once resolved) — reading and meaning questions for the
  // same item land in different queue blocks (see startQuiz), so showing
  // the meaning right after a correct *reading* answer would hand the
  // learner that item's still-pending meaning question, and vice versa.
  // Returns whether the panel ended up with real content (vs. just the
  // "no examples" placeholder), so callers can size a hold time around it.
  function maybeShowItemInfo(item, qtype, resolved) {
    if (!Progress.settings().showItemInfo) return false;
    const { html, hasContent } = itemInfoHTML(item, {
      showMeanings: qtype === 'meaning' || resolved,
      showReadings: qtype === 'reading' || resolved,
    });
    $('item-info').innerHTML = html;
    $('item-info').classList.remove('hidden');
    const sentence = $('item-info').querySelector('.sentence-play');
    if (sentence && item.sentence && canSpeakJapanese()) {
      sentence.classList.add('is-playable');
      sentence.addEventListener('click', () => speakJapanese(item.sentence.sentence));
    }
    return hasContent;
  }

  function itemInfoHTML(item, { showMeanings = false, showReadings = false } = {}) {
    let meta = '';
    if (showMeanings && item.meanings && item.meanings.length) {
      meta += `<div class="info-section info-meaning"><h4>意味 · Meanings</h4><p class="meta-line">${item.meanings.join(', ')}</p></div>`;
    }
    if (showReadings && item.type === 'vocab' && item.primaryReadings && item.primaryReadings.length) {
      meta += `<div class="info-section info-reading"><h4>読み · Reading</h4><p class="meta-line">${item.primaryReadings.join('、')}</p></div>`;
    } else if (showReadings && ((item.readingsOn && item.readingsOn.length) || (item.readingsKun && item.readingsKun.length))) {
      meta += '<div class="info-section info-reading"><h4>読み · Readings</h4><p class="meta-line">';
      if (item.readingsOn && item.readingsOn.length) meta += `<span class="reading-group">音 On: ${item.readingsOn.join('、')}</span>`;
      if (item.readingsKun && item.readingsKun.length) meta += `<span class="reading-group">訓 Kun: ${item.readingsKun.join('、')}</span>`;
      meta += '</p></div>';
    }
    let examples = '';
    if (item.examples && item.examples.length) {
      examples += '<div class="info-section info-words"><h4>例の言葉 · Example words</h4><div class="word-list">';
      examples += item.examples.map(w =>
        `<div class="word"><span class="jp">${w.word}</span><span class="rd">${w.reading}</span><span class="gl">${w.gloss}</span></div>`
      ).join('');
      examples += '</div></div>';
    }
    if (item.sentence) {
      examples += '<div class="info-section info-sentence"><h4>例文 · Example sentence</h4>';
      examples += `<button type="button" class="sentence sentence-play" aria-label="例文を読み上げる Play example sentence">${item.sentence.sentence}</button>`;
      if (item.sentence.translation) examples += `<p class="sentence-tr">${item.sentence.translation}</p>`;
      examples += '</div>';
    }
    const hasContent = !!(meta || examples);
    const body = meta + (examples || '<p class="sentence-tr">No example words available.</p>');
    return { html: `<div class="item-info">${body}</div>`, hasContent };
  }

  // ============================ SETTINGS ============================
  // Shared by the gear-icon click and the 's' keyboard shortcut, so opening
  // settings always stops any in-flight mic recognition first — the
  // settings overlay layers on top of the quiz screen rather than hiding
  // it (so show() doesn't run), and a stray voice result landing while
  // (or after) settings is open would otherwise overwrite #quiz-input out
  // from under the learner.
  function openSettings() {
    stopMic();
    $('settings-overlay').classList.remove('hidden');
  }

  function syncSettings() {
    const s = Progress.settings();
    $('setting-item-info').checked = s.showItemInfo;
    $('setting-romaji').checked = s.romajiInput;
    $('setting-strict').checked = s.strictReadings;
    $('setting-bypass').checked = s.bypassSchedule;
    $('setting-auto-next').checked = s.autoAdvance;
    const batchBtns = [...document.querySelectorAll('#setting-batch .segmented-btn')];
    batchBtns.forEach(b => {
      const on = +b.dataset.value === s.batchSize;
      b.classList.toggle('active', on);
      b.setAttribute('aria-checked', on);
    });
  }

  function initSettings() {
    syncSettings();
    const batchBtns = [...document.querySelectorAll('#setting-batch .segmented-btn')];
    function selectBatch(btn) {
      batchBtns.forEach(x => { x.classList.remove('active'); x.setAttribute('aria-checked', 'false'); });
      btn.classList.add('active');
      btn.setAttribute('aria-checked', 'true');
      Progress.setSetting('batchSize', +btn.dataset.value);
    }

    $('setting-item-info').addEventListener('change', e => Progress.setSetting('showItemInfo', e.target.checked));
    $('setting-romaji').addEventListener('change', e => Progress.setSetting('romajiInput', e.target.checked));
    $('setting-strict').addEventListener('change', e => Progress.setSetting('strictReadings', e.target.checked));
    $('setting-bypass').addEventListener('change', e => { Progress.setSetting('bypassSchedule', e.target.checked); renderDashboard(); });
    $('setting-auto-next').addEventListener('change', e => Progress.setSetting('autoAdvance', e.target.checked));
    batchBtns.forEach(b => b.addEventListener('click', () => selectBatch(b)));
    // Arrow keys move focus AND selection between options, matching native
    // radiogroup behavior — this app is typing-first, so every control
    // should be reachable/operable without a mouse.
    $('setting-batch').addEventListener('keydown', e => {
      if (!['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(e.key)) return;
      e.preventDefault();
      const idx = batchBtns.indexOf(document.activeElement);
      if (idx === -1) return;
      const dir = (e.key === 'ArrowRight' || e.key === 'ArrowDown') ? 1 : -1;
      const next = batchBtns[(idx + dir + batchBtns.length) % batchBtns.length];
      next.focus();
      selectBatch(next);
    });

    $('btn-settings').addEventListener('click', openSettings);
    $('btn-settings-close').addEventListener('click', () => $('settings-overlay').classList.add('hidden'));
    $('settings-overlay').addEventListener('click', e => { if (e.target === $('settings-overlay')) $('settings-overlay').classList.add('hidden'); });
    $('btn-reset').addEventListener('click', () => {
      if (confirm('Reset all progress? This cannot be undone.')) {
        Progress.reset(); syncSettings(); $('settings-overlay').classList.add('hidden'); renderDashboard();
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
      const caret = input.selectionStart;
      let conv;
      if (/n$/i.test(v) && !/nn$/i.test(v)) conv = Kana.toHiragana(v.slice(0, -1)) + v.slice(-1);
      else conv = Kana.toHiragana(v);
      if (conv !== v) {
        input.value = conv;
        // Reassigning .value always moves the caret to the end — restore it
        // (shifted by however much the conversion changed the length before
        // it) so fixing a typo mid-string doesn't bounce the cursor away.
        if (caret !== null) {
          const newCaret = Math.max(0, Math.min(conv.length, caret + (conv.length - v.length)));
          input.setSelectionRange(newCaret, newCaret);
        }
      }
    });
    $('quiz-form').addEventListener('submit', e => { e.preventDefault(); submitAnswer(); });

    document.addEventListener('keydown', e => {
      const settingsOpen = !$('settings-overlay').classList.contains('hidden');
      if (settingsOpen) {
        if (e.key === 'Escape') $('settings-overlay').classList.add('hidden');
        return;
      }
      // Alt+M toggles the mic from the keyboard, same as clicking it — a
      // plain 'm' can't be used since it's a valid romaji/English answer
      // character and would get eaten by the quiz input while typing.
      if (e.altKey && !e.ctrlKey && !e.metaKey && e.key.toLowerCase() === 'm') {
        const micBtn = $('quiz-mic');
        if (!micBtn.classList.contains('hidden') && !micBtn.disabled) { micBtn.click(); e.preventDefault(); }
        return;
      }
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
      // summary: Enter/Space/D go back to the dashboard, R redrills misses (no text input on this screen)
      if (!$('screen-summary').classList.contains('hidden')) {
        if (e.key === 'Enter' || e.key === ' ' || key === 'd') { $('btn-summary-home').click(); e.preventDefault(); return; }
        if (key === 'r' && !$('btn-summary-redrill').classList.contains('hidden')) { $('btn-summary-redrill').click(); e.preventDefault(); return; }
      }

      // Global, app-wide shortcuts — D (dashboard) and S (settings) work from
      // any screen, since this is a typing-first app and the mouse-only path
      // (clicking the hamburger icon, clicking "Back to dashboard") shouldn't
      // be the only way to reach them. Suppressed while the settings dialog
      // is open (Escape closes it) or while actively typing a quiz answer
      // (the reading/meaning input is enabled and would eat the letter).
      const activelyTyping = !$('screen-quiz').classList.contains('hidden') && quiz && !quiz.awaitingContinue;
      if (!settingsOpen && !activelyTyping) {
        if (key === 'd') { quiz = null; show('dashboard'); renderDashboard(); e.preventDefault(); return; }
        if (key === 's') { openSettings(); e.preventDefault(); return; }
      }
    });
  }

  // ============================ VOICE INPUT (optional) ============================
  // Progressive enhancement on top of typed input via the Web Speech API —
  // absent entirely (button stays hidden) in browsers that don't support
  // it. English ASR for meaning questions, Japanese ASR for reading
  // questions; never auto-submits, so a mishearing is always caught by the
  // learner before it's graded. See js/speech.js for the recognizer +
  // katakana-to-hiragana normalization.
  // Single source of truth for "is a recognizer active" — callbacks below
  // compare their own captured `rec` against this by identity to ignore
  // stale events (e.g. a result arriving after the question changed),
  // instead of a separately-incremented generation counter that could
  // drift out of sync with it.
  let micRecognizer = null;
  // Snapshot of #quiz-input's value when listening started, so a result
  // doesn't clobber text the learner has since typed by hand instead.
  let micValueAtStart = '';

  const MIC_LABEL_IDLE = 'Speak your answer';
  const MIC_LABEL_LISTENING = 'Stop listening';

  // Resets the button/status back to idle without touching #quiz-input —
  // shared by every path that ends a recognition (stopMic, a result, an
  // error, and a natural 'end'), so there's exactly one place that defines
  // what "done listening" looks like.
  function resetMicUI() {
    micRecognizer = null;
    const btn = $('quiz-mic');
    if (btn) { btn.classList.remove('listening'); btn.setAttribute('aria-label', MIC_LABEL_IDLE); }
  }

  // Called from every place a question or screen is interrupted or left, so
  // a stray recognizer never keeps listening (and possibly overwriting a
  // later, unrelated input) after the moment it was started for has
  // passed. A safe no-op when nothing is listening.
  function stopMic() {
    if (micRecognizer) { try { micRecognizer.abort(); } catch (e) { /* already stopped */ } }
    resetMicUI();
    $('quiz-mic-status').classList.add('hidden');
  }

  // aria-live="polite" only reliably announces a mutation on a node that's
  // already in the accessibility tree — #quiz-mic-status is `display:none`
  // via .hidden, which removes it entirely, so unhide it BEFORE writing new
  // text rather than after.
  function setMicStatus(text) {
    const status = $('quiz-mic-status');
    status.classList.remove('hidden');
    status.textContent = text;
  }

  function initMic() {
    const btn = $('quiz-mic');
    if (!Speech.supported()) return; // stays hidden per its default class
    btn.classList.remove('hidden');
    btn.addEventListener('click', () => {
      if (micRecognizer) { stopMic(); return; } // toggle off if already listening
      if (!quiz || quiz.awaitingContinue) return;
      const q = quiz.queue[0];
      const item = quiz.perItem[q.id].item;
      const isReading = q.qtype === 'reading';
      const lang = isReading ? 'ja-JP' : 'en-US';
      const input = $('quiz-input');
      micValueAtStart = input.value;
      const rec = Speech.createRecognizer(lang, {
        onResult: (transcript) => {
          if (rec !== micRecognizer) return;
          resetMicUI(); // a result ends the recognition; don't wait for 'end'
          if (input.value !== micValueAtStart) {
            // Learner started typing a manual answer while we were
            // listening — respect that instead of overwriting it.
            setMicStatus(`Heard "${transcript.trim()}", but you'd already started typing — click the mic again to use it.`);
            return;
          }
          const trimmed = transcript.trim();
          input.value = isReading
            ? Speech.resolveReadingTranscript(trimmed, {
                char: item.char,
                word: item.context && item.context.word,
                reading: (item.primaryReadings && item.primaryReadings[0]) || (item.acceptReadings && item.acceptReadings[0]),
              })
            : trimmed;
          input.dispatchEvent(new Event('input'));
          setMicStatus(`Heard "${trimmed}" — review, then press Enter`);
          input.focus();
        },
        onError: (err) => {
          if (rec !== micRecognizer) return;
          resetMicUI();
          setMicStatus(err === 'not-allowed' ? 'Microphone permission denied.'
            : err === 'no-speech' ? 'No speech detected — try again.'
            : `Voice input error: ${err}`);
        },
        onEnd: () => {
          // Not guarded by rec !== micRecognizer: onResult already resets
          // (and nulls micRecognizer) before 'end' fires, so this only
          // still applies when recognition ended with no result/error at
          // all — clear the now-stale "Listening…" status for that case.
          if (rec !== micRecognizer) return;
          resetMicUI();
          $('quiz-mic-status').classList.add('hidden');
        },
      });
      if (!rec) { setMicStatus('Voice input unavailable in this browser.'); return; }
      micRecognizer = rec;
      btn.classList.add('listening');
      btn.setAttribute('aria-label', MIC_LABEL_LISTENING);
      setMicStatus('Listening…');
      // A browser can expose SpeechRecognition but still refuse to actually
      // run it (restrictive Permissions-Policy, some embedded webviews) --
      // start() then throws synchronously instead of firing 'error'. Catch
      // that so the click always ends in the same visible failure state
      // rather than doing nothing with no feedback.
      try {
        rec.start();
      } catch (e) {
        resetMicUI();
        setMicStatus('Voice input unavailable in this browser.');
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
    $('btn-home-title').addEventListener('click', () => { quiz = null; show('dashboard'); renderDashboard(); });
    $('quiz-continue').addEventListener('click', () => { if (quiz && quiz.awaitingContinue) advance(); });
    $('btn-summary-home').addEventListener('click', () => { show('dashboard'); renderDashboard(); });
    $('btn-summary-redrill').addEventListener('click', () => {
      if (lastMissedItems.length) startQuiz(lastMissedItems, 'extra');
    });
    document.querySelectorAll('.btn-quit-session').forEach(b =>
      b.addEventListener('click', () => { quiz = null; show('dashboard'); renderDashboard(); }));
  }

  // The About panel's version is read from CHANGELOG.md (the single source of
  // truth) rather than duplicated here: parse the newest CalVer (`YYYY.MM.DD`)
  // or legacy SemVer (`vX.Y.Z`) heading and show it. The static value in
  // index.html is the offline/pre-fetch fallback.
  async function loadAppVersion() {
    try {
      const res = await fetch('CHANGELOG.md');
      if (!res.ok) return;
      const text = await res.text();
      const match = text.match(/^##\s*((?:v)?(?:\d{4}\.\d{2}\.\d{2}|\d+\.\d+\.\d+))(?:\s|$)/m);
      if (match) $('about-version').textContent = match[1];
    } catch {
      // offline / fetch blocked — keep the static fallback from index.html
    }
  }

  async function main() {
    if (location.protocol === 'file:') { $('file-protocol-warning').classList.remove('hidden'); return; }
    initSettings();
    initInput();
    initButtons();
    // Voice input is optional progressive enhancement — if js/speech.js
    // failed to load or execute for any reason, initMic() would throw on
    // the undefined `Speech` global. Isolate that from the rest of startup
    // (Data.load, renderDashboard, ...) rather than let it abort main().
    try { initMic(); } catch (e) { /* voice input unavailable; typed input still works */ }
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
