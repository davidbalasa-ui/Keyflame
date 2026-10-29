-- Teacher dashboard: the teacher gives each kid a badge number, and kids join with the class
-- code and their badge. Their lessons and races are kept under that badge so the teacher can
-- follow progress over time, on any device. Nothing names a child: a badge is a number, and
-- the rider name shown with it is made of preset words. Each device that rides as a badge
-- holds a random key (only its sha256 is stored here), so a mistyped badge can't quietly add
-- results to a classmate. Teachers read and manage a class only with their teacher key.

create table if not exists public.class_riders (
  id uuid primary key default gen_random_uuid(),
  class_code text not null references public.classes (code) on delete cascade on update cascade,
  badge smallint not null check (badge between 1 and 99),
  -- sha256 of each device key that rides as this badge. A few, for shared and swapped devices.
  key_hashes text[] not null default '{}',
  name text not null check (name ~ '^[A-Za-z][A-Za-z ]{0,29}$'),
  joined_at timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  unique (class_code, badge)
);

create table if not exists public.class_activity (
  id bigint generated always as identity primary key,
  rider_id uuid not null references public.class_riders (id) on delete cascade,
  kind text not null check (kind in ('lesson', 'race', 'class')),
  lesson text check (lesson ~ '^L[0-9]{1,2}$'),
  stars smallint check (stars between 0 and 3),
  -- Empty for relaxed lessons, which have no clock.
  wpm real check (wpm >= 0 and wpm <= 250),
  accuracy real not null check (accuracy >= 0 and accuracy <= 1),
  place smallint check (place between 1 and 40),
  racers smallint check (racers between 1 and 40),
  touch boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists class_activity_rider_idx on public.class_activity (rider_id, created_at desc);

alter table public.class_riders enable row level security;
alter table public.class_activity enable row level security;
revoke all on public.class_riders from anon, authenticated;
revoke all on public.class_activity from anon, authenticated;

-- A new class code keeps the class: board races follow the code too.
alter table public.class_races drop constraint if exists class_races_class_code_fkey;
alter table public.class_races
  add constraint class_races_class_code_fkey foreign key (class_code) references public.classes (code) on delete cascade on update cascade;
-- Board races remember who ran them, so removing a rider clears only their own races.
alter table public.class_races add column if not exists rider_id uuid references public.class_riders (id) on delete set null;

create or replace function public.teacher_ok(p_code text, p_key text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from classes
    where code = upper(p_code) and teacher_hash = encode(sha256(convert_to(coalesce(p_key, ''), 'UTF8')), 'hex')
  );
$$;

-- A rider opens the class with a badge number.
--   ok     this device rides as the badge (a free badge is claimed)
--   none   no class has that code
--   taken  another device rides as the badge; holder is its rider name. Sending
--          p_confirm (the rider said "that's me") adds this device to the badge.
--   removed  p_confirm is null (a device checking in with the badge it remembers)
--          and the teacher removed the badge, so it is not claimed again silently.
create or replace function public.join_class_rider(p_code text, p_badge int, p_rider_key text, p_name text, p_confirm boolean)
returns table (status text, holder text)
language plpgsql
security definer
set search_path = public
as $$
declare
  c text := upper(p_code);
  hsh text := encode(sha256(convert_to(coalesce(p_rider_key, ''), 'UTF8')), 'hex');
  r class_riders;
begin
  if not exists (select 1 from classes where code = c) then
    status := 'none';
    return next;
    return;
  end if;
  if length(coalesce(p_rider_key, '')) < 16 or p_badge is null or p_badge not between 1 and 99 then
    raise exception 'A badge is a number from 1 to 99.';
  end if;
  select * into r from class_riders where class_code = c and badge = p_badge;
  if not found and p_confirm is null then
    -- A check-in from a device that remembers its badge: the teacher removed it.
    status := 'removed';
    return next;
    return;
  elsif not found then
    insert into class_riders (class_code, badge, key_hashes, name) values (c, p_badge, array[hsh], p_name);
  elsif hsh = any (r.key_hashes) then
    update class_riders set name = p_name, last_seen = now() where id = r.id;
  elsif p_confirm then
    -- Keep the newest few devices.
    update class_riders set key_hashes = (array[hsh] || r.key_hashes)[1:6], name = p_name, last_seen = now() where id = r.id;
  else
    status := 'taken';
    holder := r.name;
    return next;
    return;
  end if;
  update classes set used_at = now() where code = c;
  status := 'ok';
  return next;
end;
$$;

-- One finished lesson or race by a badge in a class. A class race also goes on the board.
-- 'ok', 'none' (no such class), 'removed' (this device no longer rides as the badge)
-- or 'slow' (a light brake on floods).
create or replace function public.post_class_activity(
  p_code text, p_badge int, p_rider_key text, p_name text, p_kind text, p_lesson text, p_stars int,
  p_wpm real, p_accuracy real, p_place int, p_racers int, p_touch boolean)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  rid uuid;
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
  if exists (select 1 from class_activity where rider_id = rid and created_at > now() - interval '3 seconds') then
    return 'slow';
  end if;
  insert into class_activity (rider_id, kind, lesson, stars, wpm, accuracy, place, racers, touch)
  values (rid, p_kind, p_lesson, p_stars,
    case when p_wpm is null then null else round(p_wpm::numeric, 1) end,
    round(p_accuracy::numeric, 3), p_place, p_racers, p_touch);
  if p_kind = 'class' and p_place is not null and p_racers is not null and p_wpm is not null then
    insert into class_races (class_code, rider, wpm, accuracy, place, racers, touch, rider_id)
    values (upper(p_code), p_name, round(p_wpm::numeric, 1), round(p_accuracy::numeric, 3), p_place, p_racers, p_touch, rid);
  end if;
  update class_riders set name = p_name, last_seen = now() where id = rid;
  update classes set used_at = now() where code = upper(p_code);
  return 'ok';
end;
$$;

-- Every rider in the class with their totals and how their speed is moving.
-- recent_wpm is the average of the last five timed sessions, prev_wpm of the five before.
create or replace function public.teacher_riders(p_code text, p_key text)
returns table (
  id uuid, badge int, name text, joined_at timestamptz, last_seen timestamptz,
  lessons_passed int, lessons int, races int, class_races int, wins int,
  best_wpm real, recent_wpm real, prev_wpm real, recent_accuracy real, touch boolean, active_days int)
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
  with a as (
    select x.*, row_number() over (partition by x.rider_id order by x.created_at desc) as n
    from class_activity x join class_riders r on r.id = x.rider_id
    where r.class_code = upper(p_code) and x.wpm is not null
  ),
  everything as (
    select x.* from class_activity x join class_riders r on r.id = x.rider_id
    where r.class_code = upper(p_code)
  )
  select r.id, r.badge::int, r.name, r.joined_at,
    greatest(r.last_seen, coalesce((select max(e.created_at) from everything e where e.rider_id = r.id), r.last_seen)),
    (select count(distinct e.lesson) from everything e where e.rider_id = r.id and e.kind = 'lesson' and e.stars >= 1)::int,
    (select count(*) from everything e where e.rider_id = r.id and e.kind = 'lesson')::int,
    (select count(*) from everything e where e.rider_id = r.id and e.kind <> 'lesson')::int,
    (select count(*) from everything e where e.rider_id = r.id and e.kind = 'class')::int,
    (select count(*) from everything e where e.rider_id = r.id and e.kind = 'class' and e.place = 1 and e.racers > 1)::int,
    (select max(t.wpm) from a t where t.rider_id = r.id),
    (select avg(t.wpm) from a t where t.rider_id = r.id and t.n <= 5)::real,
    (select avg(t.wpm) from a t where t.rider_id = r.id and t.n between 6 and 10)::real,
    (select avg(e.accuracy) from (select e2.accuracy from everything e2 where e2.rider_id = r.id order by e2.created_at desc limit 5) e)::real,
    (select e.touch from everything e where e.rider_id = r.id order by e.created_at desc limit 1),
    (select count(distinct (e.created_at at time zone 'UTC')::date) from everything e where e.rider_id = r.id)::int
  from class_riders r
  where r.class_code = upper(p_code)
  order by r.badge;
end;
$$;

-- One rider's lessons and races, newest first.
create or replace function public.teacher_rider_activity(p_code text, p_key text, p_rider uuid)
returns table (kind text, lesson text, stars int, wpm real, accuracy real, place int, racers int, touch boolean, created_at timestamptz)
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
  select x.kind, x.lesson, x.stars::int, x.wpm, x.accuracy, x.place::int, x.racers::int, x.touch, x.created_at
  from class_activity x join class_riders r on r.id = x.rider_id
  where r.id = p_rider and r.class_code = upper(p_code)
  order by x.created_at desc
  limit 300;
end;
$$;

-- The whole class week by week (weeks start on Monday, UTC), the last twelve weeks.
create or replace function public.teacher_weeks(p_code text, p_key text)
returns table (week date, riders int, sessions int, avg_wpm real, avg_accuracy real)
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
  select date_trunc('week', x.created_at at time zone 'UTC')::date as wk,
    count(distinct x.rider_id)::int,
    count(*)::int,
    avg(x.wpm)::real,
    avg(x.accuracy)::real
  from class_activity x join class_riders r on r.id = x.rider_id
  where r.class_code = upper(p_code) and x.created_at > now() - interval '84 days'
  group by wk
  order by wk;
end;
$$;

-- Takes a badge out of the class and deletes its lessons and races here. The badge is
-- free again; devices that rode as it leave the class next time they check in.
create or replace function public.teacher_remove_rider(p_code text, p_key text, p_rider uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not teacher_ok(p_code, p_key) then
    return false;
  end if;
  delete from class_races where rider_id = p_rider and class_code = upper(p_code);
  delete from class_riders where id = p_rider and class_code = upper(p_code);
  return found;
end;
$$;

-- Gives the class a new code. Everything stays; the old code stops working.
create or replace function public.teacher_new_code(p_code text, p_key text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  letters constant text := 'BCDFGHJKLMNPQRSTVWXZ';
  c text;
  tries int := 0;
begin
  if not teacher_ok(p_code, p_key) then
    return null;
  end if;
  loop
    c := '';
    for i in 1..6 loop
      c := c || substr(letters, 1 + floor(random() * 20)::int, 1);
    end loop;
    begin
      update classes set code = c, used_at = now() where code = upper(p_code);
      exit;
    exception when unique_violation then
      tries := tries + 1;
      if tries > 8 then
        raise;
      end if;
    end;
  end loop;
  return c;
end;
$$;

revoke all on function public.teacher_ok(text, text) from public;
revoke all on function public.join_class_rider(text, int, text, text, boolean) from public;
revoke all on function public.post_class_activity(text, int, text, text, text, text, int, real, real, int, int, boolean) from public;
revoke all on function public.teacher_riders(text, text) from public;
revoke all on function public.teacher_rider_activity(text, text, uuid) from public;
revoke all on function public.teacher_weeks(text, text) from public;
revoke all on function public.teacher_remove_rider(text, text, uuid) from public;
revoke all on function public.teacher_new_code(text, text) from public;
grant execute on function public.join_class_rider(text, int, text, text, boolean) to anon, authenticated;
grant execute on function public.post_class_activity(text, int, text, text, text, text, int, real, real, int, int, boolean) to anon, authenticated;
grant execute on function public.teacher_riders(text, text) to anon, authenticated;
grant execute on function public.teacher_rider_activity(text, text, uuid) to anon, authenticated;
grant execute on function public.teacher_weeks(text, text) to anon, authenticated;
grant execute on function public.teacher_remove_rider(text, text, uuid) to anon, authenticated;
grant execute on function public.teacher_new_code(text, text) to anon, authenticated;

-- The teacher's locked backup: student names and the teacher key, encrypted on the teacher's
-- device with a key made from their teacher password. Keyflame stores only the locked blob,
-- the salt, and a hash of a separate proof made from the same password, so it can't read names.
alter table public.classes add column if not exists vault text check (length(vault) <= 60000);
alter table public.classes add column if not exists vault_salt text check (vault_salt ~ '^[A-Za-z0-9+/=]{16,64}$');
alter table public.classes add column if not exists vault_proof text;
alter table public.classes add column if not exists vault_fails int not null default 0;
alter table public.classes add column if not exists vault_fail_at timestamptz;

create or replace function public.teacher_save_vault(p_code text, p_key text, p_salt text, p_proof text, p_vault text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not teacher_ok(p_code, p_key) or length(coalesce(p_proof, '')) < 32 then
    return false;
  end if;
  update classes
  set vault = p_vault, vault_salt = p_salt, vault_proof = encode(sha256(convert_to(p_proof, 'UTF8')), 'hex'), used_at = now()
  where code = upper(p_code);
  return true;
end;
$$;

-- The salt a device needs to turn the teacher password into a key. Null without a backup.
create or replace function public.class_vault_salt(p_code text)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select vault_salt from classes where code = upper(p_code) and vault is not null;
$$;

-- The locked backup, for the right password proof. Ten wrong tries lock it for an hour.
create or replace function public.teacher_restore(p_code text, p_proof text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  c classes;
begin
  select * into c from classes where code = upper(p_code);
  if not found or c.vault is null then
    return null;
  end if;
  if c.vault_fails >= 10 and c.vault_fail_at > now() - interval '1 hour' then
    raise exception 'Too many tries. Try again in an hour.';
  end if;
  if c.vault_proof = encode(sha256(convert_to(coalesce(p_proof, ''), 'UTF8')), 'hex') then
    update classes set vault_fails = 0, used_at = now() where code = c.code;
    return c.vault;
  end if;
  update classes
  set vault_fails = case when vault_fail_at > now() - interval '1 hour' then vault_fails + 1 else 1 end, vault_fail_at = now()
  where code = c.code;
  return null;
end;
$$;

revoke all on function public.teacher_save_vault(text, text, text, text, text) from public;
revoke all on function public.class_vault_salt(text) from public;
revoke all on function public.teacher_restore(text, text) from public;
grant execute on function public.teacher_save_vault(text, text, text, text, text) to anon, authenticated;
grant execute on function public.class_vault_salt(text) to anon, authenticated;
grant execute on function public.teacher_restore(text, text) to anon, authenticated;
