# Supabase — migrations & CLI workflow

All schema changes are versioned as timestamped SQL files under
`supabase/migrations/`. Never run ad-hoc DDL in the Supabase Studio SQL editor
— every change should be a new migration so dev, staging, and prod stay in
sync.

## Files

| File | What it does |
| --- | --- |
| `migrations/20260513120000_init_schema.sql` | Creates all tables, indexes, and the `set_updated_at` trigger. |
| `migrations/20260513120100_profiles_trigger.sql` | Auto-creates a `profiles` row whenever a new user signs up via Supabase Auth. |
| `migrations/20260513120200_rls_policies.sql` | Enables Row Level Security and applies the `auth.uid() = user_id` policy set to every user-owned table. |
| `config.toml` | Supabase CLI config; binds this repo to project `kyxyymtqfhkmxlwdexft`. |

## One-time setup

```bash
# 1. Install the CLI (pick one)
npm install -g supabase            # cross-platform
# brew install supabase/tap/supabase   # macOS
# scoop install supabase               # Windows (scoop)

# 2. Log in (opens browser, generates a personal access token)
supabase login

# 3. Link this repo to the remote project
supabase link --project-ref kyxyymtqfhkmxlwdexft
```

## Push migrations to the cloud

```bash
# Apply every un-applied migration in ./migrations to the linked project.
supabase db push
```

The CLI tracks which migrations have already run in the
`supabase_migrations.schema_migrations` table on the remote DB, so re-running
`db push` is safe — it skips files already applied.

## Verifying

```bash
# Show migration history on the linked project
supabase migration list

# Inspect remote schema (optional)
supabase db dump --schema public
```

## Adding new migrations later

```bash
# Generate a new empty timestamped file
supabase migration new my_change

# …edit the file, then…
supabase db push
```

## Local development (optional)

If you want to run a full Supabase stack on your laptop:

```bash
supabase start    # boots Postgres + Auth + Storage + Studio at :54321–54324
supabase stop
```

Local Supabase isn't required for development — the deployed Supabase project
is fine.

## Generating TypeScript types (optional, recommended later)

```bash
supabase gen types typescript --linked > src/types/database.types.ts
```

Run this after every schema change so the frontend gets compile-time table
definitions. Not wired into the build pipeline yet — Phase D will adopt it.
