/* ============================================================
   teacher.js — Teacher dashboard logic
   Depends on: data.js, quiz.js
   ============================================================ */

/* ── State ── */
let isLive = false;
let liveSeconds = 0;
let liveInterval = null;
let joinedCount = 0;
let camStream = null;
let layoutIndex = 0;
const LAYOUTS = ['g-4', 'g-2', 'g-1', 'g-n'];

const chatHistory = [
  { from: 'Aarav A.',  me: false, txt: 'Good morning sir! 👋',          t: '3:58' },
  { from: 'Priya R.',  me: false, txt: 'Can you repeat the last formula?', t: '4:01' },
  { from: 'Mohit K.',  me: false, txt: 'I have a doubt about Q3 😊',      t: '4:03' },
];

/* ── Page navigation ── */
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

  const page = document.getElementById('page-' + id);
  const navBtn = document.getElementById('nb-' + id);
  if (page) page.classList.add('active');
  if (navBtn) navBtn.classList.add('active');

  const titles = {
    dash: 'Dashboard',
    live: 'Live Class',
    quiz: 'Quiz Builder',
    att:  'Attendance',
    students: 'My Students',
  };
  const titleEl = document.getElementById('pageTitle');
  if (titleEl) titleEl.textContent = titles[id] || id;

  if (id === 'att')      buildAttendanceTable();
  if (id === 'quiz')     buildQuizCards();
  if (id === 'students') buildStudentsTable();
}

/* ── Subject filter ── */
function filterSubject(el) {
  document.querySelectorAll('.subj-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
}

/* ── Dashboard ── */
function buildDashboard() {
  buildDashAttList();
}

function buildDashAttList() {
  const el = document.getElementById('dashAttList');
  if (!el) return;
  el.innerHTML = '';
  STUDENTS_DB.slice(0, 8).forEach((s, i) => {
    const col = s.att >= 90 ? 'var(--jade)' : s.att >= 75 ? 'var(--amber)' : 'var(--coral)';
    el.innerHTML += `
      <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">
        <div class="orb orb-sm" style="background:${getColor(i)}22;color:${getColor(i)}">${s.initials}</div>
        <div style="flex:1;font-size:0.82rem;font-weight:500">${s.name}</div>
        <div style="font-size:0.78rem;font-weight:700;color:${col}">${s.att}%</div>
      </div>`;
  });
}

/* ── Live class ── */
function startClass() {
  isLive = true;
  document.getElementById('startScreen').style.display = 'none';
  document.getElementById('controlsBar').style.display = 'flex';
  document.getElementById('liveTopChip').style.display = 'flex';
  buildVideoGrid();
  startLiveTimer();
  simulateStudentJoins();
  renderChat();
  buildRoster();
}

function startLiveTimer() {
  liveSeconds = 0;
  liveInterval = setInterval(() => {
    liveSeconds++;
    const m = String(Math.floor(liveSeconds / 60)).padStart(2, '0');
    const s = String(liveSeconds % 60).padStart(2, '0');
    const el = document.getElementById('liveTimerDisplay');
    if (el) el.textContent = m + ':' + s;
  }, 1000);
}

function simulateStudentJoins() {
  joinedCount = 1;
  const interval = setInterval(() => {
    if (joinedCount >= 28) { clearInterval(interval); return; }
    joinedCount += Math.floor(Math.random() * 3) + 1;
    joinedCount = Math.min(joinedCount, 28);
    const el = document.getElementById('joinedCount');
    if (el) el.textContent = joinedCount + ' joined';
  }, 700);
}

function buildVideoGrid() {
  const grid = document.getElementById('videoGrid');
  if (!grid) return;
  grid.innerHTML = '';

  // Teacher tile
  grid.innerHTML += `
    <div class="video-tile teacher" id="teacherTile">
      <div class="orb orb-xl" style="background:linear-gradient(135deg,var(--sky),var(--jade))">TK</div>
      <div class="tile-label">You (Teacher) 🎤</div>
      <div class="tile-info" id="joinedCount">0 joined</div>
    </div>`;

  // Sample student tiles
  [{ i: 1, n: 'Aarav A.' }, { i: 3, n: 'Priya R.' }, { i: 5, n: 'Mohit K.' }].forEach(({ i, n }) => {
    grid.innerHTML += `
      <div class="video-tile">
        <div class="orb orb-xl" style="background:${getColor(i)}22;color:${getColor(i)}">${getInitials(n)}</div>
        <div class="tile-label">${n}</div>
      </div>`;
  });

  // Request webcam
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      .then(stream => {
        camStream = stream;
        const tile = document.getElementById('teacherTile');
        if (!tile) return;
        const vid = document.createElement('video');
        vid.srcObject = stream;
        vid.autoplay = true;
        vid.muted = true;
        vid.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;';
        tile.insertBefore(vid, tile.firstChild);
      })
      .catch(() => { /* camera denied, avatar shown */ });
  }
}

