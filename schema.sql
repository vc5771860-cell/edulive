-- ================================================================
-- EduLive — Supabase Database Schema
-- Run this entire file in Supabase → SQL Editor → New Query
-- ================================================================

-- ── 1. PROFILES TABLE ──────────────────────────────────────────
-- Stores extra info for each student (linked to Supabase Auth)
create table public.profiles (
  id            uuid references auth.users on delete cascade primary key,
  student_id    text unique not null,        -- e.g. STU-2025-001
  full_name     text not null,
  role          text not null default 'student',  -- 'student' | 'teacher'
  subjects      text[] default '{}',         -- e.g. ['Math','Physics']
  batch         text default '2025-26',
  enrolled_at   timestamp with time zone default now(),
  created_at    timestamp with time zone default now()
);

-- Auto-create profile row when a new auth user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, student_id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'student_id', 'STU-0000'),
    coalesce(new.raw_user_meta_data->>'full_name',  'New Student'),
    coalesce(new.raw_user_meta_data->>'role',       'student')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ── 2. CLASSES TABLE ───────────────────────────────────────────
create table public.classes (
  id          uuid default gen_random_uuid() primary key,
  title       text not null,
  subject     text not null,
  scheduled_at timestamp with time zone not null,
  duration_mins integer default 60,
  room_code   text unique,                   -- e.g. MATH-4X9K
  status      text default 'scheduled',      -- 'scheduled' | 'live' | 'ended'
  teacher_id  uuid references public.profiles(id),
  created_at  timestamp with time zone default now()
);


-- ── 3. ATTENDANCE TABLE ────────────────────────────────────────
create table public.attendance (
  id          uuid default gen_random_uuid() primary key,
  class_id    uuid references public.classes(id) on delete cascade,
  student_id  uuid references public.profiles(id) on delete cascade,
  status      text default 'present',        -- 'present' | 'absent' | 'late'
  joined_at   timestamp with time zone default now(),
  unique(class_id, student_id)               -- one record per student per class
);


-- ── 4. QUIZZES TABLE ───────────────────────────────────────────
create table public.quizzes (
  id           uuid default gen_random_uuid() primary key,
  title        text not null,
  subject      text not null,
  class_id     uuid references public.classes(id) on delete set null,
  teacher_id   uuid references public.profiles(id),
  questions    jsonb not null default '[]',  -- array of question objects
  timer_secs   integer default 30,
  status       text default 'draft',         -- 'draft' | 'live' | 'ended'
  created_at   timestamp with time zone default now()
);

-- Questions jsonb structure (for reference):
-- [
--   {
--     "q": "What is the derivative of x³?",
--     "opts": ["3x²", "x²", "3x", "x³+C"],
--     "ans": 0,
--     "time": 30
--   }
-- ]


-- ── 5. QUIZ RESPONSES TABLE ────────────────────────────────────
create table public.quiz_responses (
  id          uuid default gen_random_uuid() primary key,
  quiz_id     uuid references public.quizzes(id) on delete cascade,
  student_id  uuid references public.profiles(id) on delete cascade,
  answers     jsonb not null default '[]',   -- [{ q_idx: 0, chosen: 2, correct: false }]
  score       integer default 0,
  total       integer default 0,
  submitted_at timestamp with time zone default now(),
  unique(quiz_id, student_id)
);


-- ── 6. ASSIGNMENTS TABLE ───────────────────────────────────────
create table public.assignments (
  id          uuid default gen_random_uuid() primary key,
  title       text not null,
  subject     text not null,
  description text,
  due_at      timestamp with time zone not null,
  max_marks   integer default 10,
  teacher_id  uuid references public.profiles(id),
  class_id    uuid references public.classes(id) on delete set null,
  created_at  timestamp with time zone default now()
);


