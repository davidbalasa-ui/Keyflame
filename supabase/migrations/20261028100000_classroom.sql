-- Classroom mode: a teacher makes a class and gets a short code, riders join with it,
-- race each other live (Supabase Realtime broadcast, no table) and share a class board.
-- Nothing here names a child: riders are known only by their in-game rider name, which
-- is built from preset words. The public key never touches the tables directly; it can
-- only call the functions below.

create table if not exists public.classes (
  -- Six consonants, so a code can never spell a word.
  code text primary key check (code ~ '^[BCDFGHJKLMNPQRSTVWXZ]{6}$'),
  -- sha256 of the teacher key; the key itself only lives on the teacher's device.
  teacher_hash text not null,
  created_at timestamptz not null default now(),
  used_at timestamptz not null default now()
);

create table if not exists public.class_races (
  id bigint generated always as identity primary key,
  class_code text not null references public.classes (code) on delete cascade,
  rider text not null check (rider ~ '^[A-Za-z][A-Za-z ]{0,29}$'),
  wpm real not null check (wpm >= 0 and wpm <= 250),
  accuracy real not null check (accuracy >= 0 and accuracy <= 1),
  place smallint not null check (place between 1 and 40),
  racers smallint not null check (racers between 1 and 40),
  touch boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists class_races_class_idx on public.class_races (class_code, created_at desc);

alter table public.classes enable row level security;
alter table public.class_races enable row level security;
revoke all on public.classes from anon, authenticated;
revoke all on public.class_races from anon, authenticated;

-- Makes a class. Returns the code for the board and a key that lets this teacher clear it.
create or replace function public.create_class()
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
      insert into classes (code, teacher_hash) values (c, encode(sha256(convert_to(k, 'UTF8')), 'hex'));
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

-- True when the code belongs to a class. Joining counts as using the class.
create or replace function public.join_class(p_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update classes set used_at = now() where code = upper(p_code);
  return found;
end;
$$;

-- One rider's finished class race.
create or replace function public.post_class_race(p_code text, p_rider text, p_wpm real, p_accuracy real, p_place int, p_racers int, p_touch boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from classes where code = upper(p_code)) then
    return false;
  end if;
  -- A light brake on floods: one rider name posts at most one race every 10 seconds.
  if exists (
    select 1 from class_races
    where class_code = upper(p_code) and rider = p_rider and created_at > now() - interval '10 seconds'
  ) then
    return false;
  end if;
  insert into class_races (class_code, rider, wpm, accuracy, place, racers, touch)
  values (upper(p_code), p_rider, round(p_wpm::numeric, 1), round(p_accuracy::numeric, 3), p_place, p_racers, p_touch);
  update classes set used_at = now() where code = upper(p_code);
  return true;
end;
$$;

-- The class board: each rider's best speed, fastest first.
create or replace function public.class_board(p_code text)
returns table (rider text, best_wpm real, best_accuracy real, races int, wins int, touch boolean)
language sql
security definer
set search_path = public
stable
as $$
  select r.rider,
    max(r.wpm) as best_wpm,
    max(r.accuracy) as best_accuracy,
    count(*)::int as races,
    (count(*) filter (where r.place = 1 and r.racers > 1))::int as wins,
    (array_agg(r.touch order by r.wpm desc))[1] as touch
  from class_races r
  where r.class_code = upper(p_code)
  group by r.rider
  order by best_wpm desc
  limit 40;
$$;

-- Clears the board. Only the device that made the class has the key.
create or replace function public.clear_class_board(p_code text, p_key text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from classes
    where code = upper(p_code) and teacher_hash = encode(sha256(convert_to(p_key, 'UTF8')), 'hex')
  ) then
    return false;
  end if;
  delete from class_races where class_code = upper(p_code);
  return true;
end;
$$;

revoke all on function public.create_class() from public;
revoke all on function public.join_class(text) from public;
revoke all on function public.post_class_race(text, text, real, real, int, int, boolean) from public;
revoke all on function public.class_board(text) from public;
revoke all on function public.clear_class_board(text, text) from public;
grant execute on function public.create_class() to anon, authenticated;
grant execute on function public.join_class(text) to anon, authenticated;
grant execute on function public.post_class_race(text, text, real, real, int, int, boolean) to anon, authenticated;
grant execute on function public.class_board(text) to anon, authenticated;
grant execute on function public.clear_class_board(text, text) to anon, authenticated;