function toggleLayout() {
  layoutIndex = (layoutIndex + 1) % LAYOUTS.length;
  const grid = document.getElementById('videoGrid');
  if (grid) grid.className = 'video-grid ' + LAYOUTS[layoutIndex];
}

function toggleCtrl(btnId, onIcon, offIcon) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  const isOn = btn.classList.contains('on');
  btn.classList.toggle('on', !isOn);
  btn.classList.toggle('off', isOn);
  // Update emoji (first text node)
  btn.childNodes[0].textContent = isOn ? offIcon : onIcon;
}

function shareScreen() {
  if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
    navigator.mediaDevices.getDisplayMedia({ video: true })
      .then(stream => { /* handle screen share stream */ })
      .catch(() => {});
  }
}

function endClass() {
  if (!confirm('End the live class for all students?')) return;
  isLive = false;
  clearInterval(liveInterval);
  if (camStream) { camStream.getTracks().forEach(t => t.stop()); camStream = null; }
  document.getElementById('controlsBar').style.display = 'none';
  document.getElementById('startScreen').style.display = 'flex';
  document.getElementById('liveTopChip').style.display = 'none';
  document.getElementById('videoGrid').innerHTML = '';
  const el = document.getElementById('liveTimerDisplay');
  if (el) el.textContent = '00:00';
  closeQuizOverlay();
}

/* ── Chat ── */
function renderChat() {
  const feed = document.getElementById('chatFeed');
  if (!feed) return;
  feed.innerHTML = '';
  chatHistory.forEach((m, i) => {
    const col = m.me ? 'var(--sky)' : getColor(i);
    feed.innerHTML += `
      <div class="chat-msg${m.me ? ' me' : ''}">
        <div class="msg-avatar orb orb-sm" style="background:${col}22;color:${col}">${m.me ? 'TK' : getInitials(m.from)}</div>
        <div class="msg-body">
          <div class="msg-name" style="color:${col}">${m.from}</div>
          <div class="msg-bubble">${m.txt}</div>
          <div class="msg-time">${m.t}</div>
        </div>
      </div>`;
  });
  feed.scrollTop = feed.scrollHeight;
}

function sendMessage() {
  const inp = document.getElementById('teacherChatInp');
  if (!inp || !inp.value.trim()) return;
  chatHistory.push({ from: 'You (Teacher)', me: true, txt: inp.value.trim(), t: getNow() });
  inp.value = '';
  renderChat();
}

function handleChatKey(e) {
  if (e.key === 'Enter') sendMessage();
}

