/* ============================================================
   teacher.js — Teacher dashboard (real Supabase backend)
   ============================================================ */

let isLive = false; let liveInterval = null; let liveSeconds = 0;
let camStream = null; let layoutIndex = 0;
const LAYOUTS = ['g-4','g-2','g-1','g-n'];
let teacherProfile = null;
let currentClassId = null;

const chatHistory = [
  { from:'System', me:false, txt:'Class chat is ready. Students will appear here when they join.', t:'—' }
];

/* ── Page nav ── */
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('page-'+id)?.classList.add('active');
  document.getElementById('nb-'+id)?.classList.add('active');
  const titles = { dash:'Dashboard', live:'Live Class', quiz:'Quiz Builder', att:'Attendance', students:'My Students' };
  setText('pageTitle', titles[id] || id);
  if (id === 'att')      loadAttendanceTable();
  if (id === 'quiz')     loadQuizCards();
  if (id === 'students') loadStudentsTable();
  if (id === 'dash')     loadDashboard();
}

function filterSubject(el) {
  document.querySelectorAll('.subj-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
}

/* ── Init teacher session ── */
async function initTeacher() {
  try {
    const { data: { session } } = await db.auth.getSession();
    if (!session) { window.location.href = 'student.html'; return; }
    const profile = await fetchTeacherProfile(session.user.id);
    if (!profile || profile.role !== 'teacher') {
      /* Not a teacher — redirect to student portal */
      window.location.href = 'student.html';
      return;
    }
    teacherProfile = profile;
    loadDashboard();
    renderChat();
  } catch (e) {
    console.warn('Teacher init error:', e.message);
  }
}

async function fetchTeacherProfile(userId) {
  const { data } = await db.from('profiles').select('*').eq('id', userId).single();
  return data;
}

/* ── Dashboard ── */
async function loadDashboard() {
  loadDashStats();
  loadDashSchedule();
  loadDashAttendanceSnap();
}

async function loadDashStats() {
  try {
    const [{ count: students }, { count: classes }, { count: quizzes }] = await Promise.all([
      db.from('profiles').select('*', { count:'exact', head:true }).eq('role','student'),
      db.from('classes').select('*', { count:'exact', head:true }),
      db.from('quizzes').select('*', { count:'exact', head:true }),
    ]);
    setText('statStudents', students || 0);
    setText('statClasses',  classes  || 0);
    setText('statQuizzes',  quizzes  || 0);
  } catch (_) {}
}

async function loadDashSchedule() {
  const el = document.getElementById('scheduleList');
  if (!el) return;
  try {
    const { data: classes } = await db.from('classes').select('*')
      .neq('status','ended').order('scheduled_at').limit(5);
    if (!classes?.length) { el.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text3);font-size:0.84rem">No classes scheduled yet.</div>'; return; }
    el.innerHTML = classes.map(c => {
      const dt  = new Date(c.scheduled_at);
      const col = c.status === 'live' ? 'var(--coral)' : 'var(--sky)';
      return `<div class="sched-item">
        <div class="sched-dot" style="background:${col}"></div>
        <div class="sched-info">
          <div class="sched-name">${c.title}</div>
          <div class="sched-time">${dt.toLocaleString('en-IN',{weekday:'short',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})} · ${c.subject}</div>
        </div>
        ${c.status==='live'
          ? `<button class="btn btn-danger btn-sm" onclick="showPage('live')">Join</button>`
          : `<button class="btn btn-primary btn-sm" onclick="startClassById('${c.id}')">Start</button>`}
      </div>`;
    }).join('');
  } catch (e) { el.innerHTML = '<div style="padding:20px;color:var(--coral);font-size:0.8rem">Could not load schedule.</div>'; }
}

async function loadDashAttendanceSnap() {
  const el = document.getElementById('dashAttList');
  if (!el) return;
  try {
    const { data: rows } = await db.from('attendance_summary').select('*').order('attendance_pct', { ascending:true }).limit(8);
    if (!rows?.length) { el.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text3);font-size:0.84rem">No attendance data yet.</div>'; return; }
    el.innerHTML = rows.map((s, i) => {
      const col = s.attendance_pct >= 90 ? 'var(--jade)' : s.attendance_pct >= 75 ? 'var(--amber)' : 'var(--coral)';
      const ini = (s.full_name||'S').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
      return `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">
        <div class="orb orb-sm" style="background:${getColor(i)}22;color:${getColor(i)}">${ini}</div>
        <div style="flex:1;font-size:0.82rem;font-weight:500">${s.full_name}</div>
        <div style="font-size:0.78rem;font-weight:700;color:${col}">${s.attendance_pct||0}%</div>
      </div>`;
    }).join('');
  } catch (_) {}
}

/* ── Schedule a class ── */
async function scheduleClass() {
  const title    = document.getElementById('schedTitle')?.value?.trim();
  const subject  = document.getElementById('schedSubject')?.value;
  const date     = document.getElementById('schedDate')?.value;
  const time     = document.getElementById('schedTime')?.value;
  const duration = document.getElementById('schedDuration')?.value || 60;

  if (!title || !date || !time) { alert('Please fill in the title, date and time.'); return; }

  const scheduledAt = new Date(date + 'T' + time).toISOString();
  const roomCode = subject.slice(0,3).toUpperCase() + '-' + Math.random().toString(36).slice(2,6).toUpperCase();

  try {
    const { error } = await db.from('classes').insert({
      title, subject, scheduled_at: scheduledAt,
      duration_mins: parseInt(duration),
      room_code: roomCode,
      status: 'scheduled',
      teacher_id: teacherProfile?.id,
    });
    if (error) throw error;
    closeModal('schedModal');
    alert(`✅ Class scheduled!\nRoom Code: ${roomCode}\nShare this code with your students.`);
    loadDashboard();
  } catch (e) {
    alert('Could not schedule class: ' + e.message);
  }
}

/* ── Start class ── */
async function startClass() {
  /* Start most recently scheduled class */
  try {
    const { data: cls } = await db.from('classes').select('*')
      .eq('status','scheduled').order('scheduled_at').limit(1).single();
    if (cls) { await startClassById(cls.id); return; }
  } catch (_) {}
  /* No scheduled class — start a quick one */
  await startClassById(null);
}

async function startClassById(classId) {
  showPage('live');
  try {
    if (classId) {
      await db.from('classes').update({ status:'live' }).eq('id', classId);
      currentClassId = classId;
    } else {
      /* Quick start without pre-scheduling */
      const code = 'LIVE-' + Math.random().toString(36).slice(2,6).toUpperCase();
      const { data: newCls } = await db.from('classes').insert({
        title: 'Live Class', subject: 'General',
        scheduled_at: new Date().toISOString(),
        status: 'live', room_code: code,
        teacher_id: teacherProfile?.id,
      }).select().single();
      if (newCls) currentClassId = newCls.id;
    }
  } catch (e) { console.warn('Could not update class status:', e.message); }

  isLive = true;
  document.getElementById('startScreen').style.display   = 'none';
  document.getElementById('controlsBar').style.display   = 'flex';
  document.getElementById('liveTopChip').style.display   = 'flex';
  buildVideoGrid(); startLiveTimer(); renderChat(); buildRoster();
}

function startLiveTimer() {
  liveSeconds = 0;
  liveInterval = setInterval(() => {
    liveSeconds++;
    const m = String(Math.floor(liveSeconds/60)).padStart(2,'0');
    const s = String(liveSeconds%60).padStart(2,'0');
    setText('liveTimerDisplay', m+':'+s);
  }, 1000);
}

function buildVideoGrid() {
  const grid = document.getElementById('videoGrid');
  if (!grid) return;
  grid.innerHTML = `
    <div class="video-tile teacher" id="teacherTile">
      <div class="orb orb-xl" style="background:linear-gradient(135deg,var(--sky),var(--jade))">TK</div>
      <div class="tile-label">You (Teacher) 🎤</div>
      <div class="tile-info" id="joinedCount">0 joined</div>
    </div>`;
  [['Aarav A.',1],['Priya R.',3],['Mohit K.',5]].forEach(([n,i]) => {
    grid.innerHTML += `<div class="video-tile">
      <div class="orb orb-xl" style="background:${getColor(i)}22;color:${getColor(i)}">${n.split(' ').map(w=>w[0]).join('')}</div>
      <div class="tile-label">${n}</div></div>`;
  });
  if (navigator.mediaDevices?.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ video:true, audio:false }).then(stream => {
      camStream = stream;
      const tile = document.getElementById('teacherTile');
      if (!tile) return;
      const vid = document.createElement('video');
      vid.srcObject = stream; vid.autoplay = true; vid.muted = true;
      vid.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;';
      tile.insertBefore(vid, tile.firstChild);
    }).catch(() => {});
  }
}

