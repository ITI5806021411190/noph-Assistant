# Health Assistant OS Stabilization + Modular Refactor

Last updated: 2026-06-11

## Goal

Make the current Health Assistant OS stable, faster, cleaner, and easier to sell as a monthly service without starting a new v2 rewrite.

This plan keeps the existing production behavior first. Refactor work must be incremental, measurable, and reversible.

## Current Snapshot

Generated audit files:

- `docs/source-audit-2026-06-11.md`
- `database/docs/sheet-inventory-2026-06-11.md`

First module extraction:

- External Organizations moved from inline `index.html` patch block to:
  - `assets/js/modules/external-organizations.js`
  - `assets/css/admin-external-organizations.css`

Key findings:

- `index.html` has about 19k lines and contains many accumulated patch blocks.
- `Code.gs.txt` has about 14k lines and multiple repeated backend helper/service implementations.
- The frontend currently has 76 inline script blocks and 53 inline style blocks.
- Backend source has 776 named functions.
- Workbook inventory found no duplicate headers in the current export.
- Cleanup candidates are mostly blank trailing rows and header-only module sheets, not broken core data.

## Hard Safety Rules

1. Do not delete production data during refactor work.
2. Every database cleanup must support dry-run output before real cleanup.
3. Keep `Users`, `UserProfiles`, `Schedules`, `Notifications`, `AuditLogs`, `DailyReports`, and active module sheets intact unless a dated workbook backup exists.
4. Keep existing global function names stable until a module is proven after extraction.
5. Deploy frontend and Apps Script changes independently only when their compatibility is clear.
6. Prefer additive wrappers and compatibility facades before replacing old functions.
7. Never run destructive sheet cleanup from source-control changes alone; cleanup must be triggered by Super Admin with preview.

## Rollback Model

Frontend rollback:

- Restore the previous `index.html` deployment in Vercel/GitHub.
- Keep extracted module files unused until the loader path is proven.
- Any first extraction must leave the old inline code callable or wrapped.

Apps Script rollback:

- Restore the previous `Code.gs.txt` in Google Apps Script.
- Do not change sheet structure in the same deploy as backend refactor unless the migration is dry-run only.

Database rollback:

- Copy the Google Sheet workbook before any real cleanup.
- For cleanup tools, store a preview summary before applying changes.
- Keep a cleanup audit entry with actor phone, timestamp, sheet, row counts, and affected entity IDs.

## Phase 0: Inventory Baseline

Status: started.

Completed:

- Added `scripts/haos_source_audit.mjs`.
- Added `scripts/haos_sheet_inventory.py`.
- Generated current source and sheet inventory snapshots.
- Extracted the External Organizations frontend patch into standalone asset files while keeping the same `window.*` function names.

How to rerun:

```powershell
& "C:\Users\Worawong\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" scripts\haos_source_audit.mjs --output docs\source-audit-latest.md
& "C:\Users\Worawong\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" scripts\haos_sheet_inventory.py --workbook "AI Assistant OS (present).xlsx" --output database\docs\sheet-inventory-latest.md
```

## Phase 1: Stabilize Without Behavior Change

Purpose: reduce risk before splitting files.

Tasks:

- Create a module extraction manifest from the audit results.
- Identify function names that are duplicated in backend and confirm which latest definition wins.
- Add one central frontend utility shim for safe `user`, `gas`, `esc`, `cleanPhone`, and `toast` helpers.
- Add one backend read helper strategy for high-use sheets:
  - Users
  - UserProfiles
  - Notifications
  - Schedules
  - Settings
- Add server-side pagination/filtering where UI already supports it.

Do not:

- Change visual layout.
- Delete old functions.
- Rename sheet columns.
- Move large blocks out of `index.html` yet.

## Phase 2: Extract CSS First

Purpose: reduce `index.html` size with the lowest runtime risk.

Recommended order:

1. Extract isolated late CSS patch blocks.
2. Extract shared utility/UI card styles.
3. Extract module styles:
   - Schedule
   - IT Services Hub
   - Shared Workspace
   - Notification Center
   - Admin tools
   - Remote Support

Target structure:

```text
assets/
  css/
    base.css
    dashboard.css
    schedule.css
    it-services.css
    shared-workspace.css
    notification.css
    admin.css
    remote-support.css
```

Rollback:

- Keep the old inline style block for the first extraction behind a comment until verified.
- If a visual regression appears, restore the previous `index.html` only.

## Phase 3: Extract JavaScript Modules

Purpose: make feature code maintainable without changing behavior.

Recommended order:

1. Remote Support AnyDesk entry
2. External Organizations
3. Notification Center polish/action handlers
4. Meeting Minutes
5. Schedule view controls
6. Shared Workspace builder/viewer
7. Admin tools

Target structure:

```text
assets/
  js/
    core/
      gas-client.js
      state.js
      format.js
      modal.js
    modules/
      remote-support.js
      external-organizations.js
      notifications.js
      schedules.js
      shared-workspace.js
      it-services.js
      admin-users.js
```

Compatibility rule:

- Export functions to `window.*` while old inline callers still exist.
- Extract one module at a time and verify login, dashboard, and the module itself.

## Phase 4: Backend Service Layer

Purpose: reduce Apps Script duplication and speed up frequently loaded features.

Target structure inside `Code.gs.txt` first:

```text
Core helpers
Schema helpers
UserService
ProfileService
NotificationService
ScheduleService
ITBookingService
SharedWorkspaceService
AdminService
```

Rules:

- Add new helper functions first.
- Point only one high-traffic read path to the helper.
- Keep old public API names as wrappers.
- Cache settings and small dictionaries where safe.
- Avoid `getDataRange()` for large sheets when the query can be narrowed.

First backend candidates:

- `getNotificationCenter`
- schedule list readers
- user/profile directory readers
- admin user management data

## Phase 5: Database Cleanup Dry-Run

Purpose: clean Google Sheet without data loss.

Current cleanup candidates from 2026-06-11 inventory:

- Blank tail rows:
  - `Users`: 22
  - `UserProfiles`: 20
  - `DailyReports`: 25
  - `PinChangeRequests`: 22
  - `HelpChatMessages`: 25
  - `HelpChatSessions`: 24
  - `HelpSupportContacts`: 25
- Header-only sheets that may be valid but should be classified:
  - `ITBookingChangeRequests`
  - `EMeetingActionItems`
  - `ITAssetSoftwareMap`
  - `ITLicenses`
  - `ITSoftware`
  - `ITAssets`
  - `Attachments`
  - `ApprovalHistory`

Cleanup rule:

- Header-only sheets should not be deleted automatically. They may be empty because the module is installed but not used yet.
- Blank tail trimming is safe only after backup and dry-run count confirmation.

## Phase 6: Commercial Readiness

Purpose: prepare the system for monthly paid use by other offices.

Required before selling:

- Tenant/organization separation plan.
- License/activation settings per office.
- Backup and restore workflow per customer.
- Admin audit log export.
- Error log dashboard.
- Minimal SLA checklist.
- Documentation for deployment and support.
- Privacy/PDPA checklist.

Google Sheet can remain for early customers, but commercial scale should plan a future tenant-aware database.

## Definition of Done For Each Refactor Step

Every step must include:

- Source audit still runs.
- `index.html` script parse passes.
- `Code.gs.txt` parse passes.
- Login still works.
- Super Admin user management still works.
- The touched module works.
- Rollback path is written down if database or deployment changes are involved.
