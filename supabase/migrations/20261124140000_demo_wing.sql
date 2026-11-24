-- Demo wings: a wing marked as a showcase, so a grown-up can look at every part of the
-- game in the real app. A device that has joined a badge of a demo wing (with its secret
-- word, like any wing) unlocks everything for that rider on that device.
-- Which wings are demos lives only in this table, never in the site's code, so the
-- code, badge and word can't be found by reading the site. Rows are added by hand.
-- Additive only: a new table, a new function, and the stats view leaving demos out.

create table if not exists public.demo_wings (
  class_code text primary key references public.classes (code) on delete cascade on update cascade,
  created_at timestamptz not null default now()
);

alter table public.demo_wings enable row level security;
revoke all on public.demo_wings from anon, authenticated;

-- True only for a device that already rides as this badge (it joined with the word).
create or replace function public.demo_wing(p_code text, p_badge int, p_rider_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from demo_wings d
    join class_riders r on r.class_code = d.class_code
    where d.class_code = upper(p_code)
      and r.badge = p_badge
      and encode(sha256(convert_to(coalesce(p_rider_key, ''), 'UTF8')), 'hex') = any (r.key_hashes)
  );
$$;

revoke all on function public.demo_wing(text, int, text) from public;
grant execute on function public.demo_wing(text, int, text) to anon, authenticated;

-- The wing totals leave demo wings out, so looking around never counts as use.
create or replace view stats.wings as
select
  (select count(*) from public.classes c where kind = 'class' and not exists (select 1 from public.demo_wings d where d.class_code = c.code)) as classes,
  (select count(*) from public.classes c where kind = 'family' and not exists (select 1 from public.demo_wings d where d.class_code = c.code)) as family_wings,
  (select count(*) from public.classes c where created_at > now() - interval '7 days' and not exists (select 1 from public.demo_wings d where d.class_code = c.code)) as wings_made_this_week,
  (select count(*) from public.class_riders r where not exists (select 1 from public.demo_wings d where d.class_code = r.class_code)) as badges_joined,
  (select count(*) from public.class_riders r where last_seen > now() - interval '7 days' and not exists (select 1 from public.demo_wings d where d.class_code = r.class_code)) as badges_active_this_week,
  (select count(*) from public.class_activity x join public.class_riders r on r.id = x.rider_id where x.kind = 'race' and x.created_at > now() - interval '7 days' and not exists (select 1 from public.demo_wings d where d.class_code = r.class_code)) as wing_races_this_week,
  (select count(*) from public.class_activity x join public.class_riders r on r.id = x.rider_id where x.kind = 'lesson' and x.created_at > now() - interval '7 days' and not exists (select 1 from public.demo_wings d where d.class_code = r.class_code)) as wing_lessons_this_week,
  (select count(*) from public.class_races x where x.created_at > now() - interval '7 days' and not exists (select 1 from public.demo_wings d where d.class_code = x.class_code)) as class_board_races_this_week;
