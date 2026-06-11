# Health Assistant OS Database Migration

This folder starts the move from Google Sheets to PostgreSQL while keeping the current app usable.

## Recommended target

- PostgreSQL provider: Supabase, Neon, Vercel Postgres, or Google Cloud SQL.
- First choice for this app: Supabase PostgreSQL in a nearby region such as Singapore.
- Frontend/API stays on Vercel.
- Browser code must not connect to PostgreSQL directly. All database access should go through Vercel API routes.

## Files

- `migrations/001_core_identity_notifications.sql`  
  Phase 1 schema for login, users, work profiles, remembered devices, notifications, audit logs, settings, resources, and attachments.

- `docs/import-map-phase-1.md`  
  Mapping from current Google Sheet columns to PostgreSQL columns.

- `docs/sheet-inventory-2026-05-29.md`  
  Snapshot of the attached workbook and loading-risk notes.

## Environment variables for Vercel

Keep secrets in Vercel Project Settings. Do not paste real values into source files.

```text
DATABASE_URL=postgresql://...
PGSSLMODE=require
HAOS_POSTGRES_PHASE1_ENABLED=false
HAOS_POSTGRES_AUTH_ENABLED=false
HAOS_POSTGRES_NOTIFICATIONS_ENABLED=false
HAOS_POSTGRES_STRICT=false
GAS_WEB_APP_URL=https://script.google.com/macros/s/.../exec
GAS_API_SECRET=...
```

## Phase 1 import

Generate the data import SQL from the latest workbook. The script hashes PINs before writing SQL.

```powershell
$PY="C:\Users\Worawong\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
& $PY scripts\export_phase1_sql.py --workbook "AI Assistant OS (29-5-69).xlsx" --dry-run
& $PY scripts\export_phase1_sql.py --workbook "AI Assistant OS (29-5-69).xlsx" --output "$env:TEMP\haos_phase1_seed.sql"
```

Then open the generated SQL file, paste it into Supabase SQL Editor, and run it. The generated file contains user/profile/notification/audit data, so do not commit it or upload it publicly.

Expected validation counts from the latest workbook:

```text
users: 14
user_profiles: 18
auto_login_devices: 2
notifications: 74
audit_logs: 606
```

## Hybrid API flags

The Vercel API now supports PostgreSQL for selected phase-1 functions while preserving Apps Script fallback.

- Keep all PostgreSQL flags `false` until the import SQL has run successfully.
- Start with `HAOS_POSTGRES_AUTH_ENABLED=true` to test login/profile/remembered-device against PostgreSQL.
- Keep `HAOS_POSTGRES_NOTIFICATIONS_ENABLED=false` at first. Notification creation still happens inside Apps Script for many modules, so enabling DB notification reads too early can make new notifications look missing.
- Set `HAOS_POSTGRES_STRICT=true` only during debugging if you want Postgres errors returned instead of falling back to Apps Script.

## Rollout plan

1. Create a PostgreSQL project.
2. Run `migrations/001_core_identity_notifications.sql`.
3. Generate phase-1 import SQL from the latest workbook and run it in Supabase SQL Editor.
4. Validate counts and duplicate constraints.
5. Add Vercel API routes for login, active profile, remembered device, notifications, and audit logs.
6. Switch only the login/notification paths to PostgreSQL.
7. Keep the rest of the app on Google Sheets until each module is migrated and verified.

## Safety rules

- Keep Google Sheets as the source of truth until PostgreSQL login is verified with real users.
- Never store the old plain PIN in PostgreSQL; hash it during import.
- Keep `AuditLogs` unless a formal retention policy exists.
- Use preview/dry-run for cleanup before deleting rows from the sheet.
- Move one module at a time and keep rollback simple.
