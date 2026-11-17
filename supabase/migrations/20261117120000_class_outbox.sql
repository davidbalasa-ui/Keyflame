-- Class results that never get lost, and placement checks the teacher can see.
--
-- A device now keeps each finished lesson or race in a small outbox until the class has it,
-- so a lost Wi-Fi connection no longer drops results. Each result carries a random id made on
-- the device: sending it twice (a retry after a timeout) stores it once. It also carries the
-- time it was played, so a result sent the next morning still lands on the right day.
--
-- A placement check (the one-minute typing check that skips lessons) is now sent as its own
-- kind, 'placement', with the last lesson it opened. It never counts as a passed lesson.

alter table public.class_activity add column if not exists activity_id uuid;
-- When the server got it. The flood brake looks at this, not at when it was played.
alter table public.class_activity add column if not exists received_at timestamptz not null default now();
create unique index if not exists class_activity_activity_id_idx on public.class_activity (activity_id) where activity_id is not null;

alter table public.class_activity drop constraint if exists class_activity_kind_check;
alter table public.class_activity add constraint class_activity_kind_check check (kind in ('lesson', 'race', 'class', 'placement'));

-- One finished lesson, race or placement check by a badge in a class. A class race also goes
-- on the board. 'ok' (stored, or already stored), 'none' (no such class), 'removed' (this
-- device no longer rides as the badge) or 'slow' (a light brake on floods).
create or replace function public.post_class_activity(
  p_code text, p_badge int, p_rider_key text, p_name text, p_kind text, p_lesson text, p_stars int,
  p_wpm real, p_accuracy real, p_place int, p_racers int, p_touch boolean, p_id uuid, p_at timestamptz)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  rid uuid;
  played timestamptz;
begin
  if not exists (select 1 from classes where code = upper(p_code)) then
    return 'none';
  end if;
  select id into rid from class_riders
  where class_code = upper(p_code) and badge = p_badge
    and encode(sha256(convert_to(coalesce(p_rider_key, ''), 'UTF8')), 'hex') = any (key_hashes);
  if rid is null then
    return 'removed';
  end if;
  if p_id is not null and exists (select 1 from class_activity where activity_id = p_id) then
    return 'ok';
  end if;
  if exists (select 1 from class_activity where rider_id = rid and received_at > now() - interval '3 seconds') then
    return 'slow';
  end if;
  -- Played when the device says, but never in the future and never more than two weeks back.
  played := least(now(), greatest(coalesce(p_at, now()), now() - interval '14 days'));
  begin
    insert into class_activity (rider_id, kind, lesson, stars, wpm, accuracy, place, racers, touch, activity_id, created_at)
    values (rid, p_kind, p_lesson, p_stars,
      case when p_wpm is null then null else round(p_wpm::numeric, 1) end,
      round(p_accuracy::numeric, 3), p_place, p_racers, p_touch, p_id, played);
  exception when unique_violation then
    return 'ok';
  end;
  if p_kind = 'class' and p_place is not null and p_racers is not null and p_wpm is not null then
    insert into class_races (class_code, rider, wpm, accuracy, place, racers, touch, rider_id, created_at)
    values (upper(p_code), p_name, round(p_wpm::numeric, 1), round(p_accuracy::numeric, 3), p_place, p_racers, p_touch, rid, played);
  end if;
  update class_riders set name = p_name, last_seen = greatest(last_seen, played) where id = rid;
  update classes set used_at = now() where code = upper(p_code);
  return 'ok';
end;
$$;

-- The old call, still used by pages opened before this change, without an id or time.
create or replace function public.post_class_activity(
  p_code text, p_badge int, p_rider_key text, p_name text, p_kind text, p_lesson text, p_stars int,
  p_wpm real, p_accuracy real, p_place int, p_racers int, p_touch boolean)
