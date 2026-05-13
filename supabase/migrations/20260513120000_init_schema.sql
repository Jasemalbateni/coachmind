-- ─────────────────────────────────────────────────────────────────────────────
-- CoachMind — initial schema (Phase B)
--
-- Strategy:
--   • Every user-owned table carries `user_id uuid references auth.users(id)`.
--   • The deep / polymorphic payload (canvas objects, drill steps, session
--     blocks, season-plan entries, team players) lives in a `data jsonb`
--     column so we don't have to relationally model 15+ CanvasObject variants.
--   • Stable fields that the app filters on (folder_id, team_id, dates,
--     status, etc.) are extracted into typed columns so they can be indexed.
--   • All FK relationships use ON DELETE SET NULL so deleting a folder /
--     team / session never cascade-wipes user content. The app handles
--     orphan cleanup.
--
-- RLS policies live in 0003_rls.sql; the profile bootstrap trigger lives in
-- 0002_profiles_trigger.sql.
-- ─────────────────────────────────────────────────────────────────────────────

-- Required for gen_random_uuid() in default values.
create extension if not exists "pgcrypto";

-- ─── profiles ──────────────────────────────────────────────────────────────
-- One row per auth.users entry, created automatically by the trigger in
-- 0002_profiles_trigger.sql. Use this for display name, avatar, etc.
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text,
  display_name  text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ─── drill_folders ─────────────────────────────────────────────────────────
create table if not exists public.drill_folders (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists drill_folders_user_idx on public.drill_folders (user_id, updated_at desc);

-- ─── folder_subcategories ──────────────────────────────────────────────────
create table if not exists public.folder_subcategories (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  folder_id     uuid not null references public.drill_folders(id) on delete cascade,
  name          text not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists folder_subcategories_user_idx on public.folder_subcategories (user_id);
create index if not exists folder_subcategories_folder_idx on public.folder_subcategories (folder_id);

-- ─── teams ─────────────────────────────────────────────────────────────────
-- `data jsonb` carries the full Team payload (colors, training days,
-- players[]). `name` + `age_group` are extracted so we can sort/filter.
create table if not exists public.teams (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  age_group     text,
  data          jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists teams_user_idx on public.teams (user_id, updated_at desc);

-- ─── drills ────────────────────────────────────────────────────────────────
-- `data jsonb` carries the full Drill payload (objects[], steps[], pitch,
-- coaching points, etc.). Extracted columns are the ones the UI filters on.
-- parent_drill_id is a soft self-reference (variations/progressions).
create table if not exists public.drills (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  title           text not null,
  folder_id       uuid references public.drill_folders(id) on delete set null,
  subcategory_id  uuid references public.folder_subcategories(id) on delete set null,
  team_id         uuid references public.teams(id) on delete set null,
  parent_drill_id uuid references public.drills(id) on delete set null,
  is_favorite     boolean not null default false,
  sort_order      integer,
  data            jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists drills_user_idx        on public.drills (user_id, updated_at desc);
create index if not exists drills_user_folder_idx on public.drills (user_id, folder_id);
create index if not exists drills_user_team_idx   on public.drills (user_id, team_id);
create index if not exists drills_favorite_idx    on public.drills (user_id) where is_favorite;

-- ─── sessions ──────────────────────────────────────────────────────────────
-- `data jsonb` carries the full Session (blocks[] referencing drill ids,
-- objective, notes, etc.). `date` is extracted as a real date column so we
-- can index calendar queries.
create table if not exists public.sessions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  title         text not null,
  team_id       uuid references public.teams(id) on delete set null,
  date          date,
  data          jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists sessions_user_idx       on public.sessions (user_id, updated_at desc);
create index if not exists sessions_user_team_idx  on public.sessions (user_id, team_id);
create index if not exists sessions_user_date_idx  on public.sessions (user_id, date);

-- ─── season_plans ──────────────────────────────────────────────────────────
-- `data jsonb` carries entries[] (each pointing at a session_id).
create table if not exists public.season_plans (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  team_id       uuid not null references public.teams(id) on delete cascade,
  title         text not null,
  start_date    date not null,
  end_date      date not null,
  data          jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists season_plans_user_idx       on public.season_plans (user_id, updated_at desc);
create index if not exists season_plans_user_team_idx  on public.season_plans (user_id, team_id);

-- ─── calendar_events ───────────────────────────────────────────────────────
-- Flat enough that no jsonb payload is needed.
-- `season_plan_entry_id` is a free-form text reference into a SeasonPlan's
-- entries[] (which lives inside season_plans.data jsonb), so it cannot be a
-- foreign key; application code keeps it in sync.
create table if not exists public.calendar_events (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references auth.users(id) on delete cascade,
  title                   text not null,
  date                    date not null,
  type                    text not null check (type in ('training', 'match', 'rest', 'other')),
  status                  text check (status in ('planned', 'completed', 'cancelled')),
  team_id                 uuid references public.teams(id)    on delete set null,
  session_id              uuid references public.sessions(id) on delete set null,
  season_plan_entry_id    text,
  notes                   text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
create index if not exists calendar_events_user_idx        on public.calendar_events (user_id, date);
create index if not exists calendar_events_user_team_idx   on public.calendar_events (user_id, team_id);
create index if not exists calendar_events_user_entry_idx  on public.calendar_events (user_id, season_plan_entry_id);

-- ─── drill_templates ───────────────────────────────────────────────────────
-- Personal saved-template library (full Drill snapshot in data jsonb).
create table if not exists public.drill_templates (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  title         text not null,
  data          jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);
create index if not exists drill_templates_user_idx on public.drill_templates (user_id, created_at desc);

-- ─── updated_at auto-touch ─────────────────────────────────────────────────
-- Generic trigger so the server keeps `updated_at` accurate without trusting
-- the client clock. Attach it to every table that has updated_at.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'profiles', 'drill_folders', 'folder_subcategories', 'teams',
    'drills', 'sessions', 'season_plans', 'calendar_events'
  ] loop
    execute format(
      'drop trigger if exists set_updated_at on public.%I;', t
    );
    execute format(
      'create trigger set_updated_at before update on public.%I
         for each row execute function public.set_updated_at();', t
    );
  end loop;
end$$;