/* ── Roster ── */
function buildRoster() {
  const el = document.getElementById('rosterList');
  if (!el) return;
  el.innerHTML = '';
  STUDENTS_DB.slice(0, 16).forEach((s, i) => {
    const online = Math.random() > 0.2;
    el.innerHTML += `
      <div class="roster-row">
        <div class="orb orb-sm" style="background:${getColor(i)}22;color:${getColor(i)}">${s.initials}</div>
        <div class="roster-name">${s.name.split(' ')[0]}</div>
        <div class="roster-icons">
          ${Math.random() > 0.75 ? '✋' : ''}
          ${Math.random() > 0.8  ? '🔇' : ''}
        </div>
        <div class="online-dot ${online ? 'dot-on' : 'dot-off'}"></div>
      </div>`;
  });
}

/* ── Panel tabs ── */
function switchPanel(btn, panelId) {
  document.querySelectorAll('.panel-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  ['chatPanel', 'rosterPanel', 'notesPanel'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = id === panelId ? 'flex' : 'none';
  });
}

/* ── Quiz overlay ── */
function launchQuiz() {
  const overlay = document.getElementById('quizOverlay');
  const box = document.getElementById('quizBox');
  if (!overlay || !box) return;
  overlay.classList.add('show');
  QuizEngine.init(box, QUIZ_QUESTIONS, 'teacher', 0);
}

function launchPoll() {
  const overlay = document.getElementById('quizOverlay');
  const box = document.getElementById('quizBox');
  if (!overlay || !box) return;
  overlay.classList.add('show');
  box.innerHTML = `
    <div class="quiz-top">
      <div style="display:inline-flex;align-items:center;gap:6px;background:var(--amber-dim);border:1px solid rgba(245,158,11,0.25);color:var(--amber);padding:4px 12px;border-radius:20px;font-size:0.72rem;font-weight:700">
        📊 QUICK POLL
      </div>
      <button class="btn btn-ghost btn-sm" onclick="closeQuizOverlay()">✕ Close</button>
    </div>
    <div class="quiz-question">Do you understand the concept so far?</div>
    <div class="quiz-opts">
      <div class="quiz-opt" onclick="this.classList.add('selected')">
        <div class="opt-key" style="background:var(--jade-dim);color:var(--jade)">✓</div> Yes, I understand!
      </div>
      <div class="quiz-opt" onclick="this.classList.add('selected')">
        <div class="opt-key" style="background:var(--amber-dim);color:var(--amber)">~</div> Somewhat
      </div>
      <div class="quiz-opt" onclick="this.classList.add('selected')">
        <div class="opt-key" style="background:var(--coral-dim);color:var(--coral)">✗</div> Not yet, please explain again
      </div>
    </div>
    <div class="quiz-footer">
      <div style="font-size:0.78rem;color:var(--text2)">Responses: <strong>0</strong>/30</div>
      <button class="btn btn-primary btn-sm" onclick="closeQuizOverlay()">Close Poll</button>
    </div>`;
}

function closeQuizOverlay() {
  const overlay = document.getElementById('quizOverlay');
  if (overlay) overlay.classList.remove('show');
}

/* ── Attendance page ── */
function buildAttendanceTable() {
  const tbody = document.getElementById('attTbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  STUDENTS_DB.forEach((s, i) => {
    const col   = s.att >= 90 ? 'var(--jade)' : s.att >= 75 ? 'var(--amber)' : 'var(--coral)';
    const tag   = s.att >= 90 ? 'badge-jade'  : s.att >= 75 ? 'badge-amber'  : 'badge-coral';
    const label = s.att >= 90 ? 'Good'         : s.att >= 75 ? 'Average'      : 'At Risk';
    const trend = s.att >= 85 ? '↑' : s.att >= 70 ? '→' : '↓';
    tbody.innerHTML += `
      <tr>
        <td style="color:var(--text3)">${i + 1}</td>
        <td>
          <div style="display:flex;align-items:center;gap:8px">
            <div class="orb orb-sm" style="background:${getColor(i)}22;color:${getColor(i)}">${s.initials}</div>
            <span style="font-weight:500">${s.name}</span>
          </div>
        </td>
        <td style="color:var(--text2)">${s.subjects.join(', ')}</td>
        <td>${s.att}/100</td>
        <td>
          <div style="font-weight:700;color:${col}">${s.att}%</div>
          <div class="att-mini-bar"><div class="att-mini-fill" style="width:${s.att}%;background:${col}"></div></div>
        </td>
        <td style="color:${col};font-weight:700">${trend}</td>
        <td><span class="badge ${tag}">${label}</span></td>
      </tr>`;
  });
}

