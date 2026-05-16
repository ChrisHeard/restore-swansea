# Leafletting Tracker MVP

## Features

- Email/password login with Supabase Auth using `@supabase/ssr`.
- Optional email magic-link fallback for one-off sign-ins.
- Protected `/dashboard` route for authenticated users.
- Create and update streets with status, notes, and last-updated timestamp.
- All street data scoped to the logged-in user.

## Supabase Auth setup for local development

For stable local testing, enable password auth and use a fixed development user:

1. In Supabase Dashboard, go to **Authentication → Providers → Email**.
2. Enable **Email** provider with **email/password sign-in** enabled.
3. Go to **Authentication → Users** and manually create a development user.
4. Sign in locally using that email/password on `/`.

> Magic links can hit Supabase email rate limits during rapid local testing. Keep them as optional fallback, not your primary local auth flow.

## Supabase SQL setup

Run this in the Supabase SQL editor:

```sql
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz default now()
);

create table if not exists public.streets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  street_name text not null,
  area text,
  postcode text,
  status text not null default 'not_started' check (status in ('not_started', 'delivered', 'needs_revisit')),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.streets enable row level security;

create policy "Users can view own streets"
  on public.streets for select
  using (auth.uid() = user_id);

create policy "Users can insert own streets"
  on public.streets for insert
  with check (auth.uid() = user_id);

create policy "Users can update own streets"
  on public.streets for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own streets"
  on public.streets for delete
  using (auth.uid() = user_id);

create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_streets_updated_at
before update on public.streets
for each row execute function public.handle_updated_at();
```

## Run

```bash
npm install
npm run dev
```
