-- lessons: one daily lesson per (date, gender_track, language)
create table lessons (
  id uuid primary key default gen_random_uuid(),
  lesson_date date not null,
  hebrew_date text,
  title text not null,
  gender_track text not null check (gender_track in ('men', 'women')),
  language text not null check (language in ('he', 'en')),
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lesson_date, gender_track, language)
);

create index lessons_date_idx on lessons(lesson_date);
create index lessons_status_idx on lessons(status);
create index lessons_track_lang_date_idx on lessons(gender_track, language, lesson_date);
create index lessons_published_lookup_idx on lessons(lesson_date, gender_track, language, status);
