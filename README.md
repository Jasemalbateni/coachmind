# CoachMind

> The professional coaching platform for modern football coaches — drill design, session planning, season planning, and team management, with first-class iPad workflow and end-to-end cloud sync.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Current Features](#2-current-features)
3. [Technical Architecture](#3-technical-architecture)
4. [Data Model](#4-data-model)
5. [Cloud Sync Architecture](#5-cloud-sync-architecture)
6. [Setup](#6-setup)
7. [Development Workflow](#7-development-workflow)
8. [Phases & Roadmap](#8-phases--roadmap)
9. [Known Limitations / Technical Debt](#9-known-limitations--technical-debt)
10. [Code Quality Expectations](#10-code-quality-expectations)
11. [Project Structure Reference](#11-project-structure-reference)

---

## 1. Project Overview

**CoachMind** is a coaching-workspace SaaS for football coaches. It combines:

- A **tactical canvas editor** for designing drills (players, balls, cones, goals, arrows, zones, lines, shapes, text).
- A **session builder** that sequences drills into structured training sessions with intensity, duration, and phase metadata.
- A **season planner** that maps sessions across weeks for periodisation.
- A **team hub** for squads, formations, training-day schedules, and tactical color palettes.
- A **calendar** that links events, training sessions, and season-plan entries.
- **Print-ready exports** for single drills, full sessions, and full season plans.

**Target users.** Football coaches at academy, youth, and semi-professional level who currently rely on tactic-board apps + spreadsheets + paper. The platform is designed for one solo coach per account, with cloud sync across their own devices.

**Core vision.** Replace the patchwork of tactic apps, Word docs, and PDFs that coaches currently juggle with a single coherent workspace that goes from drill design → session → season plan → printable coaching documents.

**Maturity.**
- All seven data domains (drills, sessions, season plans, folders, teams, calendar, drill templates) are implemented with full local-only behavior and cloud sync gated by Supabase Row-Level Security.
- Cloud-sync architecture is feature-complete through **Phase F**. The local-to-cloud import flow ("bring my offline data into my account") and realtime multi-device sync are deferred to Phase G and beyond.
- Build is clean: `npx tsc --noEmit` and `npm run build` pass in both local-only and cloud modes.

**Supported platforms.**

| Platform | Status | Notes |
|---|---|---|
| Web (Chrome/Edge/Safari/Firefox) | Stable | Primary target. SSR-aware. |
| iPad (Safari + PWA) | Stable | First-class. Dedicated breakpoints, safe-area handling, dynamic viewport units (`dvh`), and editor-mode chrome stripping for tablets. |
| iPhone / small mobile | Functional but not optimised | The editor uses tablet/desktop assumptions; list pages work. |
| Electron desktop (Windows / macOS) | Stable | Bundled via `electron-builder`. Same Next.js app runs inside Electron's main-process Node runtime on port 3456. File-based "Open / Save Project" works offline. |

---

## 2. Current Features

### Drill Editor (`/drills/[id]`)

- **Tactical canvas** built on `react-konva` (2,100+ lines in `PitchCanvas.tsx`).
- **Pitch types:** full, half, final third, plain area — with configurable grass color, stripe color, and line color.
- **Object types:** players (with team color, number, name, GK badge, stroke/number color overrides), cones (5 color variants), balls, goals (small/full), 2-point arrows, 2-point lines, **curved (quadratic bézier)** lines, rectangles, circles, zones, links between players, focus-zone overlays, smart cone areas (auto-distributed cones), text labels, named groups.
- **Tactical arrow library:** Run, Pass, Dribble (with zigzag rendering), Press, Lane, Defensive line, Support — each preset has its own color + line style + head style.
- **Smart Arrows** (alternative palette): pass/dribble/run with distinct visual treatments.
- **Drawing helpers:**
  - Shift-constrained drawing (45° increments for arrows / lines, axis-locked drag for moves).
  - Shift+drag axis lock for object moves.
  - Snap-to-grid + alignment snap with smart guides.
  - 3-click curved-line creation (start → control point → end).
  - Live preview during drawing.
- **Selection & manipulation:**
  - Single click, shift-click multi-select, marquee selection.
  - Multi-drag with synchronised live offsets.
  - Group rotation/scaling via Konva `Transformer`.
  - Copy/cut/paste (Ctrl+C / X / V) with object id regeneration.
  - Duplicate (Ctrl+D), Delete (Del/Backspace), Lock toggle.
- **Drill steps.** Each drill can carry a sequence of internal steps (each with its own object array). Play simulation linearly interpolates object positions between consecutive steps via `requestAnimationFrame`.
- **Smart arrows that follow players.** An arrow can be anchored to a player id at either endpoint; if the player moves, the arrow re-renders to match.
- **Keyboard shortcuts:** `A` arrow, `R` rectangle, `L` line, `C` circle, `B` ball, `G` goal, `D` duplicate, `Del` delete, `F` favorite, plus the play/stop / cmd-shortcut set.
- **Player Dock.** Per-side tab UI (Team A / Team B), formation presets (4-3-3, 4-4-2, etc.) with one-click placement, segment templates (back-4, mid-3, front-3), team-color binding so swapping the linked team auto-recolors the players.
- **Inspector Panel.** Context-aware per object type with color pickers, fonts, line styles, fill opacity, stroke color, dash toggle, number visibility, GK badge, lock toggle, alignment (left/right/top/bottom/center).
- **Drill metadata** (Info panel): title, objective, age group, players, area size, duration, equipment list, coaching points, coaching cues, common mistakes, corrections, key constraints, progression, regression, notes, tags, linked team, training day.
- **Favorites + drill relationships** (variation, progression, regression chains with `parentDrillId`).

### Drill List (`/drills`)

- Folders + subcategories (nested) with drag-to-folder.
- Favorites strip pinned to the top.
- 8 built-in starter templates (Blank, Rondo, Possession, Build-up, Finishing, Pressing, Transition, SSG) via a 2-step "new drill" modal.
- Sortable drill cards (drag-to-reorder via `@dnd-kit/sortable`).
- Inline mini-pitch preview thumbnails on every card.

### Session Builder (`/sessions/[id]`)

- Drag-and-drop timeline of drill blocks (`@dnd-kit/core` + `@dnd-kit/sortable`).
- Per-block duration, intensity (low/mid/high), notes, and **section** (warm-up / main / game / cool-down) with colored section headers.
- Drill picker modal scoped to the user's drill library.

### Season Plans (`/season-plans/[id]`)

- Weekly grid spanning a configurable start/end date.
- Each entry binds a session to a date + training day.
- Calendar synchronisation: editing a season-plan entry creates/updates a linked calendar event via `syncSeasonPlanEntry`; deleting an entry clears the event.

### Teams (`/teams/[id]`)

- Per-team roster editor.
- Primary / opponent jersey colors, stroke colors, jersey-number text colors.
- Training-day pattern (e.g. Sun / Tue / Thu).

### Calendar (`/calendar`)

- Month grid with training / match / rest / other event types.
- Status (planned / completed / cancelled).
- Cross-links to teams, sessions, and season-plan entries.

### Print System

| Print route | Layout | Page count |
|---|---|---|
| `/drills/[id]/view` (print) | Header + large diagram + dense info panel + footer | 1 landscape A4 (graceful overflow on extremely long drills) |
| `/sessions/[id]/print` | Cover page + overview table + one page per drill | 1 + N |
| `/season-plans/[id]/view` (print) | Week-by-week table with drill thumbnails | 1+ |

All print views are dedicated routes that hide app chrome via `@media print` rules and embed `<MiniPitchPreview>` SVG renderings (sharper than Konva canvas exports).

### Authentication & Cloud Sync

- Email + password sign-up / sign-in via Supabase Auth.
- Per-user data isolation enforced by Postgres Row-Level Security.
- Per-entity write queue with exponential-backoff retry, capped attempts, and last-write-wins reconciliation.
- Combined sync indicator (Synced / Syncing… / Offline / Sync failed) in the sidebar.
- Local-only fallback: with no Supabase env vars set, the entire app runs against `localStorage` exactly as it did pre-cloud.

### Drill Templates (saved-template library)

- "Save as template" snapshots a drill into a personal template library.
- Per-user, cloud-synced.

### Desktop (Electron)

- Bundled Windows / macOS app via `electron-builder`.
- Native Save / Open dialogs (`.coachmind` project files containing a full store snapshot).
- Image export (PNG via Konva `toDataURL`) and PDF export via Electron's print pipeline.
- Window state persistence across launches.

---

## 3. Technical Architecture

### Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 14.2.5** (App Router) | Server-rendered shell, route handlers for auth callbacks, edge-runtime middleware, static export-friendly for Electron. |
| Language | **TypeScript 5.5** strict | Whole codebase. `npx tsc --noEmit` is part of the verification gate every phase. |
| Styling | **Tailwind CSS 3.4** | Custom breakpoints (`nav`, `desktop`) + brand color palette under `theme.extend.colors.brand`. |
| State | **Zustand 4.5** + `persist` middleware | One store per domain. Persistence routed through a custom per-user namespaced storage adapter. |
| Canvas | **react-konva 18 / konva 9** | High-performance 2D drawing for the tactical editor. Loaded via `next/dynamic({ ssr: false })`. |
| Drag-and-drop | **@dnd-kit/core + sortable** | Session timeline, drill list reorder, drill-to-folder DnD. |
| Auth + DB | **Supabase** (`@supabase/supabase-js` + `@supabase/ssr`) | Postgres + Auth + RLS. Anon key only on the client. |
| Desktop wrapper | **Electron 31** + `electron-builder` | Bundles Next standalone server inside the Electron main process. |
| PDF generation (devtool) | **Puppeteer** | Used by tooling/reports, not part of the runtime. |

### Routing Structure (App Router)

```
src/app/
├── page.tsx                        # marketing landing
├── layout.tsx                      # root layout — wraps in AppShell
├── manifest.ts / icon.tsx / apple-icon.tsx
├── globals.css                     # tailwind base + print resets + safe-area helpers
├── login/page.tsx                  # real Supabase auth
├── signup/page.tsx                 # real Supabase auth
├── auth/callback/route.ts          # OAuth / magic-link / email-confirm exchange
├── drills/
│   ├── page.tsx                    # drill list (folders, favorites, templates modal)
│   └── [id]/
│       ├── page.tsx                # drill EDITOR
│       └── view/page.tsx           # drill VIEWER + print
├── sessions/
│   ├── page.tsx                    # session list
│   └── [id]/
│       ├── page.tsx                # session builder
│       ├── view/page.tsx           # session viewer
│       └── print/page.tsx          # session multi-page print
├── season-plans/
│   ├── page.tsx
│   └── [id]/{page,view/page}.tsx
├── teams/{page,[id]/page}.tsx
├── calendar/page.tsx
└── v2/                             # experimental redesigned editor (see "v2" below)
```

A root-level `src/middleware.ts` refreshes Supabase auth cookies on every request and redirects unauthenticated users away from protected routes when cloud mode is configured.

### Component Structure

```
src/components/
├── AppShell.tsx                    # routes wrapper — picks nav-bar layout or public layout, hosts AuthProvider
├── NavBar.tsx                      # sidebar with sync indicator + sign-out
├── SyncStatusIndicator.tsx         # combined cloud-sync pill
├── MiniPitchPreview.tsx            # SVG pitch thumbnail used in lists + print
├── DrillsList.tsx                  # folders + favorites + drag-to-reorder list page
├── SessionsList.tsx                # sessions list page
├── TeamsList.tsx                   # teams list page
├── drill-editor/
│   ├── DrillEditorPage.tsx         # editor orchestrator (~1.2k lines)
│   ├── DrillEditorTopBar.tsx       # title, save state, undo/redo, play/stop, print, export
│   ├── PitchCanvas.tsx             # Konva canvas (~2.1k lines) — every object renderer + drawing tools
│   ├── PaletteSidebar.tsx          # equipment + tactical-arrow + smart-arrow palettes
│   ├── InspectorPanel.tsx          # per-object contextual editor (~900 lines)
│   ├── DrillMetaPanel.tsx          # drill Info form
│   ├── PlayerDock.tsx              # team-aware roster picker
│   └── FormationPicker.tsx         # formation presets / segment templates
├── session-builder/
│   ├── SessionBuilderPage.tsx      # timeline orchestrator
│   ├── SessionTimeline.tsx         # @dnd-kit timeline with section headers
│   └── DrillPicker.tsx             # drill selector modal
├── season-plans/
│   ├── SeasonPlansList.tsx
│   ├── SeasonPlanEditor.tsx
│   └── SeasonPlanPrintView.tsx     # week-by-week table print
├── calendar/CalendarPage.tsx
├── team/TeamPage.tsx
└── views/
    ├── DrillView.tsx               # drill viewer + single-drill A4 print
    ├── SessionView.tsx
    └── SessionPrintView.tsx        # multi-page session print
```

### State Management — Zustand Stores

Seven domain stores, all under `src/store/`:

| Store | Persisted key | Has `_seeded` flag? | Seeds demo data? |
|---|---|---|---|
| `useDrillsStore` | `coach-drills-v2` | Yes | Yes (3 demo drills) |
| `useSessionsStore` | `coach-sessions-v2` | Yes | Yes (2 demo sessions) |
| `useSeasonPlansStore` | `coach-season-plans-v1` | No | No |
| `useFoldersStore` | `coach-folders-v1` | No | No |
| `useTeamsStore` | `coach-teams-v1` | Yes | Yes (1 demo team) |
| `useCalendarStore` | `coach-calendar-v1` | No | No |
| `useDrillTemplatesStore` | `coach-drill-templates-v1` | No | No |

Every store uses the same persistence pattern (`zustand/middleware`'s `persist` + a custom storage adapter). Mutations are synchronous against in-memory Zustand state; the persist middleware writes to localStorage. Cloud writes are queued out-of-band by the sync layer (see §5).

### Supabase Architecture

Database schema lives entirely in versioned SQL migrations under `supabase/migrations/`:

| File | Purpose |
|---|---|
| `20260513120000_init_schema.sql` | All tables, indexes, the `set_updated_at` trigger |
| `20260513120100_profiles_trigger.sql` | `auth.users` → `public.profiles` on signup |
| `20260513120200_rls_policies.sql` | RLS enabled + four policies per user-owned table |

**Tables (all under `public.`):**

```
profiles                 (id = auth.users.id, email, display_name)
drill_folders            (id, user_id, name)
folder_subcategories     (id, user_id, folder_id → drill_folders, name)
teams                    (id, user_id, name, age_group, data jsonb)
drills                   (id, user_id, title, folder_id, subcategory_id,
                          team_id, parent_drill_id, is_favorite, sort_order, data jsonb)
sessions                 (id, user_id, title, team_id, date, data jsonb)
season_plans             (id, user_id, team_id, title, start_date, end_date, data jsonb)
calendar_events          (id, user_id, title, date, type, status, team_id,
                          session_id, season_plan_entry_id, notes)
drill_templates          (id, user_id, title, data jsonb)
```

**RLS model.** Every user-owned table has the same four policies:

```sql
CREATE POLICY "<tbl>_select_own" ON public.<tbl> FOR SELECT  USING       (auth.uid() = user_id);
CREATE POLICY "<tbl>_insert_own" ON public.<tbl> FOR INSERT  WITH CHECK  (auth.uid() = user_id);
CREATE POLICY "<tbl>_update_own" ON public.<tbl> FOR UPDATE  USING       (auth.uid() = user_id)
                                                              WITH CHECK (auth.uid() = user_id);
CREATE POLICY "<tbl>_delete_own" ON public.<tbl> FOR DELETE  USING       (auth.uid() = user_id);
```

RLS is the **only** security boundary. The anon key is intentionally public; a compromised client cannot read or write another user's row because Postgres rejects the request server-side. `INSERT, UPDATE, DELETE` on the `public` schema are also explicitly REVOKEd from the `anon` role as defence-in-depth.

The service-role key is **never** used by the app. Migrations run via the Supabase CLI from a developer machine.

### Print Architecture

- **Single-drill print** lives inside `DrillView.tsx` (`/drills/[id]/view`). A `<style>` block scoped to the route swaps the on-screen layout for a dedicated `.drill-view-print` grid when `@media print` matches. Layout: full-width header + 60/40 left/right grid + footer, with metadata cards, prose blocks (objective, description, progression/regression, notes), and dense bullet sections (coaching points, cues, mistakes, corrections, key constraints, equipment, tags).
- **Session print** (`/sessions/[id]/print`) uses `SessionPrintView.tsx` — a cover page (overview table with diagrams) plus one drill page per session block.
- **Season plan print** (`/season-plans/[id]/view` in print mode) uses `SeasonPlanPrintView.tsx` — week-by-week table with drill thumbnails.

Global print rules live in `src/app/globals.css` (`@media print` resets the AppShell's `overflow-hidden` containers so content can flow across pages).

### iPad / Touch Architecture

- Custom Tailwind breakpoint `desktop` = `(min-width: 1280px) and (hover: hover) and (pointer: fine)` — only matches real desktops with mouse-class input. iPad Pro 12.9″ landscape (1366×1024) does NOT match because Apple Pencil / finger fail `hover: hover`.
- `nav` breakpoint at 900px collapses the sidebar to a 64px icon rail.
- `.editor-navbar-hide` rule in `globals.css` removes the sidebar entirely inside the drill editor on any tablet, giving the canvas the full viewport.
- Safe-area helpers (`safe-pt`, `safe-pl`, …) for notch/home-indicator avoidance in PWA standalone mode.
- Dynamic viewport units (`100dvh`) for iOS Safari URL-bar handling.
- PWA manifest with `start_url: '/drills'` and `display: 'standalone'` for Add-to-Home-Screen full-screen launch.

### `/v2` — Experimental Redesigned Editor

A parallel editor implementation under `src/v2/` and `src/app/v2/` lives alongside the production editor:

- Component-per-object-type renderer model (`PlayerRenderer`, `ArrowRenderer`, …).
- Command-history undo/redo (`CommandHistory.ts`).
- Separate editor store (`v2/store/editorStore.ts`).
- Reachable at `/v2/editor/[drillId]`.

It is not the default and is excluded from the main routing flow. Treat it as a research branch that may or may not graduate.

---

## 4. Data Model

Types live in `src/types/index.ts`. Every entity uses ISO timestamp strings for `createdAt` / `updatedAt`.

### Drill

```ts
interface Drill {
  id: string;
  title: string;
  pitch: Pitch;                        // type, dimensions, optional colors
  objects: CanvasObject[];             // polymorphic — see below
  steps?: DrillStep[];                 // each step has its own objects[]
  // metadata
  objective?, ageGroup?, playerCount?, areaSize?: string;
  durationMin?: number;
  equipment?, coachingPoints?, coachingCues?, commonMistakes?,
  corrections?, keyConstraints?: string[];
  progression?, regression?, notes?: string;
  // relationships
  teamId?, folderId?, subcategoryId?, parentDrillId?: string | null;
  relationType?: 'base' | 'variation' | 'progression' | 'regression';
  isFavorite?, sortOrder?, playerScale?: …
  tags?: string[];
  createdAt, updatedAt: string;
}
```

`CanvasObject` is a tagged union of fifteen variants: `player`, `cone`, `ball`, `goal`, `arrow`, `zone`, `circle`, `rectangle`, `line`, `curved`, `link`, `focus-zone`, `smart-cone-area`, `text`, `group`. The union and its variant shapes are why Drills are stored as **jsonb** (see §3): normalising 15 polymorphic object types into relational tables would explode complexity for no benefit.

### Session

```ts
interface Session {
  id, title: string;
  date?: string;
  blocks: SessionBlock[];              // each → drillId + duration + intensity + section
  objective?, ageGroup?, playerCount?, notes?, teamId?, trainingDay?: …
  createdAt, updatedAt: string;
}
```

### SeasonPlan

```ts
interface SeasonPlan {
  id, title, teamId, startDate, endDate: string;
  entries: SeasonPlanEntry[];          // each → date + optional sessionId
  createdAt, updatedAt: string;
}
```

### Team

```ts
interface Team {
  id, name, ageGroup,
  primaryColor, secondaryColor, opponentPrimaryColor, …: string;
  trainingDays: string[];
  players: TeamPlayer[];
  createdAt, updatedAt: string;
}
```

### DrillFolder / FolderSubcategory

```ts
interface DrillFolder { id, name, createdAt, updatedAt }
interface FolderSubcategory { id, folderId, name, createdAt, updatedAt }
```

### CalendarEvent

```ts
interface CalendarEvent {
  id, title, date: string;
  type: 'training' | 'match' | 'rest' | 'other';
  status?: 'planned' | 'completed' | 'cancelled';
  teamId?, sessionId?, seasonPlanEntryId?: string;
  notes?, updatedAt?, createdAt?: string;
}
```

### DrillTemplateItem

```ts
interface DrillTemplateItem { id, title, createdAt, drill: Drill }
```

### Storage shape: JSONB vs relational

| Entity | DB shape |
|---|---|
| Drill | extracted columns (`title`, `folder_id`, `subcategory_id`, `team_id`, `parent_drill_id`, `is_favorite`, `sort_order`) + `data jsonb` (full Drill) |
| Session | extracted (`title`, `team_id`, `date`) + `data jsonb` |
| SeasonPlan | extracted (`title`, `team_id`, `start_date`, `end_date`) + `data jsonb` |
| Team | extracted (`name`, `age_group`) + `data jsonb` |
| DrillTemplate | extracted (`title`) + `data jsonb` |
| CalendarEvent | **fully relational** — every field is a column |
| DrillFolder / FolderSubcategory | **fully relational** |

### Cross-table references

- `drills.folder_id` → `drill_folders.id` (`ON DELETE SET NULL`)
- `drills.subcategory_id` → `folder_subcategories.id` (`ON DELETE SET NULL`)
- `drills.team_id` → `teams.id` (`ON DELETE SET NULL`)
- `drills.parent_drill_id` → `drills.id` (`ON DELETE SET NULL`)
- `sessions.team_id` → `teams.id` (`ON DELETE SET NULL`)
- `season_plans.team_id` → `teams.id` (**required, ON DELETE CASCADE**)
- `folder_subcategories.folder_id` → `drill_folders.id` (`ON DELETE CASCADE`)
- `calendar_events.team_id` → `teams.id` (`ON DELETE SET NULL`)
- `calendar_events.session_id` → `sessions.id` (`ON DELETE SET NULL`)

**References inside jsonb** — `SessionBlock.drillId`, `SeasonPlanEntry.sessionId`, `CalendarEvent.seasonPlanEntryId` — are **not** FK-enforced. The app keeps them consistent at the application layer.

---

## 5. Cloud Sync Architecture

This is the load-bearing piece of the platform. The whole design is **offline-first with optimistic UI and cloud as the eventual source of truth**.

### High-level model

```
                      ┌──────────────────────────────────────┐
                      │      React + Zustand stores          │
                      │      (in-memory, sync writes)        │
                      └───────────────┬──────────────────────┘
                                      │
            ┌─────────────────────────┼─────────────────────────┐
            ▼                         ▼                         ▼
   ┌─────────────────┐    ┌──────────────────────┐    ┌──────────────────┐
   │  localStorage   │    │   cloud write queue  │    │  combined sync   │
   │  (offline cache,│    │   per entity type,   │    │  status store    │
   │   per-user      │    │   exponential        │    │  (drives the     │
   │   namespaced)   │    │   backoff retry,     │    │   sidebar pill)  │
   └─────────────────┘    │   capped attempts    │    └──────────────────┘
                          └──────────────────────┘
                                      │
                                      ▼
                          ┌──────────────────────┐
                          │  Supabase Postgres   │
                          │  + RLS policies      │
                          │  (auth.uid()=user_id)│
                          └──────────────────────┘
```

### Core building blocks (all under `src/lib/cloud/`)

| File | Role |
|---|---|
| `cloudSession.ts` | Module-level `currentUserId` + listener bus. AuthProvider is the sole writer; everything else (storage adapter, sync engines) reads from here. |
| `cloudStorage.ts` | `makeNamespacedStorage(rootKey)` factory — Zustand persist adapter that swaps between `coach-X` and `coach-X:user-<userId>` based on cloud session. |
| `drillStorage.ts` | Thin re-export of the factory for the drills store (back-compat with Phase D). |
| `cloudSyncStatus.ts` | Global Zustand status store keyed by entity name; `combineStatuses` rolls them up "worst wins". |
| `syncFactory.ts` | `makeEntitySync<T>()` — queue + exponential-backoff retry + last-write-wins hydrate. One per entity type. |
| `cloudSyncOrchestrator.ts` | Owns the single `onCloudUserChange` subscription. Rehydrates each store exactly once per transition, then fans out hydrate/clear in two FK-aware phases. |
| `repositories/<entity>.ts` | `listX`, `getX`, `upsertX`, `deleteX` — typed adapter between in-memory type and DB row. |
| `<entity>Sync.ts` | One file per entity that wires its repo into `makeEntitySync`. |

### Storage namespacing

Per-store localStorage adapter routes keys based on the current cloud session:

| Cloud session | Effective key |
|---|---|
| Signed-out | `coach-drills-v2` (and `coach-sessions-v2`, `coach-teams-v1`, …) |
| Signed-in as `<uid>` | `coach-drills-v2:user-<uid>` (and `coach-sessions-v2:user-<uid>`, …) |

Pre-auth local data is therefore **never overwritten** by signing in. Signing out brings it back. This is the load-bearing invariant for the (still-deferred) "import to cloud" flow.

### Per-mutation flow (optimistic UI)

```
1. User edits drill in the canvas.
2. Zustand store action runs synchronously:
     a. set() updates in-memory state.
     b. persist middleware writes the new state to localStorage
        (under the namespaced key).
     c. If a cloud user is present, enqueueDrillUpsert(drillId) is called.
3. The sync queue collapses repeated upserts of the same id to a single
   pending entry (last-write-wins on the client).
4. A microtask drains the queue:
     a. Status flips to 'syncing', pending count published.
     b. For each item, repo.upsertDrill(currentEntity) is awaited.
     c. On success: queue entry removed; on empty queue, status → 'synced'.
     d. On failure: exponential backoff (1s → 2s → 4s → 8s → 16s, capped 30s).
        After 5 attempts the item is dropped with console.error and status
        flips to 'failed'.
```

The editor never awaits the network. Failures don't lose data because the local state already reflects the change.

### Hydration on sign-in

```
1. AuthProvider receives a non-null user from supabase.auth.getUser()
   or onAuthStateChange.
2. setCloudUserId(uid) → cloudSession listeners fire.
3. cloudSyncOrchestrator catches the change and:
     a. Rehydrates every Zustand store from its namespaced localStorage
        (instant snapshot of any cached cloud state from a previous session).
     b. Phase 1 — parent entities hydrate in parallel:
          hydrateTeams, hydrateDrills, hydrateSessions, hydrateFolders,
          hydrateSubcategories, hydrateDrillTemplates.
     c. Phase 2 — FK-dependent children hydrate after parents:
          hydrateSeasonPlans (FK → teams), hydrateCalendar (FKs → teams + sessions).
4. Each hydrate fetches the user's cloud rows (RLS-filtered) and merges
   with the namespaced local snapshot using last-write-wins on `updatedAt`:
     - cloud-only row    → inserted
     - local-only row    → kept AND enqueued for cloud upsert (recovery)
     - both, cloud newer → cloud wins
     - both, local newer → local kept AND enqueued for upsert
5. The `_seeded` flag (where present) is forced to true after hydrate so
   demo seed data never repopulates a fresh cloud account.
```

### Sign-out flow

```
1. signOut() → supabase.auth.signOut() → cloudSession listener fires with null.
2. Orchestrator rehydrates every store from the now-local-only key
   (restoring pre-auth data if any).
3. Each entity sync clears its queue + resets its status entry.
```

### Combined sync status

`cloudSyncStatus.entries` is a map keyed by entity name (`drills`, `sessions`, `seasonPlans`, `folders`, `subcategories`, `teams`, `calendar`, `drillTemplates`). The `SyncStatusIndicator` reads this map and rolls it up with `combineStatuses`:

| Any per-entity status | Combined |
|---|---|
| `failed` | "Sync failed" |
| `offline` (no failed) | "Offline" |
| `syncing` (no failed/offline) | "Syncing… (N)" (N = sum of pending) |
| else | "Synced" |

### Why RLS is the security boundary

The browser holds the **anon** JWT — designed to be public. RLS policies in Postgres enforce `auth.uid() = user_id` on every CRUD verb. A malicious client cannot read another user's rows because:

1. The anon key has no implicit row-level permissions (RLS is on for every user-owned table).
2. The user_id encoded in the JWT is set by Supabase Auth and cannot be tampered with client-side without invalidating the signature.
3. `WITH CHECK (auth.uid() = user_id)` on UPDATE prevents the user_id column from being rewritten to someone else's id.

The service-role key bypasses RLS and **must never** appear in any frontend bundle, `.env.local` file, or version-controlled config.

---

## 6. Setup

### Prerequisites

- Node.js 18+ (Next.js 14 minimum)
- npm 9+
- A Supabase project (for cloud features; local-only works without)
- Supabase CLI (for migrations)

### Install

```bash
git clone <repo>
cd sessionbuilder
npm install
```

### Environment variables

Create `.env.local` (gitignored). Template at `.env.local.example`:

```
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-jwt-from-Settings → API>
```

Both are safe to expose. **Never** add `SUPABASE_SERVICE_ROLE_KEY` to this file.

### Run (web)

```bash
npm run dev           # http://localhost:3000
```

### Build (web)

```bash
npx tsc --noEmit      # type check
npm run build         # production build
npm run start         # serve the production build
```

### Desktop (Electron)

```bash
npm run desktop:dev   # boots Next dev server + Electron window
npm run desktop:build # build + package the Windows installer
npm run desktop:build:mac
```

In production-packaged builds, the Next standalone server is `require()`'d inside Electron's main process on port 3456.

### Vercel deployment

1. Push the repo to GitHub.
2. Import into Vercel (auto-detects Next.js 14).
3. In **Settings → Environment Variables**, set:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. In Supabase **Authentication → URL Configuration**, add the Vercel URL (and `/auth/callback`) to the allowed redirect list.

### Supabase CLI (migrations)

```bash
# one-time
npm install -g supabase
supabase login
supabase link --project-ref <project-ref>   # ref from supabase/config.toml

# apply all migrations
supabase db push

# verify
supabase migration list

# add a new schema change
supabase migration new add_<thing>
# edit the newly-created file under supabase/migrations/
supabase db push
```

Local Supabase stack (optional):

```bash
supabase start        # boots Postgres + Auth + Studio at :54321–54324
supabase stop
```

---

## 7. Development Workflow

### Phase-based development

Feature work is organised into **scope-locked phases**, each ending with a final report. The phase model (see §8) is the source of truth for what's done and what's next. Every phase report documents files changed, behaviours added, RLS verification steps, and what comes next.

### Adding a new cloud-synced entity

1. Add SQL migration under `supabase/migrations/<YYYYMMDDHHMMSS>_<name>.sql` — table + indexes + the four RLS policies.
2. Add the type to `src/types/index.ts`.
3. Add `src/lib/cloud/repositories/<entity>.ts` with `listX`, `getX`, `upsertX`, `deleteX` and a `toRow / fromRow` mapper.
4. Add `src/lib/cloud/<entity>Sync.ts` wiring the repo into `makeEntitySync`.
5. Update `src/store/<entity>Store.ts`:
   - swap `storage` to `makeNamespacedStorage('<root-key>')`
   - gate any `seedIfEmpty` on `!getCloudUserId()`
   - on every mutation, call `if (getCloudUserId()) enqueueXUpsert(id)`
6. Register the new sync in `cloudSyncOrchestrator.ts` (parent or child phase as appropriate for its FK dependencies).
7. Run `npx tsc --noEmit` and `npm run build`.
8. Verify with two accounts that RLS isolates the data.

### Adding a new feature (no new entity)

- Editor changes go in `src/components/drill-editor/` (canvas in `PitchCanvas.tsx`, inspector in `InspectorPanel.tsx`, palette in `PaletteSidebar.tsx`). Be aware: `PitchCanvas.tsx` is 2,100+ lines — keep changes surgical.
- Print changes are scoped per print view; each has its own `<style>` block with `@media print` rules. Never touch one print view's CSS from another route.
- iPad checks: any layout change should still pass the editor-mode test (chrome stripped on tablet) and the safe-area test (no clipping at notch / home-indicator).

### Rules of the road (HARD constraints)

| Rule | Why |
|---|---|
| **Never break local-only mode.** If `isSupabaseConfigured()` is false, the app must behave exactly like the pre-cloud version. | Local-only is the Electron and offline experience. |
| **Never bypass RLS.** All cloud reads/writes go through the repositories, which only use the anon key. | RLS is the security boundary; bypassing it is a security defect. |
| **Never use the service-role key in the browser.** | It bypasses RLS. Use it only for one-off admin scripts run from a developer machine. |
| **Preserve optimistic UI.** Editor interactions must not await the network. | Coaches use the canvas live in front of players — any UI stall is a regression. |
| **Never destroy pre-auth localStorage.** Sign-in must not overwrite the local-only key. | Phase G (import-to-cloud) depends on this invariant. |
| **Migrations are versioned, never ad-hoc.** Every schema change is a timestamped file. | Dev, staging, and prod stay in sync; `supabase db push` is idempotent. |
| **Print views are independent.** Don't share `@media print` rules across them. | One leaked rule will silently break unrelated prints. |
| **Type safety is non-negotiable.** `npx tsc --noEmit` must pass at the end of every phase. | Caught regressions during the cloud refactor. |

### Commit hygiene

- One coherent change per commit. Pre-commit `npm run build` and `npx tsc --noEmit`.
- Don't commit `.env.local` (already gitignored).
- Don't commit screenshots from `/v2/` — that's a research branch; promote it to the main editor before documenting.

---

## 8. Phases & Roadmap

### Completed

- [x] **Phase A — Audit.** Mapped the entire data model (7 Zustand stores, localStorage keys, cross-references, no Supabase or auth wiring yet).
- [x] **Phase B — Supabase scaffolding.** Installed `@supabase/supabase-js` + `@supabase/ssr`. Created browser / server / middleware clients (all safe when env is missing). Built the three SQL migrations (schema + profiles trigger + RLS). Added Supabase CLI config. Middleware refresh in place; no route protection yet.
- [x] **Phase C — Real auth.** Wired `/login`, `/signup`, sign-out. Added `<AuthProvider>` with `onAuthStateChange`. Added route protection in middleware for `/drills`, `/sessions`, `/season-plans`, `/teams`, `/calendar`. `/auth/callback` route handler. NavBar shows user + sign-out only when cloud + signed in. Local-only mode untouched.
- [x] **Phase D — Drills cloud sync.** Introduced `cloudSession`, namespaced storage, drill repo, drill sync queue with retry/backoff, and the sync status indicator. Two-account RLS verification passed. Local-only mode preserved.
- [x] **Phase E — Sessions + season plans + folders + subcategories.** Generalised storage adapter (`cloudStorage.ts`) and sync engine (`syncFactory.ts`). Built `cloudSyncStatus` global store + `combineStatuses` rollup. Centralised auth-state handling in `cloudSyncOrchestrator.ts` (fixed a folder/sub rehydrate race).
- [x] **Phase F — Teams + calendar + drill templates.** Cloud sync extended to the final three domains. Orchestrator now hydrates in two FK-aware phases (parents before season-plans/calendar) so dependent rows can satisfy their FKs server-side. Added optional `updatedAt` / `createdAt` to `CalendarEvent` for proper last-write-wins.

### Pending

- [ ] **Phase G — Local-to-cloud import flow + sync polish.**
  - One-time prompt after first sign-in (when cloud is empty AND local cache exists) → "Import my offline data?"
  - Walk every store's local map and enqueue upserts in the orchestrator's parent-first order.
  - Per-user dismissal flag.
  - Manual retry for entries stuck on `failed`.
  - Persist the write queue across page reloads.
  - Optional: sign-out toast / display-name in NavBar.
- [ ] **Realtime multi-device sync.** Subscribe to Supabase realtime channels per table; reconcile incoming changes with the local queue (conflict resolution required).
- [ ] **OAuth providers.** Google / Apple sign-in.
- [ ] **Storage bucket.** When/if a feature ships that uploads files (team logos, drill photos, video clips).
- [ ] **Team permissions / shared access.** Multi-coach access to a single team or season plan.
- [ ] **Collaboration / live cursors.** Stretch goal.
- [ ] **Subscriptions / payments.** Stripe + Supabase row checks.
- [ ] **Mobile app packaging.** Native shell (Capacitor / Expo / WKWebView wrapper) — current PWA already covers most iPad use cases.
- [ ] **Promote `/v2` editor.** Decide whether to migrate the main editor to the component-per-renderer + command-history architecture sketched in `src/v2/`, or freeze and remove it.

---

## 9. Known Limitations / Technical Debt

| Limitation | Impact | Phase to fix |
|---|---|---|
| No realtime sync between devices | Editing on Device A doesn't appear on Device B until B reloads. | Post-G |
| Cloud write queue is in-memory only | Closing the tab during sync loses the pending upsert (local state is preserved, so it re-syncs on next sign-in via the local-only recovery branch). | G |
| No "Retry" button for failed syncs | User must re-edit the entity to clear "Sync failed". | G |
| Local-to-cloud import not implemented | A user with pre-auth offline data must currently lose it on cloud sign-in. The data is preserved on disk, just unreachable in cloud mode until G ships. | G |
| Cross-table refs inside jsonb are not FK-enforced | `SessionBlock.drillId`, `SeasonPlanEntry.sessionId`, `CalendarEvent.seasonPlanEntryId` can dangle. App-level consistency only. | Stretch — may not be worth fixing |
| Client-clock drift can briefly mislead last-write-wins | A user with a wildly wrong clock can win once during merge. Self-corrects on subsequent server writes (`set_updated_at` trigger). | Stretch |
| Multi-tab same user can race | Tab A's write hits cloud; Tab B's view is stale until reload. | Realtime phase |
| `PitchCanvas.tsx` is 2,100+ lines | Hard to refactor; high risk of regressions. The `/v2/` branch is the current research direction for breaking it up. | When `/v2` matures |
| iPhone editor UX | Not optimised — list pages work, editor is cramped. | Mobile pass |
| `CalendarEvent.type` / `status` only validated at the DB | A client bug could send an unknown value and surface a sync failure. | Stretch |
| Demo seed data is hardcoded English | No i18n yet. | i18n phase |
| No GDPR "export my data" / "delete my account" flow | Required for EU launch. | Pre-launch |
| Session plans require a `team_id` | A plan without a team will exhaust 5 retries with "Sync failed". User must assign a team to recover. | Acceptable; doc'd |

---

## 10. Code Quality Expectations

### Verification gates

Run **both** before considering a change merge-ready:

```bash
npx tsc --noEmit      # zero TypeScript errors
npm run build         # production build succeeds, all routes generate
```

Also test with `.env.local` removed (or env vars unset) to confirm local-only mode still builds and runs.

### TypeScript rules

- No `any` outside narrow casting at module boundaries.
- The `CanvasObject` union is the canonical pattern for polymorphic data.
- Don't widen union types to satisfy a single call site — narrow at the call site instead.
- Old TS target — `Set` iteration needs `forEach` or `Array.from(...)`, not `for…of` (codebase memory).

### React rules

- Editor components are client components (`'use client'` at top of file).
- Konva must be loaded via `next/dynamic({ ssr: false })`.
- Avoid `useEffect` for derived state — prefer `useMemo`.
- Avoid `useState` for values that don't trigger re-renders — use `useRef`.

### Styling rules

- Tailwind only. Inline `style={}` is OK for canvas / print pixel values (mm, pt) that don't fit Tailwind's design tokens.
- Brand colors via `theme.extend.colors.brand` (`brand-orange`, `brand-cyan`, etc.). Use these not raw hex strings.
- Breakpoints: `nav` (sidebar collapse), `desktop` (real-desktop-only chrome). Never use `xl` / `2xl` for tablet detection.

### Print rules

- Each print view owns its own `@media print` rules inside a `<style>` block scoped to that route.
- Global print resets live in `globals.css` (`@media print` overrides AppShell containers).
- Never set `overflow: hidden` on print containers — graceful overflow is preferable to silent clipping.

### Migration rules

- Every schema change is a new timestamped file. **Never edit an applied migration in place.**
- Migrations must be idempotent where reasonable (use `create … if not exists`, `drop policy if exists`, etc.).
- RLS policies must always include `WITH CHECK` on UPDATE so the `user_id` column can't be rewritten to someone else's id.

### Don't-touch list

When making changes outside your phase scope:

- **Don't touch** the editor / canvas system unless your change is explicitly editor work.
- **Don't touch** the iPad layout helpers (`editor-navbar-hide`, `desktop` breakpoint, `safe-pt/pl/…`).
- **Don't touch** print views from unrelated routes.
- **Don't touch** the auth wiring unless your change is auth work.
- **Don't touch** seed data for stylistic reasons — it's tested.

---

## 11. Project Structure Reference

```
sessionbuilder/
├── .env.local                      # (gitignored) Supabase URL + anon key
├── .env.local.example              # template
├── next.config.mjs                 # output: 'standalone' for Electron
├── tailwind.config.ts              # brand colors, breakpoints
├── tsconfig.json
├── package.json
├── electron/
│   ├── main.js                     # Electron main process + Next standalone server
│   └── preload.js                  # contextBridge exposing window.electronAPI
├── electron-builder.json5          # Windows / macOS packaging
├── build-assets/                   # icon.ico / icon.icns
├── public/
│   └── field-assets/               # cones, balls, goals (PNG)
├── supabase/
│   ├── config.toml                 # CLI link to remote project
│   ├── README.md                   # CLI workflow
│   └── migrations/
│       ├── 20260513120000_init_schema.sql
│       ├── 20260513120100_profiles_trigger.sql
│       └── 20260513120200_rls_policies.sql
└── src/
    ├── middleware.ts               # auth cookie refresh + route protection
    ├── types/index.ts              # every domain type
    ├── app/                        # App Router routes (see §3)
    ├── components/                 # UI (see §3)
    ├── store/                      # 7 Zustand stores
    └── lib/
        ├── supabase/
        │   ├── client.ts           # browser client + isSupabaseConfigured
        │   ├── server.ts           # server-component client
        │   └── middleware.ts       # session refresh + route protection helper
        ├── auth/
        │   └── AuthProvider.tsx    # user, loading, cloudEnabled, signOut
        ├── cloud/                  # cloud sync (see §5)
        │   ├── cloudSession.ts
        │   ├── cloudStorage.ts
        │   ├── drillStorage.ts
        │   ├── cloudSyncStatus.ts
        │   ├── syncFactory.ts
        │   ├── cloudSyncOrchestrator.ts
        │   ├── drillSync.ts
        │   ├── sessionSync.ts
        │   ├── seasonPlanSync.ts
        │   ├── folderSync.ts
        │   ├── teamSync.ts
        │   ├── calendarSync.ts
        │   ├── drillTemplateSync.ts
        │   └── repositories/
        │       ├── drills.ts
        │       ├── sessions.ts
        │       ├── seasonPlans.ts
        │       ├── folders.ts
        │       ├── teams.ts
        │       ├── calendar.ts
        │       └── drillTemplates.ts
        ├── seed.ts                 # buildSeedDrills / Sessions / Teams
        ├── storage.ts              # SSR-safe localStorage helper (pre-cloud, still used)
        ├── desktop.ts              # typed Electron IPC bridge
        ├── fieldAssets.ts          # /public/field-assets/ paths
        ├── sessionQuality.ts       # session-quality heuristics
        └── drillTemplateObjects.ts # built-in template canvas objects
```

---

## Appendix: Quick reference for AI assistants

If you are an AI coding assistant being onboarded to this codebase, read in this order:

1. `src/types/index.ts` — every domain shape.
2. `supabase/migrations/20260513120000_init_schema.sql` — every DB table.
3. `src/lib/cloud/cloudSyncOrchestrator.ts` — the cloud-sync flow.
4. `src/lib/cloud/syncFactory.ts` — the queue / retry / hydrate semantics.
5. `src/store/drillsStore.ts` — the per-mutation enqueue pattern (mirrored in every other store).
6. `src/components/AppShell.tsx` + `src/lib/auth/AuthProvider.tsx` — how the React tree is wired.
7. `src/middleware.ts` — route protection.

Then pick the feature area you're working on:
- Canvas / drawing → `src/components/drill-editor/PitchCanvas.tsx` (large file; navigate by object type).
- Print → the relevant view in `src/components/views/` or `src/components/season-plans/`.
- Cloud sync for a new entity → §7 "Adding a new cloud-synced entity".

**Hard constraints to respect** (also enumerated in §7):

1. Local-only mode must remain functional when Supabase env vars are missing.
2. RLS is the security boundary — never bypass it; never expose service-role keys.
3. Editor interactions must remain optimistic — no awaiting the network from the canvas.
4. Pre-auth localStorage is never destroyed by signing in.
5. Migrations are immutable once applied — schema changes are new files.
6. `npx tsc --noEmit` and `npm run build` must pass before any phase ships.
