# Daily feedback routine

Players send bug reports and ideas from **Report a bug or idea** on the hub. A grown-up check runs before anything is sent. Reports carry no names; emails, phone numbers and links are stripped on the device (`src/game/feedback.ts`).

## Setup

1. Create the table with `supabase/feedback.sql`.
2. Add two GitHub repository variables (Settings → Secrets and variables → Actions → Variables):
   - `FEEDBACK_URL` = `https://<project-ref>.supabase.co/rest/v1/feedback`
   - `FEEDBACK_KEY` = the project's publishable (anon) key. It can only insert.
3. Push to `main` (or re-run the deploy) so the build picks them up. Until both are set, the form says it is not switched on yet.

## The routine (once a day)

Prompt for the scheduled Claude session:

> Read new rows from the Keyflame `feedback` table (`status = 'new'`), oldest first.
> For each bug: reproduce it from the message, version, device and screen. If it is real and the fix is small and safe, fix it on a branch, add a test, open a PR, and set `status = 'fixed'` with the PR link in `notes`. If you cannot reproduce it, leave a short note and `status = 'needs-info'`.
> For ideas and anything else, set `status = 'sent-to-david'` and add it to that day's summary for David.
> Mark repeats `duplicate`. Ignore and mark `not-a-bug` anything rude or off topic. Never repeat personal details if a child typed some anyway: write "[personal info removed]" in notes instead.
> End with one short summary for David: bugs fixed (with PR links), bugs waiting, and new ideas worth a look.