function toggleLayout()       { layoutIndex=(layoutIndex+1)%LAYOUTS.length; const g=document.getElementById('videoGrid'); if(g) g.className='video-grid '+LAYOUTS[layoutIndex]; }
function toggleCtrl(id,on,off){ const b=document.getElementById(id); if(!b) return; const isOn=b.classList.contains('on'); b.classList.toggle('on',!isOn); b.classList.toggle('off',isOn); b.childNodes[0].textContent=isOn?off:on; }
function shareScreen()        { navigator.mediaDevices?.getDisplayMedia({video:true}).then(()=>{}).catch(()=>{}); }

async function endClass() {
  if (!confirm('End the live class for all students?')) return;
  isLive = false;
  clearInterval(liveInterval);
  if (camStream) { camStream.getTracks().forEach(t=>t.stop()); camStream=null; }
  /* Mark class as ended in DB */
  if (currentClassId) {
    try { await db.from('classes').update({ status:'ended' }).eq('id', currentClassId); } catch (_) {}
    currentClassId = null;
  }
  document.getElementById('controlsBar').style.display = 'none';
  document.getElementById('startScreen').style.display  = 'flex';
  document.getElementById('liveTopChip').style.display  = 'none';
  document.getElementById('videoGrid').innerHTML = '';
  setText('liveTimerDisplay', '00:00');
  closeQuizOverlay();
  loadDashboard();
}

