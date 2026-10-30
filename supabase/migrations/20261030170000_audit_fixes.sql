-- Fixes from the 2026-10-30 audit.
--  1. Deleted badges stay deleted: the class remembers them here, and join_badge turns them
--     away, so a removed student's old card can't bring the badge back.
--  2. The class board counts each badge on its own, so two kids who drew the same rider name
--     no longer share one row.

create table if not exists public.class_retired_badges (
  class_code text not null references public.classes (code) on delete cascade on update cascade,
  badge smallint not null check (badge between 1 and 99),
  primary key (class_code, badge)
);

alter table public.class_retired_badges enable row level security;
revoke all on public.class_retired_badges from anon, authenticated;

create or replace function public.teacher_remove_rider(p_code text, p_key text, p_rider uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  b smallint;
begin
  if not teacher_ok(p_code, p_key) then
    return false;
  end if;
  select badge into b from class_riders where id = p_rider and class_code = upper(p_code);
  if b is not null then
    insert into class_retired_badges (class_code, badge) values (upper(p_code), b) on conflict do nothing;
  end if;
  delete from class_races where rider_id = p_rider and class_code = upper(p_code);
  delete from class_riders where id = p_rider and class_code = upper(p_code);
  return found;
end;
$$;

-- Same as before (20261030100000_badge_words.sql), plus: a deleted badge answers 'removed'.
create or replace function public.join_badge(p_code text, p_badge int, p_word int, p_rider_key text, p_name text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  c text := upper(p_code);
  th text;
  hsh text := encode(sha256(convert_to(coalesce(p_rider_key, ''), 'UTF8')), 'hex');
  r class_riders;
  t badge_tries;
begin
  select teacher_hash into th from classes where code = c;
  if th is null then
    return 'none';
  end if;
  if length(coalesce(p_rider_key, '')) < 16 or p_badge is null or p_badge not between 1 and 99 then
    raise exception 'A badge is a number from 1 to 99.';
  end if;
  if exists (select 1 from class_retired_badges where class_code = c and badge = p_badge) then
    return 'removed';
  end if;
  select * into r from class_riders where class_code = c and badge = p_badge;
  if found and hsh = any (r.key_hashes) then
    update class_riders set name = p_name, last_seen = now() where id = r.id;
    update classes set used_at = now() where code = c;
    return 'ok';
  end if;
  if p_word is null then
    return 'removed';
  end if;
  select * into t from badge_tries where class_code = c and badge = p_badge;
  if found and t.fail_at < now() - interval '15 minutes' then
    delete from badge_tries where class_code = c and badge = p_badge;
    t := null;
  end if;
  if t.fails >= 5 then
    return 'locked';
  end if;
  if p_word <> badge_word_index(th, p_badge) then
    insert into badge_tries (class_code, badge, fails, fail_at) values (c, p_badge, 1, now())
    on conflict (class_code, badge) do update set fails = badge_tries.fails + 1, fail_at = now();
    return 'wrong';
  end if;
  delete from badge_tries where class_code = c and badge = p_badge;
  insert into class_riders (class_code, badge, key_hashes, name) values (c, p_badge, array[hsh], p_name)
  on conflict (class_code, badge) do update
  set key_hashes = (array[hsh] || array_remove(class_riders.key_hashes, hsh))[1:6], name = excluded.name, last_seen = now();
  update classes set used_at = now() where code = c;
  return 'ok';
end;
$$;

revoke all on function public.join_badge(text, int, int, text, text) from public;
grant execute on function public.join_badge(text, int, int, text, text) to anon, authenticated;

-- One row per badge (older races without a badge still go by name), showing its latest name.
create or replace function public.class_board(p_code text)
returns table (rider text, best_wpm real, best_accuracy real, races int, wins int, touch boolean)
language sql
security definer
set search_path = public
stable
as $$
  select (array_agg(r.rider order by r.created_at desc))[1] as rider,
    max(r.wpm) as best_wpm,
    max(r.accuracy) as best_accuracy,
    count(*)::int as races,
    (count(*) filter (where r.place = 1 and r.racers > 1))::int as wins,
    (array_agg(r.touch order by r.wpm desc))[1] as touch
  from class_races r
  where r.class_code = upper(p_code)
  group by coalesce(r.rider_id::text, r.rider)
  order by best_wpm desc
  limit 40;
$$;
