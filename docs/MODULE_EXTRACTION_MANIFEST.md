# Health Assistant OS Module Extraction Manifest

Last updated: 2026-06-12

## Current Extraction Status

| Module | Status | Files |
| --- | --- | --- |
| External Organizations | Extracted | `assets/js/modules/external-organizations.js`, `assets/css/admin-external-organizations.css` |
| Remote Support AnyDesk entry | Extracted | `assets/js/modules/remote-support.js`, `assets/css/remote-support.css` |
| Meeting Minutes / Schedule / IT Hub polish | Extracted | `assets/js/modules/meeting-minutes.js`, `assets/css/meeting-minutes.css` |
| Notification Center core/action routing | Extracted | `assets/js/modules/notifications.js`, `assets/js/modules/notifications-action-fix.js`, `assets/css/notifications.css` |
| Program Guide / Onboarding / Default Tabs | Extracted | `assets/js/modules/program-guide.js`, `assets/css/program-guide.css` |
| Schedule Core Stabilizer | Extracted | `assets/js/modules/schedule-core.js` |
| Schedule View Renderer | Extracted | `assets/js/modules/schedule-view.js` |
| Schedule Public Link Stabilizer | Extracted | `assets/js/modules/schedule-public-link.js` |
| Shared Workspace Core Stabilizer | Extracted | `assets/js/modules/shared-workspace-core.js` |
| Shared Workspace Response Export | Extracted | `assets/js/modules/shared-workspace-export.js` |
| Shared Workspace Flow / Section Logic | Extracted | `assets/js/modules/shared-workspace-flow.js`, `assets/css/shared-workspace-flow.css` |
| Shared Workspace Builder Stabilizer | Extracted | `assets/js/modules/shared-workspace-builder.js` |

This manifest controls the order for splitting `index.html` without changing production behavior.

## Extraction Strategy

Start with the smallest isolated modules. Keep every existing `window.*` public function compatible until the old inline callers are gone.

## Priority 1: Low-risk isolated modules

| Module | Current source area | Proposed file | Reason |
| --- | --- | --- | --- |
| External Organizations | `haos-v70-60-external-orgs-*` | `assets/js/modules/external-organizations.js` and `assets/css/admin-external-organizations.css` | Extracted first because it is small, recent, and isolated to Super Admin + registration dropdowns. |
| Remote Support AnyDesk entry | `haos-v70-58-remote-support-anydesk-entry-*` and `remote.html` | `assets/js/modules/remote-support.js` and `assets/css/remote-support.css` | Extracted; keep `remote.html` as the standalone public/staff hub page. |
| Meeting Minutes / Schedule / IT Hub polish | `haos-v70-59-remote-minutes-schedule-polish-*` | `assets/js/modules/meeting-minutes.js` and `assets/css/meeting-minutes.css` | Extracted as one compatibility block because this patch also owns schedule default filters and IT Hub customization helpers. |

## Priority 2: Medium-risk UI modules

| Module | Proposed file | Notes |
| --- | --- | --- |
| Notification Center | `assets/js/modules/notifications.js` | Core/action routing extracted. Advanced filter/card/today-highlight patches remain inline until the next notification pass because they share code with workspace/calendar and later UI polish blocks. |
| Program Guide / Onboarding | `assets/js/modules/program-guide.js` | Extracted. It keeps default IT Services tab ordering and the updated guide/onboarding popups compatible with existing global callers. |
| Schedule view controls | `assets/js/modules/schedule-view.js` | Extracted as a final compatibility renderer that uses `HAOS.schedule.query` while keeping `renderUnifiedScheduleV702`, `setUnifiedScheduleViewV702`, `setSchedulePageV739`, and `toggleSchedulePinV737` callable. |
| Schedule public links | `assets/js/modules/schedule-public-link.js` | Extracted. It wraps `createPublicScheduleLink` with timeout/failure handling and keeps `getPublicScheduleUrl` compatible. |
| Shared Workspace builder/viewer | `assets/js/modules/shared-workspace.js` | Core schema/export helpers now live in `shared-workspace-core.js`; Excel response export lives in `shared-workspace-export.js`; section flow foundation lives in `shared-workspace-flow.js`; builder payload/create/edit stabilization lives in `shared-workspace-builder.js`; move the remaining viewer code after these foundations are stable. |

## Priority 3: Backend-facing admin modules

| Module | Proposed file | Notes |
| --- | --- | --- |
| User management | `assets/js/modules/admin-users.js` | Must preserve Super Admin edit/profile/external organization buttons. |
| Database repair / system tools | `assets/js/modules/admin-system-tools.js` | Keep dry-run mode visible and do not add destructive actions during extraction. |
| Permission / branding / PWA | `assets/js/modules/admin-settings.js` | Lower daily-use priority. |

## Priority 4: Large service modules

| Module | Proposed file | Notes |
| --- | --- | --- |
| IT Services Hub | `assets/js/modules/it-services.js` | Many submodules; split only after UI core is extracted. |
| e-Meeting Manage | `assets/js/modules/emeeting.js` | Has multiple patch generations; audit duplicate handlers first. |
| Help Center / Telegram / chat | `assets/js/modules/help-center.js` | Depends on notification/contact settings. |

## Compatibility Checklist

For each extracted module:

1. Keep the same global function names on `window`.
2. Load the new file after core helper files.
3. Do not remove the old inline block until the extracted module passes tests.
4. Test login, dashboard, module open, create/edit, notification action, and Super Admin access.
5. If broken, disable the external module include and restore the previous inline behavior.

## First Suggested Extraction

External Organizations was used as the first real extraction because it is small and has a simple test path:

1. Open Super Admin user management.
2. Add external organization.
3. Confirm it appears in registration department dropdown.
4. Toggle active/inactive.
5. Confirm non-Super Admin cannot manage it.