/* ── Attendance table ── */
async function loadAttendanceTable() {
  const tbody = document.getElementById('attTbody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--text3)">Loading…</td></tr>';
  try {
    const { data: rows } = await db.from('attendance_summary').select('*').order('full_name');
    if (!rows?.length) { tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--text3)">No students yet. Add students first.</td></tr>'; return; }
    tbody.innerHTML = rows.map((s, i) => {
      const pct   = s.attendance_pct || 0;
      const col   = pct >= 90 ? 'var(--jade)' : pct >= 75 ? 'var(--amber)' : 'var(--coral)';
      const tag   = pct >= 90 ? 'badge-jade'  : pct >= 75 ? 'badge-amber'  : 'badge-coral';
      const label = pct >= 90 ? 'Good'         : pct >= 75 ? 'Average'      : 'At Risk';
      const trend = pct >= 85 ? '↑' : pct >= 70 ? '→' : '↓';
      const ini   = (s.full_name||'S').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
      return `<tr>
        <td style="color:var(--text3)">${i+1}</td>
        <td><div style="display:flex;align-items:center;gap:8px">
          <div class="orb orb-sm" style="background:${getColor(i)}22;color:${getColor(i)}">${ini}</div>
          <span style="font-weight:500">${s.full_name}</span></div></td>
        <td style="font-family:monospace;font-size:0.78rem;color:var(--text2)">${s.student_code}</td>
        <td>${s.present_count||0}/${s.total_classes||0}</td>
        <td><div style="font-weight:700;color:${col}">${pct}%</div>
          <div class="att-mini-bar"><div class="att-mini-fill" style="width:${pct}%;background:${col}"></div></div></td>
        <td style="color:${col};font-weight:700">${trend}</td>
        <td><span class="badge ${tag}">${label}</span></td>
      </tr>`;
    }).join('');
  } catch (e) { tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--coral)">Could not load: ${e.message}</td></tr>`; }
}

/* ── Students table ── */
async function loadStudentsTable() {
  const tbody = document.getElementById('studentsTbody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:30px;color:var(--text3)">Loading…</td></tr>';
  try {
    const { data: students } = await db.from('profiles').select('*, attendance_summary(attendance_pct)').eq('role','student').order('full_name');
    if (!students?.length) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:30px;color:var(--text3)">No students yet. Use the Admin panel to add students.</td></tr>'; return; }
    tbody.innerHTML = students.map((s, i) => {
      const pct = s.attendance_summary?.[0]?.attendance_pct || 0;
      const col = pct >= 90 ? 'var(--jade)' : pct >= 75 ? 'var(--amber)' : 'var(--coral)';
      const ini = (s.full_name||'S').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
      return `<tr>
        <td><div style="display:flex;align-items:center;gap:10px">
          <div class="orb orb-sm" style="background:${getColor(i)}22;color:${getColor(i)}">${ini}</div>
          <span style="font-weight:500">${s.full_name}</span></div></td>
        <td style="font-family:monospace;font-size:0.78rem;color:var(--text2)">${s.student_id}</td>
        <td style="font-size:0.78rem;color:var(--text2)">${(s.subjects||[]).join(', ')||'—'}</td>
        <td style="font-weight:700;color:${col}">${pct}%</td>
        <td><span class="badge ${pct>=75?'badge-jade':'badge-coral'}">${pct>=75?'On Track':'At Risk'}</span></td>
      </tr>`;
    }).join('');
  } catch (e) { tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:30px;color:var(--coral)">Error: ${e.message}</td></tr>`; }
}

/* ── Quiz builder ── */
async function loadQuizCards() {
  const container = document.getElementById('quizCardGrid');
  if (!container) return;
  container.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text3)">Loading…</div>';
  try {
    const { data: quizzes } = await db.from('quizzes').select('*, quiz_responses(score,total)').order('created_at', { ascending:false });
    if (!quizzes?.length) {
      container.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text3);grid-column:1/-1">No quizzes yet. Click "+ Create Quiz" to make your first one.</div>';
      return;
    }
    container.innerHTML = quizzes.map(qz => {
      const responses = qz.quiz_responses || [];
      const avg = responses.length ? Math.round(responses.reduce((a,r) => a + (r.score/Math.max(r.total,1)*100), 0) / responses.length) : 0;
      const col = avg >= 80 ? 'var(--jade)' : avg >= 65 ? 'var(--amber)' : responses.length ? 'var(--coral)' : 'var(--text2)';
      const statusTag = qz.status === 'live' ? '<span class="badge badge-coral">🔴 Live</span>' : qz.status === 'ended' ? '<span class="badge badge-jade">Done</span>' : '<span class="badge badge-amber">Draft</span>';
      return `<div class="qb-card">
        <div class="qb-icon">📝</div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
          <div class="qb-name">${qz.title}</div>${statusTag}
        </div>
        <div class="qb-meta">${qz.subject} · ${qz.questions?.length||0} questions</div>
        <div class="qb-stats">
          <div class="qb-stat"><div class="qb-stat-n" style="color:var(--sky)">${responses.length}</div><div class="qb-stat-l">Responses</div></div>
          <div class="qb-stat"><div class="qb-stat-n" style="color:${col}">${responses.length ? avg+'%' : '—'}</div><div class="qb-stat-l">Avg Score</div></div>
          <div class="qb-stat"><div class="qb-stat-n" style="color:var(--text2)">${qz.questions?.length||0}</div><div class="qb-stat-l">Questions</div></div>
        </div>
        <div class="qb-actions">
          <button class="btn btn-danger btn-sm" onclick="launchSavedQuiz('${qz.id}')">▶ Launch</button>
          <button class="btn btn-ghost btn-sm">📊 Results</button>
          <button class="btn btn-ghost btn-sm" onclick="deleteQuiz('${qz.id}')">🗑</button>
        </div>
      </div>`;
    }).join('');
  } catch (e) { container.innerHTML = `<div style="padding:40px;text-align:center;color:var(--coral)">Error: ${e.message}</div>`; }
}

/* ── Save a new quiz ── */
async function saveQuiz() {
  const title   = document.getElementById('newQuizTitle')?.value?.trim();
  const subject = document.getElementById('newQuizSubject')?.value;
  const timer   = parseInt(document.getElementById('newQuizTimer')?.value) || 30;
  const q1      = document.getElementById('newQ1')?.value?.trim();
  const opts    = ['newOptA','newOptB','newOptC','newOptD'].map(id => document.getElementById(id)?.value?.trim());
  const ans     = parseInt(document.getElementById('newCorrect')?.value) || 0;

  if (!title || !q1 || opts.some(o => !o)) { alert('Please fill in all fields.'); return; }

  const questions = [{ q: q1, opts, ans, time: timer }];

  try {
    const { error } = await db.from('quizzes').insert({
      title, subject, questions,
      timer_secs: timer,
      status: 'draft',
      teacher_id: teacherProfile?.id,
    });
    if (error) throw error;
    closeModal('quizModal');
    alert('✅ Quiz saved! You can launch it from the Quiz Builder page during a live class.');
    loadQuizCards();
  } catch (e) { alert('Could not save quiz: ' + e.message); }
}

/* ── Launch a saved quiz live ── */
async function launchSavedQuiz(quizId) {
  try {
    await db.from('quizzes').update({ status:'live', class_id: currentClassId }).eq('id', quizId);
    const { data: quiz } = await db.from('quizzes').select('*').eq('id', quizId).single();
    showPage('live');
    if (!isLive) startClass();
    setTimeout(() => {
      const overlay = document.getElementById('quizOverlay');
      const box     = document.getElementById('quizBox');
      if (overlay && box) {
        overlay.classList.add('show');
        QuizEngine.init(box, quiz.questions, 'teacher', 0, async () => {
          await db.from('quizzes').update({ status:'ended' }).eq('id', quizId);
          loadQuizCards();
        });
      }
    }, 500);
  } catch (e) { alert('Could not launch quiz: ' + e.message); }
}

async function deleteQuiz(quizId) {
  if (!confirm('Delete this quiz? This cannot be undone.')) return;
  try {
    await db.from('quizzes').delete().eq('id', quizId);
    loadQuizCards();
  } catch (e) { alert('Could not delete: ' + e.message); }
}

/* ── Quiz overlay (in-class) ── */
function launchQuiz() {
  const overlay = document.getElementById('quizOverlay');
  const box     = document.getElementById('quizBox');
  if (!overlay || !box) return;
  /* Use built-in demo questions if no quiz loaded */
  overlay.classList.add('show');
  QuizEngine.init(box, QUIZ_QUESTIONS, 'teacher', 0);
}
function launchPoll() {
  const overlay = document.getElementById('quizOverlay');
  const box     = document.getElementById('quizBox');
  if (!overlay || !box) return;
  overlay.classList.add('show');
  box.innerHTML = `
    <div class="quiz-top">
      <div style="display:inline-flex;align-items:center;gap:6px;background:var(--amber-dim);border:1px solid rgba(245,158,11,0.25);color:var(--amber);padding:4px 12px;border-radius:20px;font-size:0.72rem;font-weight:700">📊 QUICK POLL</div>
      <button class="btn btn-ghost btn-sm" onclick="closeQuizOverlay()">✕ Close</button>
    </div>
    <div class="quiz-question">Do you understand the concept so far?</div>
    <div class="quiz-opts">
      <div class="quiz-opt" onclick="this.classList.add('selected')"><div class="opt-key" style="background:var(--jade-dim);color:var(--jade)">✓</div> Yes, I understand!</div>
      <div class="quiz-opt" onclick="this.classList.add('selected')"><div class="opt-key" style="background:var(--amber-dim);color:var(--amber)">~</div> Somewhat</div>
      <div class="quiz-opt" onclick="this.classList.add('selected')"><div class="opt-key" style="background:var(--coral-dim);color:var(--coral)">✗</div> Please explain again</div>
    </div>
    <div class="quiz-footer">
      <div style="font-size:0.78rem;color:var(--text2)">Responses: <strong>0</strong>/30</div>
      <button class="btn btn-primary btn-sm" onclick="closeQuizOverlay()">Close Poll</button>
    </div>`;
}
function closeQuizOverlay() { document.getElementById('quizOverlay')?.classList.remove('show'); }

/* ── Chat ── */
function renderChat() {
  const feed = document.getElementById('chatFeed');
  if (!feed) return;
  feed.innerHTML = chatHistory.map((m, i) => {
    const col = m.me ? 'var(--sky)' : getColor(i);
    return `<div class="chat-msg${m.me?' me':''}">
      <div class="msg-avatar orb orb-sm" style="background:${col}22;color:${col}">${m.me?'TK':m.from.slice(0,2).toUpperCase()}</div>
      <div class="msg-body">
        <div class="msg-name" style="color:${col}">${m.from}</div>
        <div class="msg-bubble">${m.txt}</div>
        <div class="msg-time">${m.t}</div>
      </div></div>`;
  }).join('');
  feed.scrollTop = feed.scrollHeight;
}
function sendMessage() {
  const inp = document.getElementById('teacherChatInp');
  if (!inp?.value.trim()) return;
  chatHistory.push({ from:'You (Teacher)', me:true, txt:inp.value.trim(), t:getNow() });
  inp.value = ''; renderChat();
}
function handleChatKey(e) { if (e.key==='Enter') sendMessage(); }

/* ── Roster ── */
async function buildRoster() {
  const el = document.getElementById('rosterList');
  if (!el) return;
  try {
    const { data: students } = await db.from('profiles').select('full_name,student_id').eq('role','student').order('full_name').limit(20);
    el.innerHTML = (students||[]).map((s,i) => {
      const ini = (s.full_name||'S').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
      return `<div class="roster-row">
        <div class="orb orb-sm" style="background:${getColor(i)}22;color:${getColor(i)}">${ini}</div>
        <div class="roster-name">${s.full_name.split(' ')[0]}</div>
        <div class="online-dot dot-on"></div>
      </div>`;
    }).join('') || '<div style="padding:14px;font-size:0.8rem;color:var(--text3)">No students added yet.</div>';
  } catch (_) { el.innerHTML = '<div style="padding:14px;font-size:0.8rem;color:var(--text3)">Could not load roster.</div>'; }
}

/* ── Panel tabs ── */
function switchPanel(btn, panelId) {
  document.querySelectorAll('.panel-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  ['chatPanel','rosterPanel','notesPanel'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = id===panelId ? 'flex' : 'none';
  });
}

/* ── Modals ── */
function openModal(id)  { document.getElementById(id)?.classList.add('open'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }

/* ── Helpers ── */
function setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }
function getColor(i)      { return ['#3b82f6','#06d6a0','#f59e0b','#f43f5e','#a78bfa','#ec4899','#14b8a6','#f97316','#84cc16','#06b6d4'][i%10]; }
function getNow()         { const d=new Date(); return d.getHours()+':'+String(d.getMinutes()).padStart(2,'0'); }

/* ── Init ── */
document.addEventListener('DOMContentLoaded', () => {
  initTeacher();
  document.querySelectorAll('.modal-overlay').forEach(m => m.addEventListener('click', e => { if(e.target===m) m.classList.remove('open'); }));
});
