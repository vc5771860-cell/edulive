/* ============================================================
   auth.js — Student authentication & session
   Depends on: data.js
   ============================================================ */

let currentUser = null;
let studentCamStream = null;

/* ── Login mode toggle ── */
function switchLoginMode(mode, btn) {
  document.querySelectorAll('.login-toggle-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const loginForm = document.getElementById('loginFormWrap');
  const joinForm  = document.getElementById('joinFormWrap');
  if (loginForm) loginForm.style.display = mode === 'login' ? 'block' : 'none';
  if (joinForm)  joinForm.style.display  = mode === 'join'  ? 'block' : 'none';
}

/* ── Password visibility toggle ── */
function togglePassword() {
  const inp = document.getElementById('pwInput');
  const btn = document.getElementById('eyeBtn');
  if (!inp) return;
  if (inp.type === 'password') { inp.type = 'text';     btn.textContent = '🙈'; }
  else                         { inp.type = 'password'; btn.textContent = '👁'; }
}

/* ── Autofill demo account ── */
function autofillDemo(id, pw) {
  const idInp = document.getElementById('studentIdInput');
  const pwInp = document.getElementById('pwInput');
  if (idInp) idInp.value = id;
  if (pwInp) pwInp.value = pw;
  const err = document.getElementById('loginError');
  if (err) err.classList.remove('show');
}

/* ── Toggle room code panel ── */
function toggleRoomPanel() {
  const panel = document.getElementById('roomCodePanel');
  if (panel) panel.classList.toggle('show');
}

/* ── Login ── */
function doLogin() {
  const idVal = (document.getElementById('studentIdInput')?.value || '').trim().toUpperCase();
  const pwVal = document.getElementById('pwInput')?.value || '';
  const btn   = document.getElementById('loginSubmitBtn');
  const err   = document.getElementById('loginError');

  // Find in DB or allow any valid-format ID with pass123 (demo)
  let user = STUDENTS_DB.find(s => s.id === idVal && s.pw === pwVal);
  if (!user && idVal.startsWith('STU-') && pwVal === 'pass123') {
    user = {
      id: idVal, pw: pwVal,
      name: 'Student',
      initials: idVal.replace('STU-','').slice(0,2),
      att: 85,
      subjects: ['Math', 'Physics']
    };
  }

  if (!user) {
    if (err) err.classList.add('show');
    const idInp = document.getElementById('studentIdInput');
    if (idInp) idInp.style.borderColor = '#c0392b';
    return;
  }

  if (err) err.classList.remove('show');
  if (btn) { btn.textContent = 'Signing in…'; btn.style.opacity = '0.7'; }

  setTimeout(() => loginSuccess(user), 800);
}

function loginEnterKey(e) {
  if (e.key === 'Enter') doLogin();
}

/* ── Join as guest with room code ── */
function joinWithCode(fromField) {
  const codeEl = fromField === 'panel'
    ? document.getElementById('roomCodeInput')
    : document.getElementById('inlineRoomCode');
  const code = (codeEl?.value || '').trim().toUpperCase();
  const cls = CLASSES.find(c => c.code === code);
  if (!cls) { alert('Room code not found. Please check and try again.'); return; }
  if (cls.status === 'done') { alert('This class has already ended.'); return; }
  // If not logged in, open class modal as guest
  if (!currentUser) {
    currentUser = { id: 'GUEST', name: 'Guest', initials: 'GU', att: 0, subjects: [] };
    showStudentDash(currentUser);
  }
  openJoinModal();
}

function joinAsGuest() {
  const name = (document.getElementById('guestNameInput')?.value || '').trim();
  const code = (document.getElementById('guestCodeInput')?.value || '').trim().toUpperCase();
  if (!name) { alert('Please enter your name.'); return; }
  const cls = CLASSES.find(c => c.code === code);
  if (!cls) { alert('Room code not found.'); return; }
  const user = {
    id: 'GUEST', pw: '',
    name, initials: name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(),
    att: 0, subjects: []
  };
  loginSuccess(user);
  setTimeout(openJoinModal, 400);
}

/* ── Show dashboard ── */
function loginSuccess(user) {
  currentUser = user;
  showStudentDash(user);
}

function showStudentDash(user) {
  const loginScreen = document.getElementById('loginScreen');
  const dashScreen  = document.getElementById('studentDash');
  if (loginScreen) loginScreen.style.display = 'none';
  if (dashScreen)  dashScreen.style.display  = 'block';

  // Populate user info
  setText('navOrbEl',     user.initials);
  setText('navNameEl',    user.name.split(' ')[0] + ' ' + ((user.name.split(' ')[1] || '')[0] || '') + '.');
  setText('profileOrbEl', user.initials);
  setText('profileNameEl',user.name);
  setText('profileIdEl',  'Student ID: ' + user.id);
  setText('homeAttVal',   user.att + '%');

  buildHomeSection(user);
  buildClassesSection();
  buildAssignmentsSection();
  buildQuizzesSection();
  buildAttendanceSection(user);
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

/* ── Logout ── */
function logout() {
  if (!confirm('Sign out of EduLive?')) return;
  currentUser = null;
  if (studentCamStream) { studentCamStream.getTracks().forEach(t => t.stop()); studentCamStream = null; }
  const dash  = document.getElementById('studentDash');
  const login = document.getElementById('loginScreen');
  if (dash)  dash.style.display  = 'none';
  if (login) login.style.display = 'flex';
  const btn = document.getElementById('loginSubmitBtn');
  if (btn) { btn.textContent = 'Sign In →'; btn.style.opacity = '1'; }
  const idEl = document.getElementById('studentIdInput');
  const pwEl = document.getElementById('pwInput');
  if (idEl) idEl.value = '';
  if (pwEl) pwEl.value = '';
}

/* ── Section nav ── */
function showSection(id, btn) {
  document.querySelectorAll('.s-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.s-nav-btn').forEach(b => b.classList.remove('active'));
  const sec = document.getElementById('sec-' + id);
  if (sec) sec.classList.add('active');
  if (btn) btn.classList.add('active');
  else {
    document.querySelectorAll('.s-nav-btn').forEach(b => {
      if (b.textContent.toLowerCase().includes(id)) b.classList.add('active');
    });
  }
}

/* ── Build home ── */
function buildHomeSection(user) {
  // Stats
  setText('homeAttVal', user.att + '%');
  buildHomeClasses();
  buildHomeAssignments();
}

function buildHomeClasses() {
  const el = document.getElementById('homeClassCards');
  if (!el) return;
  el.innerHTML = '';
  CLASSES.filter(c => c.status !== 'done').slice(0, 3).forEach(c => {
    el.innerHTML += makeClassCard(c);
  });
}

function buildHomeAssignments() {
  const el = document.getElementById('homeAssignList');
  if (!el) return;
  el.innerHTML = '';
  ASSIGNMENTS.filter(a => !a.submitted).slice(0, 2).forEach(a => {
    el.innerHTML += makeAssignmentHTML(a);
  });
}

/* ── Build classes ── */
function buildClassesSection() {
  const el = document.getElementById('allClassCards');
  if (!el) return;
  el.innerHTML = '';
  CLASSES.forEach(c => { el.innerHTML += makeClassCard(c); });
}

function makeClassCard(c) {
  const tagMap = {
    live: '<span class="s-tag s-tag-live">🔴 Live Now</span>',
    soon: '<span class="s-tag s-tag-soon">Upcoming</span>',
    done: '<span class="s-tag s-tag-done">Done</span>',
  };
  const codeHTML = c.code
    ? `<div class="scc-code">Code: ${c.code}</div>` : '';
  const clickAction = c.status === 'live' ? `onclick="openJoinModal()"` : '';
  return `
    <div class="s-class-card" ${clickAction}>
      <div class="scc-subject">${c.subj}</div>
      <div class="scc-name">${c.name}</div>
      <div class="scc-time">🕓 ${c.time}</div>
      ${codeHTML}
      <div class="scc-footer">
        <div class="scc-teacher">👤 ${c.teacher}</div>
        ${tagMap[c.status] || ''}
      </div>
    </div>`;
}

/* ── Build assignments ── */
function buildAssignmentsSection() {
  const el = document.getElementById('allAssignList');
  if (!el) return;
  el.innerHTML = '';
  ASSIGNMENTS.forEach(a => { el.innerHTML += makeAssignmentHTML(a); });
}

function makeAssignmentHTML(a) {
  const dueMap = { overdue: ['overdue','⚠ Overdue'], soon: ['soon','⏳ Due soon'], ok: ['ok','✓ ' + a.due] };
  const [dueClass, dueLabel] = dueMap[a.dueStatus] || ['ok', a.due];
  const submittedHTML = a.submitted
    ? '<span class="s-tag s-tag-done">✓ Submitted</span>'
    : '<span class="s-tag s-tag-live">Pending</span>';
  const actionBtn = a.submitted
    ? `<button class="btn-view-s">View Submission</button>`
    : `<button class="btn-submit-s" onclick="markSubmitted(this)">📤 Submit</button>`;
  return `
    <div class="s-assign-item">
      <div class="sai-header">
        <div>
          <div class="sai-title">${a.icon} ${a.title}</div>
          <div class="sai-meta">${a.subj} · ${a.marks} marks</div>
        </div>
        <div style="text-align:right">
          <div class="sai-due ${dueClass}">${dueLabel}</div>
          <div style="margin-top:4px">${submittedHTML}</div>
        </div>
      </div>
      <div class="sai-desc">${a.desc}</div>
      <div class="sai-footer">${actionBtn}<button class="btn-view-s">📎 Details</button></div>
    </div>`;
}

function markSubmitted(btn) {
  btn.textContent = '✓ Submitted';
  btn.style.background = '#2d6a4f';
  btn.disabled = true;
}

/* ── Build quizzes ── */
function buildQuizzesSection() {
  const el = document.getElementById('studentQuizList');
  if (!el) return;
  el.innerHTML = '';

  // Live quiz pending
  el.innerHTML += `
    <div class="s-quiz-item" style="border-color:rgba(193,127,36,0.4);background:rgba(193,127,36,0.05)" onclick="openStudentQuiz()">
      <div class="s-quiz-icon">🟠</div>
      <div class="s-quiz-info">
        <div class="s-quiz-name">Live Quiz: Derivatives — Q&amp;A</div>
        <div class="s-quiz-meta">📐 Mathematics · 3 questions · 30s each · Launched by teacher</div>
      </div>
      <button class="btn-submit-s">Attempt →</button>
    </div>`;

  STUDENT_QUIZ_RESULTS.forEach(q => {
    const col = q.grade.startsWith('A') ? '#2d6a4f' : q.grade.startsWith('B') ? '#c17f24' : '#c0392b';
    el.innerHTML += `
      <div class="s-quiz-item">
        <div class="s-quiz-icon">${q.icon}</div>
        <div class="s-quiz-info">
          <div class="s-quiz-name">${q.name}</div>
          <div class="s-quiz-meta">${q.subj} · ${q.date}</div>
        </div>
        <div>
          <div class="s-quiz-score" style="color:${col}">${q.score}/${q.total}</div>
          <div class="s-quiz-grade">Grade ${q.grade}</div>
        </div>
      </div>`;
  });
}

/* ── Build attendance ── */
function buildAttendanceSection(user) {
  const pct = user.att;
  setText('attPctDisplay', pct + '%');
  const barEl = document.getElementById('attBarInner');
  if (barEl) setTimeout(() => { barEl.style.width = pct + '%'; }, 100);

  const present = Math.round(50 * pct / 100);
  const absent  = 50 - present;
  setText('attPresentCount', present);
  setText('attAbsentCount',  absent);

  // Subject bars
  const subjEl = document.getElementById('attSubjectBars');
  if (subjEl) {
    subjEl.innerHTML = '';
    [
      { s: '📐 Math',    p: Math.min(100, pct + 2) },
      { s: '🔬 Physics', p: Math.max(0,   pct - 4) },
      { s: '📖 English', p: Math.min(100, pct + 3) },
      { s: '🧪 Science', p: Math.max(0,   pct - 2) },
    ].forEach(sd => {
      const col = sd.p >= 90 ? '#0d7377' : sd.p >= 75 ? '#c17f24' : '#c0392b';
      subjEl.innerHTML += `
        <div class="att-subj-row">
          <div class="att-subj-name">${sd.s}</div>
          <div class="att-subj-bar"><div class="att-subj-fill" style="width:${sd.p}%;background:${col}"></div></div>
          <div class="att-subj-pct" style="color:${col}">${sd.p}%</div>
        </div>`;
    });
  }

  // Calendar
  const cal = document.getElementById('attCalGrid');
  if (cal) {
    cal.innerHTML = '';
    for (let d = 1; d <= 31; d++) {
      const isToday = d === 13;
      const cls = isToday ? 'att-cell-today' : (Math.random() > 0.18 ? 'att-cell-present' : 'att-cell-absent');
      cal.innerHTML += `<div class="att-cell ${cls}" title="Mar ${d}"></div>`;
    }
  }
}

/* ── Join class modal ── */
function openJoinModal() {
  const modal = document.getElementById('joinClassModal');
  if (modal) modal.classList.add('open');
  // Request camera preview
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      .then(stream => {
        studentCamStream = stream;
        const area = document.getElementById('studentVideoPreview');
        if (!area) return;
        area.innerHTML = '';
        const vid = document.createElement('video');
        vid.srcObject = stream; vid.autoplay = true; vid.muted = true;
        vid.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;';
        area.appendChild(vid);
        const ctrl = document.createElement('div');
        ctrl.className = 'vp-ctrl-bar';
        ctrl.innerHTML = `
          <button class="vp-btn" id="sMicBtn" onclick="toggleStudentMic()">🎤</button>
          <button class="vp-btn" id="sCamBtn" onclick="toggleStudentCam()">📷</button>`;
        area.appendChild(ctrl);
      })
      .catch(() => {});
  }
}

function closeJoinModal() {
  const modal = document.getElementById('joinClassModal');
  if (modal) modal.classList.remove('open');
  if (studentCamStream) { studentCamStream.getTracks().forEach(t => t.stop()); studentCamStream = null; }
  resetVideoPreview();
}

function resetVideoPreview() {
  const area = document.getElementById('studentVideoPreview');
  if (area) area.innerHTML = `
    <div class="vp-holder"><div>📷</div><p>Camera preview will appear here</p></div>
    <div class="vp-ctrl-bar">
      <button class="vp-btn" id="sMicBtn">🎤</button>
      <button class="vp-btn" id="sCamBtn">📷</button>
    </div>`;
}

function toggleStudentMic() {
  const btn = document.getElementById('sMicBtn');
  if (!btn) return;
  btn.classList.toggle('muted');
  btn.textContent = btn.classList.contains('muted') ? '🔇' : '🎤';
}
function toggleStudentCam() {
  const btn = document.getElementById('sCamBtn');
  if (!btn) return;
  btn.classList.toggle('muted');
  btn.textContent = btn.classList.contains('muted') ? '🚫' : '📷';
}

function joinClassNow() {
  closeJoinModal();
  alert('✅ You have joined the class!\n\nIn the deployed version, you\'d enter the live video room with your teacher.\n\nIntegrate Daily.co or Jitsi for real multi-user video.');
}

/* ── Student quiz ── */
function openStudentQuiz() {
  const modal = document.getElementById('studentQuizModal');
  const box   = document.getElementById('studentQuizBox');
  if (!modal || !box) return;
  modal.classList.add('open');
  QuizEngine.init(box, QUIZ_QUESTIONS, 'student', 0);
}

/* ── DOMContentLoaded ── */
document.addEventListener('DOMContentLoaded', () => {
  // Close modals on backdrop click
  document.querySelectorAll('.s-modal-bg').forEach(m => {
    m.addEventListener('click', e => { if (e.target === m) m.classList.remove('open'); });
  });
});
