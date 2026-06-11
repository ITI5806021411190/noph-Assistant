# Health Assistant OS Module Extraction Manifest

Last updated: 2026-06-11

## Current Extraction Status

| Module | Status | Files |
| --- | --- | --- |
| External Organizations | Extracted | `assets/js/modules/external-organizations.js`, `assets/css/admin-external-organizations.css` |

This manifest controls the order for splitting `index.html` without changing production behavior.

## Extraction Strategy

Start with the smallest isolated modules. Keep every existing `window.*` public function compatible until the old inline callers are gone.

## Priority 1: Low-risk isolated modules

| Module | Current source area | Proposed file | Reason |
| --- | --- | --- | --- |
| External Organizations | `haos-v70-60-external-orgs-*` | `assets/js/modules/external-organizations.js` and `assets/css/admin-external-organizations.css` | Extracted first because it is small, recent, and isolated to Super Admin + registration dropdowns. |
| Remote Support AnyDesk entry | `haos-v70-58-remote-support-anydesk-entry-*` and `remote.html` | `assets/js/modules/remote-support.js` and `assets/css/remote-support.css` | Already a mostly standalone flow. |
| Meeting Minutes polish | `haos-v70-59-remote-minutes-schedule-polish-*` portions related to minutes | `assets/js/modules/meeting-minutes.js` | Has clear UI entry points and can be tested independently. |

## Priority 2: Medium-risk UI modules

| Module | Proposed file | Notes |
| --- | --- | --- |
| Notification Center | `assets/js/modules/notifications.js` | Preserve existing `openNotificationCenter`, action handlers, pagination, and filters. |
| Schedule view controls | `assets/js/modules/schedules.js` | Needs careful testing because many dashboard buttons call schedule functions. |
| Shared Workspace builder/viewer | `assets/js/modules/shared-workspace.js` | Large and feature-rich; extract after core helpers are stable. |

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
