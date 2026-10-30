-- Badge words: every badge card has a secret word (like FROG) as well as its number, so a
-- classmate can't type someone else's number and ride in their nest. The word isn't stored:
-- it comes from the teacher key's hash and the badge number, the same way on the teacher's
-- device (which prints the cards) and here. Kids' devices send the word's place in the list
-- of 256 words (0 to 255). Wrong words are counted per badge, and five in 15 minutes lock
-- that badge for new devices until the 15 minutes pass. Devices that already ride as a
-- badge never need the word again.

create table if not exists public.badge_tries (
  class_code text not null references public.classes (code) on delete cascade on update cascade,
  badge smallint not null check (badge between 1 and 99),
  fails int not null default 0,
  fail_at timestamptz not null default now(),
  primary key (class_code, badge)
);

alter table public.badge_tries enable row level security;
revoke all on public.badge_tries from anon, authenticated;

-- The word's place in the list for a badge: the first byte of sha256(teacher_hash || ':' || badge).
create or replace function public.badge_word_index(p_teacher_hash text, p_badge int)
returns int
language sql
immutable
set search_path = public
as $$
  select get_byte(sha256(convert_to(p_teacher_hash || ':' || p_badge::text, 'UTF8')), 0);
$$;

revoke all on function public.badge_word_index(text, int) from public;

-- A rider opens the class as a badge.
--   ok       this device rides as the badge
--   none     no class has that code
--   wrong    the word doesn't match the badge
--   locked   too many wrong words for this badge lately; try again in 15 minutes
--   removed  p_word is null (a device checking in with the badge it remembers) and this
--            device no longer rides as it, so it is not claimed again silently
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
  -- One statement, so two devices joining at the same moment both land. Keep the newest
  -- few devices: shared iPads, a home tablet, a new device.
  insert into class_riders (class_code, badge, key_hashes, name) values (c, p_badge, array[hsh], p_name)
  on conflict (class_code, badge) do update
  set key_hashes = (array[hsh] || array_remove(class_riders.key_hashes, hsh))[1:6], name = excluded.name, last_seen = now();
  update classes set used_at = now() where code = c;
  return 'ok';
end;
$$;

revoke all on function public.join_badge(text, int, int, text, text) from public;
grant execute on function public.join_badge(text, int, int, text, text) to anon, authenticated;

-- The old join without a word: still lets a device that already rides as a badge check in,
-- but no longer claims a badge. An old page that asks gets 'none' and a reload fixes it.
create or replace function public.join_class_rider(p_code text, p_badge int, p_rider_key text, p_name text, p_confirm boolean)
returns table (status text, holder text)
language plpgsql
security definer
set search_path = public
as $$
begin
  status := join_badge(p_code, p_badge, null, p_rider_key, p_name);
  if status = 'removed' and p_confirm is not null then
    status := 'none';
  end if;
  holder := null;
  return next;
end;
$$;
