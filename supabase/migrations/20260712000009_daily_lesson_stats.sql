-- daily_lesson_stats: precomputed counters to avoid heavy counts on read
create table daily_lesson_stats (
  id uuid primary key default gen_random_uuid(),
  lesson_date date not null,
  gender_track text not null check (gender_track in ('men', 'women')),
  language text not null check (language in ('he', 'en')),
  completed_count int not null default 0,
  dedications_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(lesson_date, gender_track, language)
);

create index daily_lesson_stats_date_idx on daily_lesson_stats(lesson_date);
create index daily_lesson_stats_lookup_idx on daily_lesson_stats(lesson_date, gender_track, language);
