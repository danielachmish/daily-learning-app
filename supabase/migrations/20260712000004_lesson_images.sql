-- lesson_images: ordered images belonging to a lesson
create table lesson_images (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references lessons(id) on delete cascade,
  image_url text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index lesson_images_lesson_id_idx on lesson_images(lesson_id);
create index lesson_images_order_idx on lesson_images(lesson_id, sort_order);
