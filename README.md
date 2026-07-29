# Monthlane

**Plan life, one month at a time.**

Monthlane is a calm, local-first personal calendar. Phase 1 provides a responsive
Monday-first month view, device-local event persistence with IndexedDB, event
creation and editing, soft deletion, default calendars, calendar filtering,
keyboard shortcuts, and a mobile day agenda.

## Development

Use Node.js 22 or newer.

```bash
npm install
npm run dev
```

Validation:

```bash
npm run typecheck
npm run test
npm run build
npm run build:pages
```

Monthlane stores event data in the browser's IndexedDB database named
`monthlane`. Settings provides JSON backup/restore and optional Supabase
cloud synchronization. The app remains usable offline.

## Supabase cloud sync

Create a Supabase project, enable Email authentication, then run this SQL in
the Supabase SQL editor:

```sql
create table public.monthlane_backups (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.monthlane_backups enable row level security;

create policy "Users can read their own calendar"
on public.monthlane_backups for select
using (auth.uid() = user_id);

create policy "Users can insert their own calendar"
on public.monthlane_backups for insert
with check (auth.uid() = user_id);

create policy "Users can update their own calendar"
on public.monthlane_backups for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
```

Copy the project URL and publishable anon key from Supabase into Monthlane's
Settings panel. Never paste the Supabase service-role key into the browser.

## Keyboard shortcuts

- `N`: create an event on the selected day
- `T`: return to today
- `←` / `→`: switch months
- `Esc`: close the event editor

## GitHub Pages

Push the `main` branch to `Aprollov/monthlane`, then open **Settings → Pages**
and select **GitHub Actions** as the source. Every later push to `main` runs the
checked-in deployment workflow and publishes the static app at:

`https://aprollov.github.io/monthlane/`
