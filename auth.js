/* ============================================================
   auth.js — Real authentication via Supabase
   ============================================================ */

let currentUser    = null;
let currentProfile = null;
let studentCamStream = null;

/* ── Login UI helpers ── */
function switchLoginMode(mode, btn) {
  document.querySelectorAll('.login-toggle-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  document.getElementById('loginFormWrap').style.display = mode === 'login' ? 'block' : 'none';
  document.getElementById('joinFormWrap').style.display  = mode === 'join'  ? 'block' : 'none';
}
function togglePassword() {
  const inp = document.getElementById('pwInput');
  const btn = document.getElementById('eyeBtn');
  if (!inp) return;
  inp.type = inp.type === 'password' ? 'text' : 'password';
  btn.textContent = inp.type === 'password' ? '👁' : '🙈';
}
function toggleRoomPanel() { document.getElementById('roomCodePanel')?.classList.toggle('show'); }
function loginEnterKey(e)  { if (e.key === 'Enter') doLogin(); }

/* ── Real login via Supabase Auth ── */
async function doLogin() {
  const code = (document.getElementById('studentIdInput')?.value || '').trim().toUpperCase();
  const pw   = document.getElementById('pwInput')?.value || '';
  const btn  = document.getElementById('loginSubmitBtn');
  if (!code || !pw) { showLoginError('Please enter your Student ID and password.'); return; }
  setBtn(btn, 'Signing in…', true);
  hideLoginError();
  try {
    const email = code.toLowerCase() + '@edulive.app';
    const { data, error } = await db.auth.signInWithPassword({ email, password: pw });
    if (error) { showLoginError('Incorrect Student ID or password.'); setBtn(btn, 'Sign In →', false); return; }
    const profile = await fetchProfile(data.user.id);
    if (!profile) { showLoginError('Profile missing. Contact your teacher.'); setBtn(btn, 'Sign In →', false); return; }
    currentUser = data.user; currentProfile = profile;
    showStudentDash(profile);
  } catch (e) {
    showLoginError('Something went wrong. Please try again.');
    setBtn(btn, 'Sign In →', false);
  }
}

/* ── Join with room code ── */
async function joinWithCode(from) {
  const codeEl = from === 'panel'
    ? document.getElementById('roomCodeInput')
    : document.getElementById('inlineRoomCode');
  const code = (codeEl?.value || '').trim().toUpperCase();
  if (!code) { alert('Please enter a room code.'); return; }
  try {
    const { data: cls, error } = await db.from('classes').select('*').eq('room_code', code).single();
    if (error || !cls) { alert('Room code not found.'); return; }
    if (cls.status === 'ended') { alert('This class has already ended.'); return; }
    if (!currentUser) {
      const name = prompt('Enter your full name to join as guest:');
      if (!name) return;
      currentProfile = { full_name: name, student_id: 'GUEST', role: 'student', subjects: [] };
      showStudentDash(currentProfile);
    }
    openJoinModal(cls);
  } catch (e) { alert('Could not find that room code.'); }
}

/* ── Restore session on page reload ── */
async function restoreSession() {
  try {
    const { data: { session } } = await db.auth.getSession();
    if (!session) return;
    currentUser = session.user;
    const profile = await fetchProfile(session.user.id);
    if (!profile) return;
    currentProfile = profile;
    showStudentDash(profile);
  } catch (e) { /* no saved session */ }
}

/* ── Fetch profile row ── */
async function fetchProfile(userId) {
  const { data, error } = await db.from('profiles').select('*').eq('id', userId).single();
  if (error) return null;
  return data;
}

/* ── Show dashboard ── */
function showStudentDash(profile) {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('studentDash').style.display = 'block';
  const ini = getInitials(profile.full_name);
  setText('navOrbEl', ini); setText('navNameEl', profile.full_name.split(' ')[0]);
  setText('profileOrbEl', ini); setText('profileNameEl', profile.full_name);
  setText('profileIdEl', 'Student ID: ' + profile.student_id);
  loadAllStudentData(profile);
}

/* ── Load everything ── */
function loadAllStudentData(profile) {
  loadStudentClasses();
  loadStudentAssignments(profile);
  loadStudentQuizzes(profile);
  loadStudentAttendance(profile);
  loadStudentProfile(profile);
  loadLiveBanner();
}

/* ── Live banner ── */
async function loadLiveBanner() {
  try {
    const { data: live } = await db.from('classes').select('*').eq('status', 'live').limit(1).single();
    const banner = document.getElementById('liveBanner');
    if (live && banner) {
      setText('liveClassName', live.title);
      setText('liveClassMeta', live.subject + ' · Code: ' + (live.room_code || ''));
      banner.style.display = 'flex';
    } else if (banner) { banner.style.display = 'none'; }
  } catch (_) {}
}

/* ── Classes ── */
async function loadStudentClasses() {
  const all  = document.getElementById('allClassCards');
  const home = document.getElementById('homeClassCards');
  if (all) all.innerHTML = loadingHTML();
  try {
    const { data: classes } = await db.from('classes').select('*').order('scheduled_at');
    const cards = (classes || []).map(c => makeClassCard(c)).join('');
    if (all)  all.innerHTML  = cards || emptyHTML('No classes scheduled yet.');
    if (home) home.innerHTML = (classes || []).filter(c => c.status !== 'ended').slice(0, 3).map(c => makeClassCard(c)).join('') || emptyHTML('No upcoming classes.');
  } catch (e) {
    if (all) all.innerHTML = errorHTML('Could not load classes.');
  }
}

function makeClassCard(c) {
  const tagMap = {
    live:      '<span class="s-tag s-tag-live">🔴 Live Now</span>',
    scheduled: '<span class="s-tag s-tag-soon">Upcoming</span>',
    ended:     '<span class="s-tag s-tag-done">Done</span>',
  };
  const dt = c.scheduled_at ? new Date(c.scheduled_at).toLocaleString('en-IN', { weekday:'short', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' }) : 'TBD';
  return `
    <div class="s-class-card" ${c.status === 'live' ? 'onclick="openJoinModal()"' : ''}>
      <div class="scc-subject">${c.subject}</div>
      <div class="scc-name">${c.title}</div>
      <div class="scc-time">🕓 ${dt} · ${c.duration_mins || 60} min</div>
      ${c.room_code ? `<div class="scc-code">Code: ${c.room_code}</div>` : ''}
      <div class="scc-footer"><div class="scc-teacher">👤 Teacher</div>${tagMap[c.status] || ''}</div>
    </div>`;
}

/* ── Assignments ── */
async function loadStudentAssignments(profile) {
  const container = document.getElementById('allAssignList');
  const homeList  = document.getElementById('homeAssignList');
  if (container) container.innerHTML = loadingHTML();
  try {
    const { data: assignments } = await db.from('assignments')
      .select(profile.id ? `*, submissions!left(id, submitted_at, marks_obtained)` : '*')
      .order('due_at');
    const html = (assignments || []).map(a => {
      const sub = profile.id ? (a.submissions?.[0] || null) : null;
      return makeAssignmentHTML(a, sub);
    }).join('');
    if (container) container.innerHTML = html || emptyHTML('No assignments yet.');
    const pending = (assignments || []).filter(a => !a.submissions?.length);
    if (homeList) homeList.innerHTML = pending.slice(0, 2).map(a => makeAssignmentHTML(a, null)).join('') || emptyHTML('No pending assignments.');
    setText('pendingAssignCount', pending.length);
  } catch (e) {
    if (container) container.innerHTML = errorHTML('Could not load assignments.');
  }
}

function makeAssignmentHTML(a, submission) {
  const due = new Date(a.due_at); const now = new Date();
  const diff = Math.ceil((due - now) / 86400000);
  const dueClass = diff < 0 ? 'overdue' : diff <= 2 ? 'soon' : 'ok';
  const dueLabel = diff < 0 ? '⚠ Overdue' : diff === 0 ? '⏳ Due today' : diff === 1 ? '⏳ Due tomorrow' : `✓ Due ${due.toLocaleDateString('en-IN',{day:'numeric',month:'short'})}`;
  const subHTML = submission
    ? `<span class="s-tag s-tag-done">✓ Submitted${submission.marks_obtained != null ? ' · '+submission.marks_obtained+'/'+a.max_marks : ''}</span>`
    : `<span class="s-tag s-tag-live">Pending</span>`;
  const icons = { Mathematics:'📐', Physics:'🔬', English:'📖', Science:'🧪' };
  return `
    <div class="s-assign-item">
      <div class="sai-header">
        <div>
          <div class="sai-title">${icons[a.subject]||'📋'} ${a.title}</div>
          <div class="sai-meta">${a.subject} · ${a.max_marks} marks</div>
        </div>
        <div style="text-align:right">
          <div class="sai-due ${dueClass}">${dueLabel}</div>
          <div style="margin-top:4px">${subHTML}</div>
        </div>
      </div>
      <div class="sai-desc">${a.description || ''}</div>
      <div class="sai-footer">
        ${submission ? '<button class="btn-view-s">View Submission</button>' : `<button class="btn-submit-s" onclick="submitAssignment('${a.id}',this)">📤 Submit</button>`}
        <button class="btn-view-s">📎 Details</button>
      </div>
    </div>`;
}

async function submitAssignment(assignmentId, btn) {
  if (!currentProfile?.id) { alert('Please log in first.'); return; }
  const notes = prompt('Add a note (optional):') || '';
  setBtn(btn, 'Submitting…', true);
  try {
    const { error } = await db.from('submissions').insert({ assignment_id: assignmentId, student_id: currentProfile.id, notes });
    if (error) throw error;
    btn.textContent = '✓ Submitted'; btn.style.background = '#2d6a4f';
    loadStudentAssignments(currentProfile);
  } catch (e) {
    alert('Could not submit: ' + e.message);
    setBtn(btn, '📤 Submit', false);
  }
}

/* ── Quizzes ── */
async function loadStudentQuizzes(profile) {
  const container = document.getElementById('studentQuizList');
  if (!container) return;
  container.innerHTML = loadingHTML();
  try {
    const { data: quizzes } = await db.from('quizzes')
      .select(profile.id ? `*, quiz_responses!left(score, total, submitted_at)` : '*')
      .order('created_at', { ascending: false });
    let html = '';
    (quizzes || []).filter(q => q.status === 'live').forEach(q => {
      html += `<div class="s-quiz-item" style="border-color:rgba(193,127,36,0.4)" onclick="openStudentQuiz('${q.id}')">
        <div class="s-quiz-icon">🟠</div>
        <div class="s-quiz-info"><div class="s-quiz-name">${q.title}</div><div class="s-quiz-meta">${q.subject} · LIVE NOW</div></div>
        <button class="btn-submit-s">Attempt →</button></div>`;
    });
    (quizzes || []).filter(q => q.status === 'ended').forEach(q => {
      const r = q.quiz_responses?.[0];
      const pct = r ? Math.round(r.score / Math.max(r.total,1) * 100) : null;
      const col = pct == null ? '#9c8e82' : pct >= 75 ? '#2d6a4f' : pct >= 50 ? '#c17f24' : '#c0392b';
      const grade = pct == null ? '—' : pct >= 90 ? 'A+' : pct >= 75 ? 'A' : pct >= 60 ? 'B+' : pct >= 50 ? 'B' : 'C';
      html += `<div class="s-quiz-item">
        <div class="s-quiz-icon">📝</div>
        <div class="s-quiz-info"><div class="s-quiz-name">${q.title}</div><div class="s-quiz-meta">${q.subject} · ${r ? new Date(r.submitted_at).toLocaleDateString('en-IN') : 'Not attempted'}</div></div>
        <div><div class="s-quiz-score" style="color:${col}">${r ? r.score+'/'+r.total : '—'}</div><div class="s-quiz-grade">Grade ${grade}</div></div>
      </div>`;
    });
    container.innerHTML = html || emptyHTML('No quizzes yet. Your teacher will launch one during class.');
  } catch (e) { container.innerHTML = errorHTML('Could not load quizzes.'); }
}

async function openStudentQuiz(quizId) {
  const modal = document.getElementById('studentQuizModal');
  const box   = document.getElementById('studentQuizBox');
  if (!modal || !box) return;
  box.innerHTML = '<div style="padding:40px;text-align:center;color:#6b5f55">Loading quiz…</div>';
  modal.classList.add('open');
  try {
    const { data: quiz } = await db.from('quizzes').select('*').eq('id', quizId).single();
    QuizEngine.init(box, quiz.questions, 'student', 0, async (answers) => {
      if (!currentProfile?.id) return;
      const correct = answers.filter(a => a.correct).length;
      await db.from('quiz_responses').upsert({ quiz_id: quizId, student_id: currentProfile.id, answers, score: correct, total: quiz.questions.length });
      loadStudentQuizzes(currentProfile);
    });
  } catch (e) { box.innerHTML = errorHTML('Could not load quiz.'); }
}

/* ── Attendance ── */
async function loadStudentAttendance(profile) {
  if (!profile.id) return;
  try {
    const { data: summary } = await db.from('attendance_summary').select('*').eq('student_id', profile.id).single();
    const pct = summary?.attendance_pct || 0;
    setText('attPctDisplay', pct + '%'); setText('homeAttVal', pct + '%');
    setText('attPresentCount', summary?.present_count || 0);
    setText('attAbsentCount', (summary?.total_classes||0) - (summary?.present_count||0));
    const bar = document.getElementById('attBarInner');
    if (bar) setTimeout(() => bar.style.width = pct + '%', 200);
    const { data: records } = await db.from('attendance').select('*, classes(scheduled_at,subject)').eq('student_id', profile.id);
    buildAttCalendar(records || []);
    buildAttSubjectBars(records || []);
  } catch (_) {}
}

function buildAttCalendar(records) {
  const cal = document.getElementById('attCalGrid');
  if (!cal) return;
  const today = new Date(); const days = new Date(today.getFullYear(), today.getMonth()+1, 0).getDate();
  const presentDays = new Set(records.filter(r => r.status === 'present' && r.classes?.scheduled_at).map(r => new Date(r.classes.scheduled_at).getDate()));
  cal.innerHTML = '';
  for (let d = 1; d <= days; d++) {
    const cls = d === today.getDate() ? 'att-cell-today' : presentDays.has(d) ? 'att-cell-present' : 'att-cell-absent';
    cal.innerHTML += `<div class="att-cell ${cls}"></div>`;
  }
}

function buildAttSubjectBars(records) {
  const el = document.getElementById('attSubjectBars');
  if (!el) return;
  const subjects = ['Mathematics','Physics','English','Science'];
  const icons = { Mathematics:'📐', Physics:'🔬', English:'📖', Science:'🧪' };
  el.innerHTML = subjects.map(s => {
    const total   = records.filter(r => r.classes?.subject === s).length;
    const present = records.filter(r => r.classes?.subject === s && r.status === 'present').length;
    const pct = total ? Math.round(present/total*100) : 0;
    const col = pct >= 90 ? '#0d7377' : pct >= 75 ? '#c17f24' : '#c0392b';
    return `<div class="att-subj-row">
      <div class="att-subj-name">${icons[s]} ${s}</div>
      <div class="att-subj-bar"><div class="att-subj-fill" style="width:${pct}%;background:${col}"></div></div>
      <div class="att-subj-pct" style="color:${col}">${pct}%</div>
    </div>`;
  }).join('');
}

/* ── Profile ── */
function loadStudentProfile(profile) {
  setText('profileOrbEl', getInitials(profile.full_name));
  setText('profileNameEl', profile.full_name);
  setText('profileIdEl', 'Student ID: ' + profile.student_id);
  setText('profileSubjects', (profile.subjects||[]).join(', ') || 'All subjects');
  setText('profileBatch', profile.batch || '2025-26');
  if (profile.enrolled_at) setText('profileEnrolled', new Date(profile.enrolled_at).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'}));
}

/* ── Join class modal ── */
function openJoinModal(cls) {
  const modal = document.getElementById('joinClassModal');
  if (modal) modal.classList.add('open');
  if (cls) { setText('joinClassName', cls.title); setText('joinClassMeta', cls.subject + ' · ' + (cls.room_code||'')); }
  if (cls && currentProfile?.id) {
    db.from('attendance').upsert({ class_id: cls.id, student_id: currentProfile.id, status: 'present' })
      .then(() => loadStudentAttendance(currentProfile));
  }
  if (navigator.mediaDevices?.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ video:true, audio:false }).then(stream => {
      studentCamStream = stream;
      const area = document.getElementById('studentVideoPreview');
      if (!area) return;
      area.innerHTML = '';
      const vid = document.createElement('video');
      vid.srcObject = stream; vid.autoplay = true; vid.muted = true;
      vid.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;';
      area.appendChild(vid);
      const ctrl = document.createElement('div'); ctrl.className = 'vp-ctrl-bar';
      ctrl.innerHTML = `<button class="vp-btn" id="sMicBtn" onclick="toggleStudentMic()">🎤</button><button class="vp-btn" id="sCamBtn" onclick="toggleStudentCam()">📷</button>`;
      area.appendChild(ctrl);
    }).catch(() => {});
  }
}
function closeJoinModal() {
  document.getElementById('joinClassModal')?.classList.remove('open');
  if (studentCamStream) { studentCamStream.getTracks().forEach(t => t.stop()); studentCamStream = null; }
}
function toggleStudentMic() { const b = document.getElementById('sMicBtn'); if (!b) return; b.classList.toggle('muted'); b.textContent = b.classList.contains('muted') ? '🔇' : '🎤'; }
function toggleStudentCam() { const b = document.getElementById('sCamBtn'); if (!b) return; b.classList.toggle('muted'); b.textContent = b.classList.contains('muted') ? '🚫' : '📷'; }
function joinClassNow()     { closeJoinModal(); alert('✅ Joined! Integrate Daily.co/Jitsi here for real video.'); }

/* ── Logout ── */
async function logout() {
  if (!confirm('Sign out?')) return;
  await db.auth.signOut();
  currentUser = null; currentProfile = null;
  document.getElementById('studentDash').style.display = 'none';
  document.getElementById('loginScreen').style.display = 'flex';
  setBtn(document.getElementById('loginSubmitBtn'), 'Sign In →', false);
}

/* ── Section nav ── */
function showSection(id, btn) {
  document.querySelectorAll('.s-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.s-nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('sec-' + id)?.classList.add('active');
  if (btn) btn.classList.add('active');
}

/* ── Tiny helpers ── */
function setText(id, val)          { const el = document.getElementById(id); if (el) el.textContent = val; }
function getInitials(name)         { return (name||'S').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase(); }
function setBtn(btn, label, dis)   { if (!btn) return; btn.textContent = label; btn.disabled = dis; btn.style.opacity = dis ? '0.7' : '1'; }
function showLoginError(msg)       { const e = document.getElementById('loginError'); if (e) { e.querySelector('span')?.remove(); e.textContent = '⚠ ' + msg; e.classList.add('show'); } document.getElementById('studentIdInput').style.borderColor = '#c0392b'; }
function hideLoginError()          { document.getElementById('loginError')?.classList.remove('show'); document.getElementById('studentIdInput').style.borderColor = ''; }
function loadingHTML()             { return '<div style="padding:40px;text-align:center;color:#9c8e82;font-size:0.85rem">Loading…</div>'; }
function emptyHTML(msg)            { return `<div style="padding:40px;text-align:center;color:#9c8e82;font-size:0.85rem">${msg}</div>`; }
function errorHTML(msg)            { return `<div style="padding:40px;text-align:center;color:#c0392b;font-size:0.85rem">⚠ ${msg}</div>`; }

document.addEventListener('DOMContentLoaded', () => {
  restoreSession();
  document.querySelectorAll('.s-modal-bg').forEach(m => m.addEventListener('click', e => { if (e.target === m) m.classList.remove('open'); }));
});
