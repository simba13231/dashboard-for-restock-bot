-- PS99 Restock Bot — multi-tenant schema
-- Run this in the Supabase SQL editor (or via `supabase db push`) once
-- your project is created.

create extension if not exists pgcrypto;

-- One row per user, holding the display name shown in the sidebar.
-- Discord sign-ins get this filled in automatically (their Discord
-- name) the first time they log in; anyone signing in another way
-- (e.g. Google) is asked to pick one during onboarding. Either way,
-- it's editable afterward from Settings.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "own profile select" on public.profiles
  for select using (id = auth.uid());
create policy "own profile insert" on public.profiles
  for insert with check (id = auth.uid());
create policy "own profile update" on public.profiles
  for update using (id = auth.uid());

-- One row per user's connected bot. A user can only ever have one bot
-- in this MVP schema (keeps onboarding simple: sign in -> get one key).
create table if not exists public.bots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'My PS99 Bot',
  agent_key_hash text not null unique,
  markup_percent numeric not null default 5,
  created_at timestamptz not null default now(),
  unique (user_id)
);

-- Live status, one row per bot. Written only by the agent-report edge
-- function (via the service role, which bypasses RLS), read by the owner.
create table if not exists public.bot_status (
  bot_id uuid primary key references public.bots(id) on delete cascade,
  connected boolean not null default false,
  bot_user text,
  booth_full boolean not null default false,
  booth_last_read text,
  last_event text not null default 'Waiting for agent to connect...',
  queue_length int not null default 0,
  updated_at timestamptz not null default now()
);

-- One row per completed restock, so the dashboard has a real feed
-- instead of fixture data.
create table if not exists public.restock_events (
  id uuid primary key default gen_random_uuid(),
  bot_id uuid not null references public.bots(id) on delete cascade,
  item_name text not null,
  price bigint,
  rap bigint,
  price_basis text,
  created_at timestamptz not null default now()
);

-- Commands queued from the dashboard, picked up by the agent's next poll.
create table if not exists public.commands (
  id uuid primary key default gen_random_uuid(),
  bot_id uuid not null references public.bots(id) on delete cascade,
  type text not null check (type in ('pause', 'resume', 'set_markup')),
  payload jsonb,
  created_at timestamptz not null default now(),
  delivered_at timestamptz
);

alter table public.bots enable row level security;
alter table public.bot_status enable row level security;
alter table public.restock_events enable row level security;
alter table public.commands enable row level security;

-- bots: fully owner-controlled from the frontend.
create policy "own bots select" on public.bots
  for select using (user_id = auth.uid());
create policy "own bots insert" on public.bots
  for insert with check (user_id = auth.uid());
create policy "own bots update" on public.bots
  for update using (user_id = auth.uid());
create policy "own bots delete" on public.bots
  for delete using (user_id = auth.uid());

-- bot_status: owner can read and can create the initial row after
-- creating their bot. Ongoing writes come only from the edge function
-- (service role), which ignores RLS entirely, so no update policy for
-- the authenticated role is needed or wanted here.
create policy "own bot_status select" on public.bot_status
  for select using (
    bot_id in (select id from public.bots where user_id = auth.uid())
  );
create policy "own bot_status insert" on public.bot_status
  for insert with check (
    bot_id in (select id from public.bots where user_id = auth.uid())
  );

-- restock_events: owner can read; only the edge function inserts.
create policy "own restock_events select" on public.restock_events
  for select using (
    bot_id in (select id from public.bots where user_id = auth.uid())
  );

-- commands: owner can read and create (from the dashboard); only the
-- edge function marks them delivered.
create policy "own commands select" on public.commands
  for select using (
    bot_id in (select id from public.bots where user_id = auth.uid())
  );
create policy "own commands insert" on public.commands
  for insert with check (
    bot_id in (select id from public.bots where user_id = auth.uid())
  );

-- Let realtime broadcast changes on these tables to subscribed clients.
alter publication supabase_realtime add table public.bot_status;
alter publication supabase_realtime add table public.restock_events;
