-- Feedback table for the in-game "Report a bug or idea" form.
-- The game uses the publishable (anon) key, which can only insert. Nobody can read
-- reports with that key; the daily routine reads them with project access.

create table if not exists public.feedback (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  kind text not null check (kind in ('bug', 'idea', 'other')),
  message text not null check (char_length(message) between 5 and 600),
  screen text not null default '' check (char_length(screen) <= 40),
  version text not null default '' check (char_length(version) <= 40),
  device text not null default '' check (device in ('phone', 'tablet', 'desktop', '')),
  browser text not null default '' check (char_length(browser) <= 40),
  os text not null default '' check (char_length(os) <= 40),
  input text not null default '' check (char_length(input) <= 20),
  -- Set by the daily routine: new, fixed, sent-to-david, duplicate, not-a-bug.
  status text not null default 'new',
  notes text not null default ''
);

alter table public.feedback enable row level security;

drop policy if exists "game can send feedback" on public.feedback;
create policy "game can send feedback" on public.feedback
  for insert to anon
  with check (status = 'new' and notes = '');

-- Inserts only: no select, update or delete for the public key.
revoke all on public.feedback from anon, authenticated;
grant insert (kind, message, screen, version, device, browser, os, input) on public.feedback to anon;
