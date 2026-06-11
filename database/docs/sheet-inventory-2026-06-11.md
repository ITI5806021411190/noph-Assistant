# Health Assistant OS Sheet Inventory

Generated: 2026-06-11T08:35:04.408184+00:00
Source workbook: local private backup `AI Assistant OS (present).xlsx` inspected before workspace cleanup. The workbook file was removed from this workspace after the inventory was generated so real database exports do not go to GitHub.

## Sheet summary

| Sheet | Declared rows | Non-empty rows | Blank tail | Columns | Duplicate headers |
| --- | ---: | ---: | ---: | ---: | --- |
| Schedules | 36 | 31 | 5 | 27 | - |
| RemoteSupportFrames | 4 | 4 | 0 | 13 | - |
| RemoteSupportSignals | 27 | 27 | 0 | 9 | - |
| RemoteSupportEvents | 94 | 94 | 0 | 8 | - |
| RemoteSupportSessions | 7 | 7 | 0 | 25 | - |
| PasswordResetOtp | 3 | 3 | 0 | 9 | - |
| ITBookingChangeRequests | 1 | 1 | 0 | 13 | - |
| AutoLoginDevices | 5 | 5 | 0 | 12 | - |
| UserProfiles | 41 | 21 | 20 | 16 | - |
| PinChangeRequests | 27 | 5 | 22 | 13 | - |
| ITRepairDocuments | 4 | 4 | 0 | 53 | - |
| EMeetingLiveState | 2 | 2 | 0 | 7 | - |
| InviteLinks | 6 | 6 | 0 | 10 | - |
| EMeetingActionItems | 1 | 1 | 0 | 10 | - |
| EMeetingDocuments | 3 | 3 | 0 | 10 | - |
| EMeetingParticipants | 10 | 10 | 0 | 16 | - |
| EMeetingAgenda | 4 | 4 | 0 | 15 | - |
| EMeetingMaster | 3 | 3 | 0 | 23 | - |
| ITRepairUpdates | 12 | 12 | 0 | 8 | - |
| HelpChatMessages | 30 | 5 | 25 | 8 | - |
| HelpChatSessions | 29 | 5 | 24 | 9 | - |
| HelpSupportContacts | 27 | 2 | 25 | 6 | - |
| ITRepairTickets | 4 | 4 | 0 | 26 | - |
| ITAssetSoftwareMap | 1 | 1 | 0 | 13 | - |
| ITLicenses | 1 | 1 | 0 | 19 | - |
| ITSoftware | 1 | 1 | 0 | 10 | - |
| ITAssets | 1 | 1 | 0 | 29 | - |
| PermissionMatrix | 11 | 11 | 0 | 7 | - |
| BackupLogs | 2 | 2 | 0 | 6 | - |
| MeetingMinutes | 3 | 3 | 0 | 17 | - |
| ITBookings | 11 | 11 | 0 | 38 | - |
| LiveOpinionResponses | 14 | 14 | 0 | 7 | - |
| LiveOpinionSurveys | 2 | 2 | 0 | 13 | - |
| CollaborativeWorkspaces | 26 | 26 | 0 | 24 | - |
| WorkTags | 13 | 13 | 0 | 6 | - |
| ErrorLogs | 4 | 4 | 0 | 8 | - |
| WorkStatuses | 6 | 6 | 0 | 6 | - |
| Attachments | 1 | 1 | 0 | 8 | - |
| Settings | 4 | 4 | 0 | 4 | - |
| ApprovalHistory | 1 | 1 | 0 | 6 | - |
| RecurringRules | 2 | 2 | 0 | 19 | - |
| AuditLogs | 857 | 857 | 0 | 10 | - |
| Notifications | 189 | 189 | 0 | 14 | - |
| DailyReports | 42 | 17 | 25 | 11 | - |
| Users | 39 | 17 | 22 | 19 | - |
| Resources | 5 | 5 | 0 | 3 | - |

## Cleanup candidates

- `ITBookingChangeRequests`: empty or header-only sheet
- `UserProfiles`: blank tail 20 rows
- `PinChangeRequests`: blank tail 22 rows
- `EMeetingActionItems`: empty or header-only sheet
- `HelpChatMessages`: blank tail 25 rows
- `HelpChatSessions`: blank tail 24 rows
- `HelpSupportContacts`: blank tail 25 rows
- `ITAssetSoftwareMap`: empty or header-only sheet
- `ITLicenses`: empty or header-only sheet
- `ITSoftware`: empty or header-only sheet
- `ITAssets`: empty or header-only sheet
- `Attachments`: empty or header-only sheet
- `ApprovalHistory`: empty or header-only sheet
- `DailyReports`: blank tail 25 rows
- `Users`: blank tail 22 rows

## Guardrail

- This script is read-only. Use the output as a dry-run report before any database cleanup.
- Do not delete `AuditLogs`, user, profile, schedule, notification, or active module sheets without a dated workbook backup.
