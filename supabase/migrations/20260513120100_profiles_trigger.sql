-- ─────────────────────────────────────────────────────────────────────────────
-- Automatic profile creation on signup.
--
-- When Supabase Auth inserts a new row into auth.users (after email
-- verification or social sign-up), we insert a matching row into
-- public.profiles so the app can read display name / preferences from a
-- single, RLS-protected place.
--
-- SECURITY DEFINER lets the function bypass RLS to write into profiles.
-- The function only ever inserts the auth.users row that triggered it,
-- so it cannot be abused to create rows for someone else's user id.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', new.email)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
