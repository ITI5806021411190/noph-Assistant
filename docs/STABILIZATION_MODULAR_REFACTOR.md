# Health Assistant OS Stabilization + Modular Refactor

Last updated: 2026-06-12

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
- Schedule/workspace stabilization foundations added:
  - `assets/js/modules/schedule-core.js`
  - `assets/js/modules/schedule-view.js`
  - `assets/js/modules/schedule-public-link.js`
  - `assets/js/modules/shared-workspace-core.js`
  - `assets/js/modules/shared-workspace-export.js`
  - `assets/js/modules/shared-workspace-flow.js`
  - `assets/js/modules/shared-workspace-builder.js`
  - `assets/css/shared-workspace-flow.css`

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

Status: in progress.

Completed in v70.69:

- Added `HAOS.schedule` / `HAOSScheduleCore` as a central read/query facade for schedule data.
- Added `HAOS.workspace` / `HAOSWorkspaceCore` as a central schema, field, flow, response, and export facade for shared workspace data.
- Kept old global UI functions untouched. The new core modules are additive and can be disabled by removing their script tags.
- Added diagnostics:
  - `haosScheduleDiagnosticsV769()`
  - `haosWorkspaceDiagnosticsV769()`
- Added `Workspace Flow JSON` metadata in Apps Script during the previous v70.68 flow step; it is additive and does not alter existing rows unless a form uses Smart Flow.

Tasks:

- Create a module extraction manifest from the audit results.
- Identify function names that are duplicated in backend and confirm which latest definition wins.
- Add one central frontend utility shim for safe `user`, `gas`, `esc`, `cleanPhone`, and `toast` helpers.
- Move schedule list filtering/sorting/pagination callers to `HAOS.schedule.query`.
- Move shared workspace field parsing/export callers to `HAOS.workspace`.
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

Rollback for v70.69:

1. Remove these script tags from `index.html`:
   - `assets/js/modules/schedule-core.js`
   - `assets/js/modules/shared-workspace-core.js`
2. Remove `assets/js/modules/shared-workspace-core.js` from `public.html`.
3. Remove both new paths from `sw.js` and bump the cache name.
4. No database rollback is required for the v70.69 core facade because it does not write data.

Completed in v70.70:

- Added `assets/js/modules/schedule-view.js` as the final schedule renderer compatibility layer.
- The unified schedule list/card/calendar now reads through `HAOS.schedule.query`, so filtering, sorting, pagination, scope legend buttons, pinning, and calendar events share the same data path.
- Existing global callers remain compatible:
  - `renderUnifiedScheduleV702()`
  - `setUnifiedScheduleViewV702(mode)`
  - `setSchedulePageV739(page)`
  - `toggleSchedulePinV737(id)`
- Google Apps Script and database structure are unchanged in this step.

Rollback for v70.70:

1. Remove `assets/js/modules/schedule-view.js` from `index.html`.
2. Remove `assets/js/modules/schedule-view.js` from `sw.js` and bump the cache name.
3. Keep `schedule-core.js` if v70.69 was already tested successfully; remove it only if rolling back the whole stabilization foundation.
4. No database rollback is required.

Completed in v70.71:

- Added `assets/js/modules/shared-workspace-export.js` as the final response export compatibility layer.
- Excel export now uses `HAOS.workspace` field/row helpers where available and keeps every exported cell as text, preserving leading zeroes in phone numbers, IDs, and codes.
- Existing export buttons remain compatible through `exportWorkspaceResponsesV737(kind, orientation)`.
- Non-Excel exports still fall back to the existing inline PDF/PNG exporter.
- Google Apps Script and database structure are unchanged in this step.

Rollback for v70.71:

1. Remove `assets/js/modules/shared-workspace-export.js` from `index.html`.
2. Remove `assets/js/modules/shared-workspace-export.js` from `sw.js` and bump the cache name.
3. The older inline `haos-v70-67-workspace-xlsx-export` block will resume handling Excel export.
4. No database rollback is required.

Completed in v70.72:

- Added `assets/js/modules/shared-workspace-builder.js` as the final shared workspace create/edit builder compatibility layer.
- The builder now normalizes `fieldConfig`, `columns`, choice options, required flags, quiz scoring metadata, and Smart Flow metadata before create/edit requests are sent.
- Dropdown, Radio, and Checkbox labels are reinforced as Thai labels with English terms in parentheses, while existing duplicate-field and answer-pick controls remain compatible.
- Existing global callers remain compatible:
  - `getWorkspaceCreatePayload()`
  - `openWorkspaceCreateModal()`
  - `syncWorkspaceBuilderV728()`
  - `openWorkspaceConfigEditorV737(id)`
  - `updateSharedWorkspaceConfigV737`
- Google Apps Script and database structure are unchanged in this step.

Rollback for v70.72:

1. Remove `assets/js/modules/shared-workspace-builder.js` from `index.html`.
2. Remove `assets/js/modules/shared-workspace-builder.js` from `sw.js` and bump the cache name.
3. The older inline builder/quiz/flow patch blocks will resume handling create/edit payloads.
4. No database rollback is required.

Completed in v70.73:

- Added `assets/js/modules/schedule-public-link.js` to stabilize public schedule link creation.
- `createPublicScheduleLink(callback)` now has a 25-second timeout, failure handler, and a clear error message instead of an endless loading popup.
- Added a lighter Apps Script override for `getSchedulePublicUrlServer`, which reads only the schedule ID column before writing public-link metadata.
- The returned public URL now points directly to `/public?publicId=...` instead of relying on an extra redirect through `/api/share`.

Rollback for v70.73:

1. Remove `assets/js/modules/schedule-public-link.js` from `index.html`.
2. Remove `assets/js/modules/schedule-public-link.js` from `sw.js` and bump the cache name.
3. Remove the `v70.73 schedule public link performance override` block from `Code.gs.txt`.
4. No database rollback is required because this change only writes the same public-link fields as the previous implementation.

Completed in v70.74:

- Upgraded schedule public-link handling with `getSchedulePublicLinkStatus(scheduleId, ownerPhone)`.
- The schedule detail popup now gets a `ดูลิงก์สาธารณะ` action that can show/copy/open the current public URL and verify its enabled/expired status when Apps Script responds.
- `getSchedulePublicUrlServer` now uses a `TextFinder` row lookup and skips audit logging during the hot path to reduce timeout risk.
- Frontend timeout was raised to 45 seconds and now falls back to showing the deterministic public URL instead of blocking the user.

Rollback for v70.74:

1. Restore `assets/js/modules/schedule-public-link.js` to the previous v70.73 version, or remove it to return to the inline implementation.
2. Remove the `v70.74 schedule public link status + faster TextFinder path` block from `Code.gs.txt`.
3. Remove `getSchedulePublicLinkStatus` from bridge whitelist if rolling back manually.
4. No database rollback is required.

Completed in v70.75:

- Added a shared `กลับเข้าสู่ระบบหลัก` action for every `public.html` route.
- The button is loaded from `assets/js/modules/public-portal.js` and styled by `assets/css/public-portal.css`.
- The module watches for public pages that replace `document.body.innerHTML` and re-adds the button automatically.
- No Apps Script or database changes are required.

Rollback for v70.75:

1. Remove `assets/js/modules/public-portal.js` and `assets/css/public-portal.css`.
2. Remove their includes from `public.html`.
3. Remove both files from `sw.js` and bump the cache name.
4. No database rollback is required.

Rolled back in v70.77:

- Removed `assets/js/modules/session-restore.js` because the last-workspace restore experiment made auto-login slower in production testing.
- Removed the script include from `index.html`.
- Removed the file from `sw.js` and bumped the service worker cache to `haos-v70-77-auto-login-fast-rollback` so browsers drop the old cached module.
- No Apps Script or database rollback is required.

Added in v70.78:

- Added `assets/js/modules/meeting-minutes-audio-safe.js` after `meeting-minutes.js`.
- The module guards every `analyzeMeetingAudio` call, checks audio duration before direct AI upload, splits longer audio into short browser-side WAV chunks, and translates Out of Memory failures into user-facing guidance.
- Added an Apps Script guard around `analyzeMeetingAudio` in `Code.gs.txt` so old cached clients cannot send oversized audio payloads directly to Gemini.
- Bumped `sw.js` cache to `haos-v70-78-meeting-minutes-audio-safe`.

Extended in v70.79:

- Large meeting-minutes audio over 28 MB now enters the browser splitter/analyzer flow automatically from the create-meeting-minutes popup; users can wait in the same popup instead of opening the splitter tool manually.
- The standalone audio splitter adds "queue part", "queue all", "open meeting form", and "clear results" actions.
- Time-based splitting asks whether the value is seconds or minutes before processing.
- Bumped `sw.js` cache to `haos-v70-79-meeting-minutes-audio-queue`.

Rollback for v70.78-v70.79:

1. Remove the `meeting-minutes-audio-safe.js` script include from `index.html`.
2. Remove `assets/js/modules/meeting-minutes-audio-safe.js`.
3. Remove the file from `sw.js` and bump the cache name.
4. Remove the v70.78 Meeting minutes audio guard block from the end of `Code.gs.txt` and redeploy Apps Script.
5. No database rollback is required.

Extended in v70.81:

- Added `assets/js/modules/meeting-minutes-ai-modes.js` after the audio-safe layer.
- The meeting-minutes raw text analyzer now shows three user-selectable modes: Auto, Concise, and Detailed.
- Apps Script `analyzeMeetingMinutesText` now accepts an optional mode argument and uses a stronger meeting-minutes prompt that preserves the original JSON schema while allowing longer official-style summaries.
- The Gemini payload wrapper raises text output tokens only for the meeting-minutes AI mode markers, so unrelated AI features keep their existing limits.
- Bumped `sw.js` cache to `haos-v70-81-meeting-minutes-ai-modes`.

Rollback for v70.81:

1. Remove the `meeting-minutes-ai-modes.js` script include from `index.html`.
2. Remove `assets/js/modules/meeting-minutes-ai-modes.js`.
3. Remove the file from `sw.js` and bump the cache name.
4. Remove the v70.81 Meeting minutes text analysis modes block from the end of `Code.gs.txt` and redeploy Apps Script.
5. No database rollback is required.

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