-- ── 7. SUBMISSIONS TABLE ───────────────────────────────────────
create table public.submissions (
  id              uuid default gen_random_uuid() primary key,
  assignment_id   uuid references public.assignments(id) on delete cascade,
  student_id      uuid references public.profiles(id) on delete cascade,
  notes           text,
  file_url        text,                      -- Supabase Storage URL
  marks_obtained  integer,                   -- filled by teacher after grading
  feedback        text,                      -- teacher feedback
  submitted_at    timestamp with time zone default now(),
  graded_at       timestamp with time zone,
  unique(assignment_id, student_id)
);


-- ── ROW LEVEL SECURITY (RLS) ───────────────────────────────────
-- Protects data so students can only see their own records

alter table public.profiles        enable row level security;
alter table public.classes         enable row level security;
alter table public.attendance      enable row level security;
alter table public.quizzes         enable row level security;
alter table public.quiz_responses  enable row level security;
alter table public.assignments     enable row level security;
alter table public.submissions     enable row level security;

-- Profiles: users can read all profiles, but only update their own
create policy "Profiles are viewable by authenticated users"
  on public.profiles for select using (auth.role() = 'authenticated');

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Classes: everyone authenticated can read
create policy "Classes viewable by authenticated users"
  on public.classes for select using (auth.role() = 'authenticated');

create policy "Only teachers can create classes"
  on public.classes for insert with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher')
  );

create policy "Only teachers can update classes"
  on public.classes for update using (teacher_id = auth.uid());

-- Attendance: students see their own, teachers see all
create policy "Students see own attendance"
  on public.attendance for select using (
    student_id = auth.uid() or
    exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher')
  );

create policy "Teachers manage attendance"
  on public.attendance for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher')
  );

create policy "Students can insert own attendance"
  on public.attendance for insert with check (student_id = auth.uid());

-- Quizzes: everyone can read, only teachers create
create policy "Quizzes viewable by authenticated users"
  on public.quizzes for select using (auth.role() = 'authenticated');

create policy "Only teachers can manage quizzes"
  on public.quizzes for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher')
  );

-- Quiz responses: students see own, teachers see all
create policy "Students see own quiz responses"
  on public.quiz_responses for select using (
    student_id = auth.uid() or
    exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher')
  );

create policy "Students submit own responses"
  on public.quiz_responses for insert with check (student_id = auth.uid());

-- Assignments: everyone can read
create policy "Assignments viewable by authenticated users"
  on public.assignments for select using (auth.role() = 'authenticated');

create policy "Only teachers manage assignments"
  on public.assignments for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher')
  );

-- Submissions: students see own, teachers see all
create policy "Students see own submissions"
  on public.submissions for select using (
    student_id = auth.uid() or
    exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher')
  );

create policy "Students submit own work"
  on public.submissions for insert with check (student_id = auth.uid());

create policy "Teachers can grade submissions"
  on public.submissions for update using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher')
  );


-- ── USEFUL VIEWS ───────────────────────────────────────────────

-- Attendance summary per student (handy for the dashboard)
create or replace view public.attendance_summary as
select
  p.id as student_id,
  p.full_name,
  p.student_id as student_code,
  count(a.id) filter (where a.status = 'present') as present_count,
  count(c.id) as total_classes,
  round(
    count(a.id) filter (where a.status = 'present')::numeric /
    nullif(count(c.id), 0) * 100
  ) as attendance_pct
from public.profiles p
cross join public.classes c
left join public.attendance a on a.student_id = p.id and a.class_id = c.id
where p.role = 'student'
group by p.id, p.full_name, p.student_id;

-- Quiz leaderboard view
create or replace view public.quiz_leaderboard as
select
  p.full_name,
  p.student_id as student_code,
  q.title as quiz_title,
  qr.score,
  qr.total,
  round(qr.score::numeric / nullif(qr.total,0) * 100) as pct,
  qr.submitted_at
from public.quiz_responses qr
join public.profiles p on p.id = qr.student_id
join public.quizzes q on q.id = qr.quiz_id
order by pct desc;