/* ── Students page ── */
function buildStudentsTable() {
  const tbody = document.getElementById('studentsTbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  STUDENTS_DB.forEach((s, i) => {
    const attCol   = s.att >= 90 ? 'var(--jade)' : s.att >= 75 ? 'var(--amber)' : 'var(--coral)';
    const score    = Math.floor(55 + Math.random() * 45);
    const scoreCol = score >= 75 ? 'var(--jade)' : score >= 50 ? 'var(--amber)' : 'var(--coral)';
    const status   = s.att >= 75 && score >= 50 ? 'badge-jade' : 'badge-amber';
    const statusLb = s.att >= 75 && score >= 50 ? 'On Track'   : 'Needs Attention';
    tbody.innerHTML += `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:10px">
            <div class="orb orb-sm" style="background:${getColor(i)}22;color:${getColor(i)}">${s.initials}</div>
            <span style="font-weight:500">${s.name}</span>
          </div>
        </td>
        <td style="font-family:monospace;font-size:0.78rem;color:var(--text2)">${s.id}</td>
        <td style="font-size:0.78rem;color:var(--text2)">${s.subjects.join(', ')}</td>
        <td style="font-weight:700;color:${attCol}">${s.att}%</td>
        <td style="font-weight:700;color:${scoreCol}">${score}%</td>
        <td><span class="badge ${status}">${statusLb}</span></td>
      </tr>`;
  });
}

/* ── Quiz builder page ── */
function buildQuizCards() {
  const container = document.getElementById('quizCardGrid');
  if (!container) return;
  container.innerHTML = '';
  QUIZZES.forEach(qz => {
    const col = qz.avg >= 80 ? 'var(--jade)' : qz.avg >= 65 ? 'var(--amber)' : 'var(--coral)';
    container.innerHTML += `
      <div class="qb-card">
        <div class="qb-icon">${qz.icon}</div>
        <div class="qb-name">${qz.title}</div>
        <div class="qb-meta">${qz.subj} · ${qz.q} questions</div>
        <div class="qb-stats">
          <div class="qb-stat">
            <div class="qb-stat-n" style="color:var(--sky)">${qz.resp}</div>
            <div class="qb-stat-l">Responses</div>
          </div>
          <div class="qb-stat">
            <div class="qb-stat-n" style="color:${col}">${qz.avg}%</div>
            <div class="qb-stat-l">Avg Score</div>
          </div>
          <div class="qb-stat">
            <div class="qb-stat-n" style="color:var(--text2)">${qz.time}</div>
            <div class="qb-stat-l">Avg Time</div>
          </div>
        </div>
        <div class="qb-actions">
          <button class="btn btn-danger btn-sm" onclick="showPage('live');setTimeout(()=>{ if(!isLive) startClass(); setTimeout(launchQuiz,1200); },300)">▶ Launch</button>
          <button class="btn btn-ghost btn-sm">📊 Results</button>
          <button class="btn btn-ghost btn-sm">✏️ Edit</button>
        </div>
      </div>`;
  });
}

/* ── Modals ── */
function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('open');
}
function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
}

/* ── Init ── */
document.addEventListener('DOMContentLoaded', () => {
  buildDashboard();
  renderChat();

  // Close modals on backdrop click
  document.querySelectorAll('.modal-overlay').forEach(m => {
    m.addEventListener('click', e => { if (e.target === m) m.classList.remove('open'); });
  });
});
