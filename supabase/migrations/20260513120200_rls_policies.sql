-- ─────────────────────────────────────────────────────────────────────────────
-- Row Level Security — every user-owned table.
--
-- One identical policy set per table:
--   • SELECT, INSERT, UPDATE, DELETE allowed only when auth.uid() = user_id.
--   • UPDATE has both USING (row must already be yours) and WITH CHECK (the
--     new row must still be yours) so a malicious client can't swap user_id.
--
-- `profiles` is a special case: the user can only see/edit their own row,
-- keyed by `id` rather than `user_id`.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── profiles ───────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own"  on public.profiles;
drop policy if exists "profiles_update_own"  on public.profiles;
drop policy if exists "profiles_insert_self" on public.profiles;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using       (auth.uid() = id)
  with check  (auth.uid() = id);

-- Insert is normally done by the trigger (security definer), but allow the
-- user to self-insert as a safety net if the trigger is ever disabled.
create policy "profiles_insert_self"
  on public.profiles for insert
  with check (auth.uid() = id);

-- ── Per-user tables: apply the same four-policy pattern ────────────────────
-- %I quotes identifiers (table name, policy name); we build the policy name
-- in plpgsql with concatenation rather than nesting %I inside literal quotes.
do $$
declare
  t text;
  p text;
begin
  foreach t in array array[
    'drill_folders',
    'folder_subcategories',
    'teams',
    'drills',
    'sessions',
    'season_plans',
    'calendar_events',
    'drill_templates'
  ] loop
    execute format('alter table public.%I enable row level security;', t);

    -- SELECT
    p := t || '_select_own';
    execute format('drop policy if exists %I on public.%I;', p, t);
    execute format(
      'create policy %I on public.%I for select using (auth.uid() = user_id);',
      p, t
    );

    -- INSERT
    p := t || '_insert_own';
    execute format('drop policy if exists %I on public.%I;', p, t);
    execute format(
      'create policy %I on public.%I for insert with check (auth.uid() = user_id);',
      p, t
    );

    -- UPDATE
    p := t || '_update_own';
    execute format('drop policy if exists %I on public.%I;', p, t);
    execute format(
      'create policy %I on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id);',
      p, t
    );

    -- DELETE
    p := t || '_delete_own';
    execute format('drop policy if exists %I on public.%I;', p, t);
    execute format(
      'create policy %I on public.%I for delete using (auth.uid() = user_id);',
      p, t
    );
  end loop;
end
$$;

-- ── Revoke anon write access entirely as a defence-in-depth measure ────────
-- (RLS already blocks it, but explicit grants make intent obvious.)
revoke insert, update, delete on all tables in schema public from anon;
