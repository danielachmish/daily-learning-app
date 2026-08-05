-- Atomic "complete lesson" flow (docs/02_Database.md §17, docs/04_ClaudeRules.md §15).
-- Safe against double-clicks and true concurrent requests: the unique
-- constraint on learning_progress(user_id, lesson_id) combined with
-- `on conflict do nothing` means only one concurrent call can ever actually
-- insert; PL/pgSQL's FOUND flag tells us whether this call was the one.
create or replace function public.complete_lesson(p_lesson_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile profiles%rowtype;
  v_lesson lessons%rowtype;
  v_prev_max_date date;
  v_new_streak int;
  v_new_best_streak int;
  v_new_total int;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if not public.has_active_access(v_user_id) then
    raise exception 'No active access';
  end if;

  select * into v_profile from profiles where id = v_user_id;
  if v_profile is null then
    raise exception 'Profile not found';
  end if;

  select * into v_lesson from lessons where id = p_lesson_id;
  if v_lesson is null then
    raise exception 'Lesson not found';
  end if;

  if v_lesson.status <> 'published' then
    raise exception 'Lesson is not published';
  end if;

  if v_lesson.gender_track <> v_profile.gender_track or v_lesson.language <> v_profile.language then
    raise exception 'Lesson does not match user profile';
  end if;

  insert into learning_progress (user_id, lesson_id, lesson_date)
  values (v_user_id, p_lesson_id, v_lesson.lesson_date)
  on conflict (user_id, lesson_id) do nothing;

  if not found then
    return jsonb_build_object('status', 'already_completed');
  end if;

  -- Streak: continues only if the last completed date (excluding the row we
  -- just inserted) is exactly one day before this lesson's date. A gap
  -- resets to 1; backfilling an earlier date leaves the current streak as-is.
  select max(lesson_date) into v_prev_max_date
  from learning_progress
  where user_id = v_user_id and lesson_id <> p_lesson_id;

  if v_prev_max_date is null then
    v_new_streak := 1;
  elsif v_lesson.lesson_date = v_prev_max_date + 1 then
    v_new_streak := v_profile.current_streak + 1;
  elsif v_lesson.lesson_date > v_prev_max_date + 1 then
    v_new_streak := 1;
  else
    v_new_streak := v_profile.current_streak;
  end if;

  v_new_best_streak := greatest(v_profile.best_streak, v_new_streak);
  v_new_total := v_profile.total_completed_days + 1;

  update profiles
  set
    current_streak = v_new_streak,
    best_streak = v_new_best_streak,
    total_completed_days = v_new_total,
    updated_at = now()
  where id = v_user_id;

  insert into daily_lesson_stats (lesson_date, gender_track, language, completed_count)
  values (v_lesson.lesson_date, v_lesson.gender_track, v_lesson.language, 1)
  on conflict (lesson_date, gender_track, language)
  do update set completed_count = daily_lesson_stats.completed_count + 1, updated_at = now();

  return jsonb_build_object(
    'status', 'completed',
    'current_streak', v_new_streak,
    'best_streak', v_new_best_streak,
    'total_completed_days', v_new_total
  );
end;
$$;

grant execute on function public.complete_lesson(uuid) to authenticated;
