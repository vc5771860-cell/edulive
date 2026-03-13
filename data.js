/* ============================================================
   data.js — Shared mock data for EduLive
   In production this would be fetched from your backend API
   ============================================================ */

const STUDENTS_DB = [
  { id:'STU-2025-001', pw:'pass123', name:'Aarav Agarwal',     initials:'AA', att:92, subjects:['Math','Physics'] },
  { id:'STU-2025-002', pw:'pass123', name:'Priya Rastogi',     initials:'PR', att:88, subjects:['Math','English'] },
  { id:'STU-2025-003', pw:'pass123', name:'Mohit Kapoor',      initials:'MK', att:76, subjects:['Physics','Science'] },
  { id:'STU-2025-004', pw:'pass123', name:'Sara Joshi',        initials:'SJ', att:95, subjects:['English','Science'] },
  { id:'STU-2025-005', pw:'pass123', name:'Rohan Verma',       initials:'RV', att:83, subjects:['Math','Science'] },
  { id:'STU-2025-006', pw:'pass123', name:'Anjali Singh',      initials:'AS', att:69, subjects:['Math'] },
  { id:'STU-2025-007', pw:'pass123', name:'Dev Prasad',        initials:'DP', att:91, subjects:['Physics'] },
  { id:'STU-2025-008', pw:'pass123', name:'Meera Tiwari',      initials:'MT', att:85, subjects:['English'] },
  { id:'STU-2025-009', pw:'pass123', name:'Karan Bhatt',       initials:'KB', att:79, subjects:['Science'] },
  { id:'STU-2025-010', pw:'pass123', name:'Riya Gupta',        initials:'RG', att:93, subjects:['Math'] },
  { id:'STU-2025-011', pw:'pass123', name:'Arjun Nair',        initials:'AN', att:72, subjects:['Physics'] },
  { id:'STU-2025-012', pw:'pass123', name:'Pooja Lodha',       initials:'PL', att:88, subjects:['English'] },
  { id:'STU-2025-013', pw:'pass123', name:'Siddharth Chandra', initials:'SC', att:81, subjects:['Science'] },
  { id:'STU-2025-014', pw:'pass123', name:'Tanvi Mishra',      initials:'TM', att:97, subjects:['Math','Physics'] },
  { id:'STU-2025-015', pw:'pass123', name:'Vikram Dwivedi',    initials:'VD', att:64, subjects:['Physics'] },
  { id:'STU-2025-016', pw:'pass123', name:'Neha Hegde',        initials:'NH', att:90, subjects:['English'] },
  { id:'STU-2025-017', pw:'pass123', name:'Aman Walia',        initials:'AW', att:86, subjects:['Science'] },
  { id:'STU-2025-018', pw:'pass123', name:'Divya Fernandez',   initials:'DF', att:74, subjects:['Math'] },
  { id:'STU-2025-019', pw:'pass123', name:'Raj Zutshi',        initials:'RZ', att:88, subjects:['Physics'] },
  { id:'STU-2025-020', pw:'pass123', name:'Sneha Qureshi',     initials:'SQ', att:92, subjects:['English'] },
  { id:'STU-2025-021', pw:'pass123', name:'Amit Xu',           initials:'AX', att:78, subjects:['Science'] },
  { id:'STU-2025-022', pw:'pass123', name:'Kajal Yadav',       initials:'KY', att:83, subjects:['Math'] },
  { id:'STU-2025-023', pw:'pass123', name:'Rahul Oberoi',      initials:'RO', att:89, subjects:['Physics'] },
  { id:'STU-2025-024', pw:'pass123', name:'Nidhi Upadhyay',    initials:'NU', att:95, subjects:['English'] },
  { id:'STU-2025-025', pw:'pass123', name:'Varun Iyer',        initials:'VI', att:70, subjects:['Science'] },
  { id:'STU-2025-026', pw:'pass123', name:'Swati Ejaz',        initials:'SE', att:87, subjects:['Math'] },
  { id:'STU-2025-027', pw:'pass123', name:'Deepak Rawat',      initials:'DR', att:82, subjects:['Physics'] },
  { id:'STU-2025-028', pw:'pass123', name:'Kavya Sen',         initials:'KS', att:91, subjects:['English'] },
  { id:'STU-2025-029', pw:'pass123', name:'Harsh Tripathi',    initials:'HT', att:76, subjects:['Science'] },
  { id:'STU-2025-030', pw:'pass123', name:'Lalita Umar',       initials:'LU', att:94, subjects:['Math'] },
];

