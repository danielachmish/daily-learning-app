-- learning_progress: one row per user per completed lesson
create table learning_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  lesson_id uuid not null references lessons(id) on delete cascade,
  lesson_date date not null,
  completed_at timestamptz not null default now(),
  unique(user_id, lesson_id)
);

create index learning_progress_user_id_idx on learning_progress(user_id);
create index learning_progress_lesson_date_idx on learning_progress(lesson_date);
create index learning_progress_user_date_idx on learning_progress(user_id, lesson_date);
create index learning_progress_lesson_id_idx on learning_progress(lesson_id);