returns text
language sql
security definer
set search_path = public
as $$
  select public.post_class_activity(p_code, p_badge, p_rider_key, p_name, p_kind, p_lesson, p_stars,
    p_wpm, p_accuracy, p_place, p_racers, p_touch, null::uuid, null::timestamptz);
$$;

-- Every rider in the class with their totals and how their speed is moving.
-- recent_wpm is the average of the last five timed sessions, prev_wpm of the five before,
-- both typed the same way (keyboard or touch screen) as the rider's latest timed session, so
-- switching between a phone and a keyboard doesn't look like a jump or a drop.
-- placed is the last lesson a placement check opened, if any.
drop function if exists public.teacher_riders(text, text);
create function public.teacher_riders(p_code text, p_key text)
returns table (
  id uuid, badge int, name text, joined_at timestamptz, last_seen timestamptz,
  lessons_passed int, lessons int, races int, class_races int, wins int,
  best_wpm real, recent_wpm real, prev_wpm real, recent_accuracy real, touch boolean, active_days int, placed text)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not teacher_ok(p_code, p_key) then
    raise exception 'Not this class''s teacher.';
  end if;
  return query
  with everything as (
    select x.* from class_activity x join class_riders r on r.id = x.rider_id
    where r.class_code = upper(p_code)
  ),
  timed as (
    select e.* from everything e where e.wpm is not null and e.kind <> 'placement'
  ),
  latest as (
    select distinct on (t.rider_id) t.rider_id, t.touch from timed t order by t.rider_id, t.created_at desc
  ),
  a as (
    select t.*, row_number() over (partition by t.rider_id order by t.created_at desc) as n
    from timed t join latest l on l.rider_id = t.rider_id and l.touch = t.touch
  )
  select r.id, r.badge::int, r.name, r.joined_at,
    greatest(r.last_seen, coalesce((select max(e.created_at) from everything e where e.rider_id = r.id), r.last_seen)),
    (select count(distinct e.lesson) from everything e where e.rider_id = r.id and e.kind = 'lesson' and e.stars >= 1)::int,
    (select count(*) from everything e where e.rider_id = r.id and e.kind = 'lesson')::int,
    (select count(*) from everything e where e.rider_id = r.id and e.kind in ('race', 'class'))::int,
    (select count(*) from everything e where e.rider_id = r.id and e.kind = 'class')::int,
    (select count(*) from everything e where e.rider_id = r.id and e.kind = 'class' and e.place = 1 and e.racers > 1)::int,
    (select max(t.wpm) from timed t where t.rider_id = r.id),
    (select avg(t.wpm) from a t where t.rider_id = r.id and t.n <= 5)::real,
    (select avg(t.wpm) from a t where t.rider_id = r.id and t.n between 6 and 10)::real,
    (select avg(e.accuracy) from (select e2.accuracy from everything e2 where e2.rider_id = r.id and e2.kind <> 'placement' order by e2.created_at desc limit 5) e)::real,
    (select e.touch from everything e where e.rider_id = r.id order by e.created_at desc limit 1),
    (select count(distinct (e.created_at at time zone 'UTC')::date) from everything e where e.rider_id = r.id)::int,
    (select e.lesson from everything e where e.rider_id = r.id and e.kind = 'placement' and e.lesson is not null order by e.created_at desc limit 1)
  from class_riders r
  where r.class_code = upper(p_code)
  order by r.badge;
end;
$$;

revoke all on function public.post_class_activity(text, int, text, text, text, text, int, real, real, int, int, boolean, uuid, timestamptz) from public;
revoke all on function public.post_class_activity(text, int, text, text, text, text, int, real, real, int, int, boolean) from public;
revoke all on function public.teacher_riders(text, text) from public;
grant execute on function public.post_class_activity(text, int, text, text, text, text, int, real, real, int, int, boolean, uuid, timestamptz) to anon, authenticated;
grant execute on function public.post_class_activity(text, int, text, text, text, text, int, real, real, int, int, boolean) to anon, authenticated;
grant execute on function public.teacher_riders(text, text) to anon, authenticated;
