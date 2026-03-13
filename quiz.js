/* ============================================================
   quiz.js — Shared quiz engine for EduLive
   Works for both teacher (launch/reveal) and student (answer)
   ============================================================ */

const QuizEngine = (() => {
  let state = {
    idx: 0,
    answered: false,
    timerInterval: null,
    timeLeft: 30,
    role: 'teacher',   // 'teacher' | 'student'
    onClose: null,
  };

  /* ── Render a question into a container ── */
  function renderQuestion(containerEl, questions, role) {
    state.role = role;
    state.answered = false;
    clearInterval(state.timerInterval);

    const q = questions[state.idx];
    if (!q) return;

    state.timeLeft = q.time || 30;
    const circumference = 2 * Math.PI * 22.5;
    const letters = ['A', 'B', 'C', 'D'];
    const keyColors = [
      { bg: 'rgba(59,130,246,0.18)',   fg: '#3b82f6' },
      { bg: 'rgba(6,214,160,0.18)',    fg: '#06d6a0' },
      { bg: 'rgba(245,158,11,0.18)',   fg: '#f59e0b' },
      { bg: 'rgba(244,63,94,0.18)',    fg: '#f43f5e' },
    ];

    const optsHTML = q.opts.map((o, i) => `
      <div class="quiz-opt" data-idx="${i}" id="qopt${i}">
        <div class="opt-key" style="background:${keyColors[i].bg};color:${keyColors[i].fg}">${letters[i]}</div>
        ${o}
      </div>
    `).join('');

    containerEl.innerHTML = `
      <div class="quiz-top">
        <div>
          <div class="quiz-q-label">Question ${state.idx + 1} of ${questions.length}</div>
          <div style="display:inline-flex;align-items:center;gap:6px;background:rgba(244,63,94,0.12);border:1px solid rgba(244,63,94,0.25);color:#f43f5e;padding:4px 12px;border-radius:20px;font-size:0.72rem;font-weight:700">
            <div class="live-dot"></div> LIVE QUIZ
          </div>
        </div>
        <div class="quiz-timer-ring">
          <svg viewBox="0 0 50 50" width="52" height="52">
            <circle class="qt-bg" cx="25" cy="25" r="22.5"/>
            <circle class="qt-fill" id="timerCircle" cx="25" cy="25" r="22.5"
              style="stroke-dashoffset:0"/>
          </svg>
          <div class="qt-num" id="qtNum">${state.timeLeft}</div>
        </div>
      </div>
      <div class="quiz-question">${q.q}</div>
      <div class="quiz-opts" id="quizOptsList">${optsHTML}</div>
      ${role === 'teacher' ? renderTeacherFooter(questions.length) : renderStudentFooter()}
    `;

    // Attach click handlers
    containerEl.querySelectorAll('.quiz-opt').forEach(el => {
      el.addEventListener('click', () => selectOption(parseInt(el.dataset.idx), q.ans, role, questions));
    });

    // Start countdown
    startTimer(q.time || 30, circumference, q.ans, role, questions);
  }

  function renderTeacherFooter(total) {
    return `
      <div class="quiz-footer">
        <div style="font-size:0.78rem;color:var(--text2)">
          Responses: <strong id="respCount" style="color:var(--text)">0</strong> / 30
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-ghost btn-sm" onclick="QuizEngine.reveal()">Reveal Answer</button>
          <button class="btn btn-primary btn-sm" onclick="QuizEngine.next()">Next →</button>
          <button class="btn btn-ghost btn-sm" onclick="QuizEngine.close()">End Quiz</button>
        </div>
      </div>
      <div id="responseBars" style="margin-top:12px;display:none"></div>
    `;
  }

  function renderStudentFooter() {
    return `<div id="quizFeedback" style="margin-top:16px;text-align:center;font-size:0.82rem;color:var(--text2)">
      Choose your answer before the timer runs out!
    </div>`;
  }

  /* ── Timer ── */
  function startTimer(seconds, circumference, correctAns, role, questions) {
    clearInterval(state.timerInterval);
    state.timerInterval = setInterval(() => {
      state.timeLeft--;
      const numEl = document.getElementById('qtNum');
      const circle = document.getElementById('timerCircle');
      if (numEl) numEl.textContent = state.timeLeft;
      if (circle) circle.style.strokeDashoffset = circumference * (1 - state.timeLeft / seconds);
      if (numEl && state.timeLeft <= 5) numEl.style.color = '#f43f5e';

      // Simulate responses for teacher
      if (role === 'teacher') {
        const respEl = document.getElementById('respCount');
        if (respEl) {
          const simulated = Math.min(30, Math.floor(30 * (1 - state.timeLeft / seconds) * 0.92));
          respEl.textContent = simulated;
        }
      }

      if (state.timeLeft <= 0) {
        clearInterval(state.timerInterval);
        reveal(correctAns, role);
        if (role === 'student') setTimeout(() => autoNext(questions), 2200);
      }
    }, 1000);
  }

  /* ── Select an option ── */
  function selectOption(idx, correctAns, role, questions) {
    if (state.answered) return;
    state.answered = true;
    clearInterval(state.timerInterval);
    document.querySelectorAll('.quiz-opt').forEach(o => {
      o.classList.add('locked');
      o.removeEventListener('click', () => {});
    });
    const sel = document.getElementById(`qopt${idx}`);
    if (sel) sel.classList.add('selected');
    reveal(correctAns, role, idx, questions);
  }

  /* ── Reveal answers ── */
  function reveal(correctAns, role, chosen, questions) {
    clearInterval(state.timerInterval);
    state.answered = true;
    document.querySelectorAll('.quiz-opt').forEach((o, i) => {
      o.classList.add('locked');
      if (i === correctAns) o.classList.add('correct');
      else if (i === chosen && i !== correctAns) o.classList.add('wrong');
    });

    if (role === 'teacher') {
      showResponseBars(correctAns);
    } else {
      const isCorrect = (chosen === correctAns);
      const fb = document.getElementById('quizFeedback');
      if (fb) {
        fb.innerHTML = isCorrect
          ? '<span style="color:#06d6a0;font-weight:700">✅ Correct! Well done.</span>'
          : `<span style="color:#f43f5e;font-weight:700">❌ Incorrect. Correct answer: ${'ABCD'[correctAns]}</span>`;
      }
    }
  }

  function showResponseBars(correctAns) {
    const total = 28;
    const correctPct = 0.6 + Math.random() * 0.25;
    const barsEl = document.getElementById('responseBars');
    if (!barsEl) return;
    barsEl.style.display = 'block';
    const letters = ['A', 'B', 'C', 'D'];
    const colors = ['#3b82f6', '#06d6a0', '#f59e0b', '#f43f5e'];
    const opts = document.querySelectorAll('.quiz-opt');
    let html = '';
    opts.forEach((_, i) => {
      const pct = i === correctAns
        ? Math.round(correctPct * 100)
        : Math.round((1 - correctPct) / (opts.length - 1) * 100);
      const votes = Math.round(total * pct / 100);
      html += `
        <div class="response-bar-row">
          <span style="width:16px;color:${colors[i]};font-weight:700">${letters[i]}</span>
          <div class="rbar-track"><div class="rbar-fill" style="width:0%;background:${colors[i]}" data-w="${pct}"></div></div>
          <span>${votes} (${pct}%)</span>
        </div>`;
    });
    barsEl.innerHTML = html;
    setTimeout(() => {
      barsEl.querySelectorAll('.rbar-fill').forEach(el => {
        el.style.width = el.dataset.w + '%';
      });
    }, 50);
  }

  function autoNext(questions) {
    if (state.idx < questions.length - 1) {
      state.idx++;
      const container = document.getElementById('quizBox') || document.querySelector('.sq-modal');
      if (container) renderQuestion(container, questions, state.role);
    } else {
      close();
      if (state.role === 'student') {
        alert('🎉 Quiz complete!\nYour answers have been submitted to your teacher.');
      }
    }
  }

  /* ── Public API ── */
  function init(containerEl, questions, role, idx = 0) {
    state.idx = idx;
    renderQuestion(containerEl, questions, role);
  }

  function next() {
    const overlay = document.getElementById('quizOverlay');
    if (!overlay) return;
    const container = overlay.querySelector('.quiz-box');
    // Get questions from global scope
    if (typeof QUIZ_QUESTIONS !== 'undefined') {
      if (state.idx < QUIZ_QUESTIONS.length - 1) {
        state.idx++;
        renderQuestion(container, QUIZ_QUESTIONS, 'teacher');
      } else {
        close();
      }
    }
  }

  function revealPublic() {
    if (typeof QUIZ_QUESTIONS !== 'undefined') {
      reveal(QUIZ_QUESTIONS[state.idx].ans, state.role);
    }
  }

  function close() {
    clearInterval(state.timerInterval);
    state.idx = 0;
    const overlay = document.getElementById('quizOverlay') ||
                    document.getElementById('studentQuizModal');
    if (overlay) overlay.classList.remove('show', 'open');
    if (typeof state.onClose === 'function') state.onClose();
  }

  return { init, next, reveal: revealPublic, close };
})();
