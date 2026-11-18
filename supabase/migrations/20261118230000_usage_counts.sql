-- Usage counts: how many visits, new riders, players and finished races and lessons
-- Keyflame gets each day, so we can tell whether people use it. Only daily totals are kept:
-- a date, what happened, what kind of player it was and a number. No names, no ids, no
-- codes, no cookies. The game adds to a total through count_usage() and can't read it back;
-- David reads the totals in the Supabase dashboard (schema "stats").

create table if not exists public.usage_daily (
  day date not null,
  event text not null check (event in ('visit', 'new_rider', 'active', 'race', 'lesson', 'kept')),
  kind text not null check (kind in ('guest', 'saved', 'class', 'family')),
  n int not null default 0 check (n >= 0),
  primary key (day, event, kind)
);

alter table public.usage_daily enable row level security;
revoke all on public.usage_daily from anon, authenticated;

-- Adds n to one daily total. Devices that were offline send yesterday's counts later, so the
-- day may be up to a week back, never ahead. n is capped so one call can't jump a total.
create or replace function public.count_usage(p_day date, p_event text, p_kind text, p_n int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_day is null or p_day > current_date + 1 or p_day < current_date - 7 then
    return false;
  end if;
  if p_event not in ('visit', 'new_rider', 'active', 'race', 'lesson', 'kept')
     or p_kind not in ('guest', 'saved', 'class', 'family') then
    return false;
  end if;
  insert into usage_daily as u (day, event, kind, n)
  values (p_day, p_event, p_kind, least(greatest(coalesce(p_n, 1), 1), 50))
  on conflict (day, event, kind) do update set n = least(u.n + excluded.n, 10000000);
  return true;
end;
$$;

revoke all on function public.count_usage(date, text, text, int) from public;
grant execute on function public.count_usage(date, text, text, int) to anon, authenticated;

-- Classes and family wings are made the same way; remembering which is which lets the
-- totals tell class riders from family riders.
alter table public.classes add column if not exists kind text not null default 'class' check (kind in ('class', 'family'));

drop function if exists public.create_class();
create or replace function public.create_class(p_kind text default 'class')
returns table (class_code text, teacher_key text)
language plpgsql
security definer
set search_path = public
as $$
declare
  letters constant text := 'BCDFGHJKLMNPQRSTVWXZ';
  c text;
  k text := replace(gen_random_uuid()::text, '-', '');
  tries int := 0;
  w text := case when p_kind = 'family' then 'family' else 'class' end;
begin
  if (select count(*) from classes where created_at > now() - interval '1 hour') >= 200 then
    raise exception 'Too many new classes right now. Try again soon.';
  end if;
  -- Classes nobody has used for a year go away, with their boards.
  delete from classes where used_at < now() - interval '365 days';
  loop
    c := '';
    for i in 1..6 loop
      c := c || substr(letters, 1 + floor(random() * 20)::int, 1);
    end loop;
    begin
      insert into classes (code, teacher_hash, kind) values (c, encode(sha256(convert_to(k, 'UTF8')), 'hex'), w);
      exit;
    exception when unique_violation then
      tries := tries + 1;
      if tries > 8 then
        raise;
      end if;
    end;
  end loop;
  class_code := c;
  teacher_key := k;
  return next;
end;
$$;

revoke all on function public.create_class(text) from public;
grant execute on function public.create_class(text) to anon, authenticated;

-- A family wing made before kinds were stored: its grown-up's device marks it once.
create or replace function public.set_wing_kind(p_code text, p_key text, p_kind text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_kind not in ('class', 'family') then
    return false;
  end if;
  update classes set kind = p_kind
  where code = p_code and teacher_hash = encode(sha256(convert_to(coalesce(p_key, ''), 'UTF8')), 'hex');
  return found;
end;
$$;

revoke all on function public.set_wing_kind(text, text, text) from public;
grant execute on function public.set_wing_kind(text, text, text) to anon, authenticated;

-- Whether a code is a class or a family wing, so a rider's counts land in the right column.
create or replace function public.wing_kind(p_code text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select kind from classes where code = p_code;
$$;

revoke all on function public.wing_kind(text) from public;
grant execute on function public.wing_kind(text) to anon, authenticated;

-- Read-only views for David. The stats schema isn't exposed to the website's key.
create schema if not exists stats;
revoke all on schema stats from public, anon, authenticated;

-- One row per day: every total side by side, guests apart from riders with a save.
create or replace view stats.daily as
select
  day,
  sum(n) filter (where event = 'visit') as visits,
  sum(n) filter (where event = 'new_rider') as new_riders,
  sum(n) filter (where event = 'new_rider' and kind = 'guest') as new_guests,
  sum(n) filter (where event = 'kept') as guests_saved,
  sum(n) filter (where event = 'active') as players,
  sum(n) filter (where event = 'active' and kind = 'guest') as guest_players,
  sum(n) filter (where event = 'active' and kind = 'saved') as saved_players,
  sum(n) filter (where event = 'active' and kind = 'class') as class_players,
  sum(n) filter (where event = 'active' and kind = 'family') as family_players,
  sum(n) filter (where event = 'race') as races,
  sum(n) filter (where event = 'lesson') as lessons
from public.usage_daily
group by day
order by day desc;

-- The same totals by kind of player, for a closer look.
create or replace view stats.daily_by_kind as
select day, event, kind, n from public.usage_daily order by day desc, event, kind;

-- Classes and family wings, from the class tables themselves.
create or replace view stats.wings as
select
  (select count(*) from public.classes where kind = 'class') as classes,
  (select count(*) from public.classes where kind = 'family') as family_wings,
  (select count(*) from public.classes where created_at > now() - interval '7 days') as wings_made_this_week,
  (select count(*) from public.class_riders) as badges_joined,
  (select count(*) from public.class_riders where last_seen > now() - interval '7 days') as badges_active_this_week,
  (select count(*) from public.class_activity where kind = 'race' and created_at > now() - interval '7 days') as wing_races_this_week,
  (select count(*) from public.class_activity where kind = 'lesson' and created_at > now() - interval '7 days') as wing_lessons_this_week,
  (select count(*) from public.class_races where created_at > now() - interval '7 days') as class_board_races_this_week;
