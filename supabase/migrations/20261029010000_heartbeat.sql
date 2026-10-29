-- Heartbeat: Supabase pauses free projects after about a week with no activity, which
-- would switch off classroom mode and the feedback form. A daily GitHub Actions job and
-- the daily feedback routine each write today's date here, so the project stays awake,
-- and reading the rows back shows the database is alive and who last checked in.
-- Nothing about players is stored: only the date, which checker wrote it, and a count.

create table if not exists public.heartbeats (
  day date not null default current_date,
  source text not null check (source in ('github', 'routine', 'manual')),
  beats int not null default 1,
  last_at timestamptz not null default now(),
  primary key (day, source)
);

alter table public.heartbeats enable row level security;
revoke all on public.heartbeats from anon, authenticated;

-- Writes today's beat for one checker and returns each checker's latest beat, so the
-- caller can tell whether the others have gone quiet.
create or replace function public.heartbeat(p_source text)
returns table (source text, last_day date, last_at timestamptz, beats int)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
begin
  if p_source not in ('github', 'routine', 'manual') then
    raise exception 'Unknown heartbeat source';
  end if;
  insert into heartbeats as h (day, source) values (current_date, p_source)
  on conflict (day, source) do update set beats = least(h.beats + 1, 1000000), last_at = now();
  -- Keep a little over a year of history.
  delete from heartbeats where day < current_date - 400;
  return query
    select distinct on (h.source) h.source, h.day, h.last_at, h.beats
    from heartbeats h
    order by h.source, h.day desc;
end;
$$;

revoke all on function public.heartbeat(text) from public;
grant execute on function public.heartbeat(text) to anon, authenticated;
