# Google Sheet Inventory Snapshot

Source workbook: `D:\Work Public Health Office\Google app script\Health Assistant OS\AI Assistant OS (29-5-69).xlsx`

Snapshot date: 2026-05-29

## Loading risk found

The latest workbook is much cleaner than the previous export. The formerly expanded 900-1000 row ranges have mostly been trimmed down. A few sheets still keep about 19-25 blank trailing rows, but this is no longer the main login bottleneck.

| Sheet | Declared rows | Non-empty rows | Blank tail |
| --- | ---: | ---: | ---: |
| Users | 39 | 15 | 24 |
| UserProfiles | 41 | 19 | 22 |
| AutoLoginDevices | 3 | 3 | 0 |
| Notifications | 94 | 75 | 19 |
| Schedules | 39 | 18 | 21 |
| DailyReports | 42 | 17 | 25 |
| PinChangeRequests | 27 | 2 | 25 |
| HelpChatMessages | 30 | 5 | 25 |
| HelpChatSessions | 29 | 4 | 25 |
| HelpSupportContacts | 27 | 2 | 25 |
| AuditLogs | 607 | 607 | 0 |

No duplicate headers were found in the latest workbook. `Users` now has a single `Active Profile ID` header.

## Phase 1 data checks

| Check | Result |
| --- | --- |
| Core sheets present | Passed: Users, UserProfiles, AutoLoginDevices, Notifications, AuditLogs, Schedules, DailyReports, ITBookings |
| Users | 14 data rows, no blank phone/PIN/name, no duplicate phone; one row has blank Account Status and should be normalized to Active during import |
| UserProfiles | 18 data rows, 15 active, no blank phone/department/profile ID |
| Profile duplicates | No active duplicate profile keys found |
| Primary profiles | No user has more than one active primary profile |
| Active profile coverage | No active user is missing an active profile |
| AutoLoginDevices | 2 rows, 2 active, no blank token hash |
| Notifications | 74 rows, 52 unread, no blank notification ID or target phone |
| Notification module/action | Columns exist, but 68 old rows still have blank Module/Action and should be backfilled or derived during import |
| AuditLogs | 606 data rows, no blank audit ID |

## Phase priority

| Priority | Sheets | Reason |
| --- | --- | --- |
| 1 | Users, UserProfiles, AutoLoginDevices | Login path, active profile, remembered device. |
| 1 | Notifications, AuditLogs | Loaded often and grows continuously. |
| 2 | Schedules, DailyReports, ITBookings | Main workflow data and dashboard counts. |
| 3 | ITRepairTickets, ITRepairUpdates, ITRepairDocuments, ITAssets, ITSoftware, ITLicenses | IT Services Hub module data. |
| 4 | EMeetingMaster, EMeetingAgenda, EMeetingParticipants, EMeetingDocuments, EMeetingActionItems | e-Meeting module. |
| 5 | HelpChatSessions, HelpChatMessages, CollaborativeWorkspaces, LiveOpinionSurveys | Collaboration and support modules. |

## Immediate cleanup before full migration

These are safe candidates for the existing Super Admin database repair tool, using dry-run/preview first:

- Optional: trim the remaining 19-25 trailing blank rows in `Users`, `UserProfiles`, `DailyReports`, `Notifications`, `Schedules`, `PinChangeRequests`, and `HelpChat*`.
- Backfill `Module` and `Action` for old notification rows, or derive them from `Type` during PostgreSQL import.
- Archive old read notifications after confirming the retention window.
- Keep `AuditLogs`; do not delete unless the organization sets a retention rule.
- Keep empty-but-used module sheets because the code creates and expects them.
