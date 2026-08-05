-- Storage bucket for lesson images. Public read (mobile users need to view
-- images directly by URL); writes restricted to admins.
insert into storage.buckets (id, name, public)
values ('lesson-images', 'lesson-images', true)
on conflict (id) do nothing;

create policy "lesson_images_storage_public_read"
  on storage.objects for select
  using (bucket_id = 'lesson-images');

create policy "lesson_images_storage_admin_insert"
  on storage.objects for insert
  with check (bucket_id = 'lesson-images' and public.is_admin());

create policy "lesson_images_storage_admin_update"
  on storage.objects for update
  using (bucket_id = 'lesson-images' and public.is_admin());

create policy "lesson_images_storage_admin_delete"
  on storage.objects for delete
  using (bucket_id = 'lesson-images' and public.is_admin());