const CLASSES = [
  { subj:'📐 Mathematics', name:'Calculus — Derivatives',   teacher:'Teacher', time:'Today · 4:00 PM · 60 min',   status:'live', code:'MATH-4X9K' },
  { subj:'🔬 Physics',     name:'Waves & Oscillations',     teacher:'Teacher', time:'Tomorrow · 3:30 PM · 45 min', status:'soon', code:'PHY-8T2R'  },
  { subj:'📖 English',     name:'Essay Writing Workshop',   teacher:'Teacher', time:'Thu · 5:00 PM · 50 min',      status:'soon', code:'ENG-9K1Z'  },
  { subj:'🧪 Science',     name:'Chemical Reactions',       teacher:'Teacher', time:'Fri · 2:00 PM · 55 min',      status:'soon', code:'SCI-3W7P'  },
  { subj:'📐 Mathematics', name:'Integration Techniques',   teacher:'Teacher', time:'Mon · 4:00 PM · 60 min',      status:'soon', code:'MATH-2L8V' },
  { subj:'🔬 Physics',     name:'Kinematics Lab',           teacher:'Teacher', time:'Tue · 3:00 PM · 45 min',      status:'soon', code:'PHY-5N3M'  },
  { subj:'📐 Mathematics', name:'Integrals — Recap',        teacher:'Teacher', time:'Mar 10 · 4:00 PM',            status:'done', code:''          },
  { subj:'🔬 Physics',     name:'Forces & Motion',          teacher:'Teacher', time:'Mar 8 · 3:30 PM',             status:'done', code:''          },
];

const ASSIGNMENTS = [
  {
    icon:'📐', subj:'Mathematics',
    title:'Problem Set #5 — Integration',
    due:'Mar 15, 2026', dueStatus:'soon', marks:10,
    desc:'Solve all 12 problems from Chapter 7. Show full working. Marks are awarded for correct method even if final answer is wrong.',
    submitted: false
  },
  {
    icon:'🔬', subj:'Physics',
    title:'Lab Report — Wave Experiment',
    due:'Mar 18, 2026', dueStatus:'ok', marks:15,
    desc:'Write a 500-word lab report on the wave experiment conducted on Mar 8. Include hypothesis, observations, and conclusion.',
    submitted: false
  },
  {
    icon:'📖', subj:'English',
    title:'Essay: Technology & Society',
    due:'Mar 20, 2026', dueStatus:'ok', marks:20,
    desc:'Write a 600-word argumentative essay on the impact of technology on modern society. Use at least 3 supporting arguments.',
    submitted: false
  },
  {
    icon:'🧪', subj:'Science',
    title:'Periodic Table Worksheet',
    due:'Mar 12, 2026', dueStatus:'overdue', marks:8,
    desc:'Complete the periodic table worksheet. Fill in missing elements, atomic numbers, group names, and electronic configurations.',
    submitted: true
  },
];

const QUIZZES = [
  { icon:'📐', title:'Derivatives Practice #4', subj:'Mathematics', q:5,  resp:29, avg:76, time:'2m 14s' },
  { icon:'🔬', title:'Kinematics MCQ',           subj:'Physics',     q:8,  resp:30, avg:81, time:'3m 40s' },
  { icon:'📖', title:'Grammar & Tenses',         subj:'English',     q:6,  resp:28, avg:69, time:'2m 55s' },
  { icon:'🧪', title:'Periodic Table Quiz',      subj:'Science',     q:10, resp:27, avg:73, time:'4m 10s' },
  { icon:'📐', title:'Integration Basics',       subj:'Mathematics', q:5,  resp:30, avg:84, time:'1m 58s' },
  { icon:'🔬', title:"Newton's Laws MCQ",        subj:'Physics',     q:7,  resp:29, avg:77, time:'3m 20s' },
];

const STUDENT_QUIZ_RESULTS = [
  { icon:'📐', name:'Derivatives Practice #4', subj:'Mathematics', date:'Mar 10', score:8,  total:10, grade:'A'  },
  { icon:'🔬', name:'Kinematics MCQ',          subj:'Physics',     date:'Mar 8',  score:14, total:20, grade:'B+' },
  { icon:'📖', name:'Grammar & Tenses',        subj:'English',     date:'Mar 6',  score:9,  total:10, grade:'A'  },
  { icon:'🧪', name:'Periodic Table Quiz',     subj:'Science',     date:'Mar 4',  score:11, total:15, grade:'B'  },
  { icon:'📐', name:'Integration Basics',      subj:'Mathematics', date:'Mar 1',  score:7,  total:10, grade:'B+' },
];

const QUIZ_QUESTIONS = [
  {
    q: 'What is the derivative of f(x) = x³?',
    opts: ['3x²', 'x²', '3x', 'x³ + C'],
    ans: 0, time: 30
  },
  {
    q: "Which of these is the Product Rule?",
    opts: ["(uv)' = u'v + uv'", "(uv)' = u'v'", "(u/v)' = (u'v - uv')/v²", "(uv)' = u' + v'"],
    ans: 0, time: 25
  },
  {
    q: 'What is the integral of sin(x) dx?',
    opts: ['cos(x) + C', '-cos(x) + C', 'sin(x) + C', '-sin(x) + C'],
    ans: 1, time: 30
  },
];

const COLORS = [
  '#3b82f6','#06d6a0','#f59e0b','#f43f5e','#a78bfa',
  '#ec4899','#14b8a6','#f97316','#84cc16','#06b6d4'
];

/* Helpers */
function getInitials(name) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}
function getColor(index) {
  return COLORS[index % COLORS.length];
}
function getNow() {
  const d = new Date();
  return d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0');
}
