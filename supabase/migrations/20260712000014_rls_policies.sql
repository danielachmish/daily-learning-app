-- profiles: user reads/updates own row; admin reads/updates all
create policy profiles_select_own on profiles
  for select using (id = auth.uid() or public.is_admin());

create policy profiles_update_own on profiles
  for update using (id = auth.uid() or public.is_admin());

create policy profiles_insert_own on profiles
  for insert with check (id = auth.uid());

-- subscriptions: user reads own; admin reads/writes all; no direct user writes
create policy subscriptions_select_own on subscriptions
  for select using (user_id = auth.uid() or public.is_admin());

create policy subscriptions_admin_all on subscriptions
  for all using (public.is_admin()) with check (public.is_admin());

-- lessons: admin full CRUD; user reads only published lessons matching their
-- own gender_track/language, and only if they currently have active access
create policy lessons_admin_all on lessons
  for all using (public.is_admin()) with check (public.is_admin());

create policy lessons_select_for_user on lessons
  for select using (
    status = 'published'
    and public.has_active_access(auth.uid())
    and exists (
      select 1 from profiles p
      where p.id = auth.uid()
      and p.gender_track = lessons.gender_track
      and p.language = lessons.language
    )
  );

-- lesson_images: same visibility rule as their parent lesson; admin full CRUD
create policy lesson_images_admin_all on lesson_images
  for all using (public.is_admin()) with check (public.is_admin());

create policy lesson_images_select_for_user on lesson_images
  for select using (
    exists (
      select 1 from lessons l
      join profiles p on p.id = auth.uid()
      where l.id = lesson_images.lesson_id
      and l.status = 'published'
      and l.gender_track = p.gender_track
      and l.language = p.language
      and public.has_active_access(auth.uid())
    )
  );

-- learning_progress: user reads/creates only their own rows; no update/delete
-- for regular users; admin reads all
create policy learning_progress_select_own on learning_progress
  for select using (user_id = auth.uid() or public.is_admin());

create policy learning_progress_insert_own on learning_progress
  for insert with check (user_id = auth.uid());

create policy learning_progress_admin_all on learning_progress
  for all using (public.is_admin()) with check (public.is_admin());

-- dedications: user creates/reads own; anyone with access can read paid+approved
-- dedications for a given date; admin full CRUD
create policy dedications_select_own on dedications
  for select using (user_id = auth.uid() or public.is_admin());

create policy dedications_select_public on dedications
  for select using (
    payment_status = 'paid'
    and approval_status = 'approved'
  );

create policy dedications_insert_own on dedications
  for insert with check (user_id = auth.uid());

create policy dedications_admin_all on dedications
  for all using (public.is_admin()) with check (public.is_admin());

-- settings: anyone authenticated can read public settings; only admin can write
create policy settings_select_all on settings
  for select using (auth.uid() is not null);

create policy settings_admin_write on settings
  for all using (public.is_admin()) with check (public.is_admin());

-- notification_settings: user manages only their own row; admin reads all
create policy notification_settings_own on notification_settings
  for all using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

-- daily_lesson_stats / daily_revenue_stats: read-only for authenticated users,
-- written only by admin/server-side (Edge Functions using the service role
-- bypass RLS entirely, so no separate write policy is needed here)
create policy daily_lesson_stats_select_all on daily_lesson_stats
  for select using (auth.uid() is not null);

create policy daily_lesson_stats_admin_write on daily_lesson_stats
  for all using (public.is_admin()) with check (public.is_admin());

create policy daily_revenue_stats_admin_all on daily_revenue_stats
  for all using (public.is_admin()) with check (public.is_admin());

-- payments: user reads own; admin reads all; writes are done via Edge
-- Functions using the service role, which bypasses RLS entirely
create policy payments_select_own on payments
  for select using (user_id = auth.uid() or public.is_admin());

create policy payments_admin_all on payments
  for all using (public.is_admin()) with check (public.is_admin());
