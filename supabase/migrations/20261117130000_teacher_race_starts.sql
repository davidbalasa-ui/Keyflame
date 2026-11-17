-- Only the teacher's device can pull the whole class into a race (Astra review KF-06).
--
-- A "race everyone" start is broadcast over Realtime, which anyone with the class code could
-- imitate. Now the teacher's device first records the race here with its teacher key, and a
-- kid's device that wasn't already waiting to race checks the race id here before it joins.
-- Kids who tapped Race themselves still race each other without the server, as before.

create table if not exists public.class_race_starts (
  class_code text not null,
  race_id text not null,
  racers text[] not null default '{}',
  created_at timestamptz not null default now(),
  primary key (class_code, race_id)
);
alter table public.class_race_starts enable row level security;
-- No policies: only the functions below touch this table.

-- The teacher records a race start. Old starts are swept away as new ones come in.
create or replace function public.start_class_race(p_code text, p_key text, p_race_id text, p_racers text[])
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.teacher_ok(p_code, p_key) then
    return false;
  end if;
  if p_race_id is null or length(p_race_id) > 64 or coalesce(array_length(p_racers, 1), 0) > 200 then
    return false;
  end if;
  delete from class_race_starts where created_at < now() - interval '1 day';
  insert into class_race_starts (class_code, race_id, racers)
  values (upper(p_code), p_race_id, coalesce(p_racers, '{}'))
  on conflict (class_code, race_id) do nothing;
  return true;
end;
$$;

-- A kid's device asks: did the teacher really start this race, in the last two minutes, with me in it?
create or replace function public.class_race_ok(p_code text, p_race_id text, p_member text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from class_race_starts
    where class_code = upper(p_code) and race_id = p_race_id
      and created_at > now() - interval '2 minutes'
      and p_member = any (racers)
  );
$$;

revoke all on function public.start_class_race(text, text, text, text[]) from public;
revoke all on function public.class_race_ok(text, text, text) from public;
grant execute on function public.start_class_race(text, text, text, text[]) to anon, authenticated;
grant execute on function public.class_race_ok(text, text, text) to anon, authenticated;
