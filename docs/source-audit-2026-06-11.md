# Health Assistant OS Source Audit

Generated: 2026-06-11T10:35:58.900Z

## File sizes

| File | Lines | Characters |
| --- | ---: | ---: |
| index.html | 18334 | 1470185 |
| Code.gs.txt | 14054 | 718037 |
| public.html | 2083 | 201720 |
| remote.html | 470 | 33770 |

## Frontend patch blocks

- Script blocks: 76
- External script files: 14
- Inline script blocks: 62
- Style blocks: 47
- Stylesheet links are not counted as style blocks.

| Kind | ID/source | Line | Lines | Characters |
| --- | --- | ---: | ---: | ---: |
| script | - | 8 | 212 | 12084 |
| script | - | 221 | 31 | 1128 |
| script | https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.0/js/bootstrap.bundle.min.js | 258 | 1 | 105 |
| script | https://cdnjs.cloudflare.com/ajax/libs/sweetalert2/11.10.1/sweetalert2.all.min.js | 259 | 1 | 105 |
| script | https://cdn.jsdelivr.net/npm/fullcalendar@6.1.10/index.global.min.js | 260 | 1 | 92 |
| script | https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js | 262 | 1 | 81 |
| script | https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js | 263 | 1 | 99 |
| script | https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js | 264 | 1 | 86 |
| script | https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js | 265 | 1 | 89 |
| script | https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js | 266 | 1 | 89 |
| style | - | 268 | 590 | 28321 |
| style | haos-v63-v66-style | 863 | 6 | 953 |
| script | - | 2257 | 3469 | 182502 |
| script | - | 5728 | 253 | 19280 |
| script | - | 5983 | 248 | 16292 |
| script | - | 6233 | 195 | 14028 |
| style | - | 6399 | 5 | 234 |
| script | - | 6431 | 332 | 32901 |
| script | - | 6765 | 68 | 23498 |
| script | - | 6835 | 114 | 9290 |
| script | - | 6951 | 126 | 11163 |
| script | - | 7079 | 180 | 9802 |
| script | - | 7261 | 10 | 758 |
| script | - | 7273 | 22 | 1125 |
| style | - | 7299 | 11 | 1219 |
| script | - | 7311 | 139 | 14397 |
| script | haos-v63-v66-script | 7452 | 60 | 9994 |
| style | haos-v68-style | 7518 | 22 | 3525 |
| script | haos-v68-script | 7540 | 110 | 11585 |
| script | - | 7651 | 123 | 5671 |
| script | - | 7776 | 188 | 9822 |
| script | - | 7965 | 352 | 23707 |
| script | - | 8318 | 235 | 12766 |
| style | haos-v68-6-style | 8562 | 8 | 2817 |
| script | haos-v68-6-script | 8570 | 86 | 25488 |
| style | haos-v687-emergency-style | 8659 | 19 | 1513 |
| script | haos-v68-7-real-emergency-fix | 8678 | 109 | 18614 |
| style | haos-v68-8-calendar-public-link-style | 8790 | 6 | 540 |
| script | haos-v68-8-calendar-public-link-fix | 8796 | 68 | 5296 |
| style | haos-v68-9-style | 8872 | 15 | 1948 |
| script | haos-v68-9-tab-calendar-fix | 8887 | 100 | 7774 |
| style | haos-v69-ui-enhancements-style | 8988 | 44 | 5060 |
| script | haos-v69-ui-enhancements-script | 9032 | 277 | 25460 |
| style | - | 9241 | 1 | 667 |
| style | haos-v691-fixes-style | 9310 | 29 | 3293 |
| script | haos-v691-fixes-script | 9339 | 205 | 16712 |
| style | - | 9383 | 1 | 561 |
| style | haos-v692-polish-style | 9545 | 38 | 4037 |
| script | haos-v692-polish-script | 9583 | 169 | 18319 |
| style | haos-v70-it-asset-repair-style | 9753 | 19 | 2155 |
| script | haos-v70-it-asset-repair-script | 9772 | 139 | 28444 |
| style | haos-v70-1-hotfix-style | 9912 | 4 | 173 |
| script | haos-v70-1-hotfix-script | 9916 | 38 | 1514 |
| style | haos-v70-2-ux-style | 9955 | 41 | 4902 |
| script | haos-v70-2-ux-script | 9996 | 281 | 39427 |
| style | haos-v70-3-stability-style | 10278 | 20 | 2077 |
| script | haos-v70-3-stability-script | 10298 | 212 | 28764 |
| style | haos-v70-4-report-public-style | 10510 | 18 | 3596 |
| script | haos-v70-4-report-public-script | 10528 | 43 | 12663 |
| style | haos-v70-6-schedule-tags-files-style | 10571 | 43 | 4724 |
| script | haos-v70-6-schedule-tags-files-script | 10614 | 292 | 20925 |
| style | haos-v70-11-it-permissions-style | 10906 | 8 | 784 |
| script | haos-v70-11-it-permissions-script | 10914 | 104 | 4945 |
| style | haos-v70-12-help-info-schedule-style | 11018 | 43 | 3640 |
| script | haos-v70-12-help-info-schedule-script | 11061 | 165 | 10424 |
| style | haos-v70-13-support-chat-telegram-style | 11226 | 61 | 6601 |
| script | haos-v70-13-support-chat-telegram-script | 11287 | 315 | 33726 |
| style | haos-v70-14-emeeting-style | 11602 | 31 | 3460 |
| script | haos-v70-14-emeeting-script | 11633 | 122 | 25586 |
| style | haos-v70-15-emeeting-style | 11755 | 36 | 4054 |
| script | haos-v70-15-emeeting-script | 11791 | 147 | 25207 |
| style | haos-v70-16-emeeting-style | 11938 | 7 | 587 |
| script | haos-v70-16-emeeting-script | 11945 | 78 | 13129 |
| style | haos-v70-17-emeeting-form-style | 12023 | 17 | 2060 |
| script | haos-v70-17-emeeting-form-script | 12040 | 244 | 20977 |
| style | haos-v70-18-account-email-style | 12284 | 10 | 1118 |
| script | haos-v70-18-account-email-script | 12294 | 211 | 19045 |
| script | haos-v70-19-super-admin-user-edit-script | 12505 | 96 | 9542 |
| script | haos-v70-21-emeeting-thai-label-script | 12601 | 35 | 1825 |
| style | haos-v70-22-itrepair-emeeting-style | 12636 | 18 | 1822 |
| script | haos-v70-22-active-users-emeeting-delete-itrepair-memo-script | 12654 | 220 | 16180 |
| style | haos-v70-23-itrepair-document-workflow-style | 12874 | 23 | 3064 |
| script | haos-v70-23-itrepair-document-workflow-script | 12897 | 141 | 17840 |
| style | haos-v70-27-pin-reset-style | 13038 | 9 | 955 |
| script | haos-v70-27-pin-reset-script | 13047 | 188 | 15706 |
| style | haos-v70-28-workspace-builder-style | 13235 | 11 | 1221 |
| script | haos-v70-28-workspace-builder-script | 13246 | 192 | 12724 |
| style | haos-v70-29-user-profiles-style | 13438 | 13 | 1104 |
| script | haos-v70-29-user-profiles-ui-script | 13451 | 398 | 27945 |
| style | haos-v70-30-db-repair-style | 13849 | 10 | 826 |
| script | haos-v70-30-db-repair-ui-script | 13859 | 119 | 7203 |
| style | haos-v70-31-auto-login-style | 13978 | 8 | 567 |
| script | haos-v70-31-auto-login-ui-script | 13986 | 352 | 18191 |
| script | assets/js/modules/notifications.js | 14339 | 1 | 58 |
| script | assets/js/modules/program-guide.js | 14341 | 1 | 58 |
| script | assets/js/modules/notifications-action-fix.js | 14342 | 1 | 69 |
| style | haos-v70-35-workspace-permissions-style | 14343 | 22 | 2828 |
| script | haos-v70-35-workspace-permissions-script | 14365 | 406 | 26806 |
| style | haos-v70-36-workspace-option-builder-style | 14771 | 11 | 1081 |
| script | haos-v70-36-workspace-option-builder-script | 14782 | 135 | 5388 |
| style | haos-v70-37-workspace-schedule-it-style | 14917 | 66 | 7373 |
| script | haos-v70-37-workspace-schedule-it-script | 14983 | 762 | 65841 |
| style | haos-v70-42-schedule-workspace-polish-style | 15745 | 24 | 2416 |
| script | haos-v70-42-schedule-workspace-polish-script | 15769 | 325 | 22989 |
| style | haos-v70-44-workspace-builder-quiz-style | 16094 | 30 | 3471 |
| script | haos-v70-44-workspace-builder-quiz-script | 16124 | 376 | 24795 |
| style | haos-v70-45-workspace-notif-calendar-style | 16500 | 15 | 1442 |
| script | haos-v70-45-workspace-notif-calendar-script | 16515 | 450 | 31492 |
| style | haos-v70-46-ui-polish-style | 16965 | 38 | 4357 |
| script | haos-v70-46-ui-polish-script | 17003 | 222 | 16364 |
| style | haos-v70-47-calendar-dept-cleanup-style | 17225 | 5 | 307 |
| script | haos-v70-47-calendar-dept-cleanup-script | 17230 | 155 | 7317 |
| style | haos-v70-48-booking-security-emeeting-style | 17385 | 30 | 3646 |
| script | haos-v70-48-booking-security-emeeting-script | 17415 | 345 | 43687 |
| style | haos-v70-49-final-polish-style | 17760 | 15 | 2030 |
| script | haos-v70-49-final-polish-script | 17775 | 159 | 11947 |
| style | haos-v70-50-admin-system-tools-style | 17934 | 18 | 1963 |
| script | haos-v70-50-admin-system-tools-script | 17952 | 216 | 18201 |
| style | haos-v70-51-stability-style | 18168 | 12 | 657 |
| script | haos-v70-51-stability-script | 18180 | 146 | 10279 |
| script | assets/js/modules/remote-support.js | 18327 | 1 | 59 |
| script | assets/js/modules/meeting-minutes.js | 18329 | 1 | 60 |
| script | assets/js/modules/external-organizations.js | 18331 | 1 | 67 |

## Function pressure

- Apps Script named functions: 776
- Frontend inline named functions: 1071
- Frontend window exports: 754

### Duplicate backend function names

| Function | Count |
| --- | ---: |
| bridgeWhitelistHealthCheckV68 | 6 |
| getAllowedBridgeFunctions_ | 6 |
| bridgeWhitelistHealthCheck | 4 |
| getHeadOfDepartmentV68 | 4 |
| updateUserProfile | 4 |
| bridgeWhitelistHealthCheckV70 | 3 |
| createSystemBackupV63 | 3 |
| defaultPermissionMatrixV64_ | 3 |
| deleteGoogleCalendarEventV66_ | 3 |
| ensureCalendarIntegrationV66_ | 3 |
| getAllUsers | 3 |
| getBackupLogSheetV63_ | 3 |
| getBrandingConfigV65 | 3 |
| getITAssetModuleDataV70 | 3 |
| getITServiceStaffPhones_ | 3 |
| getPermissionMatrixSheetV64_ | 3 |
| getPermissionMatrixV64 | 3 |
| getSystemHealth | 3 |
| getTeamReports | 3 |
| haosV716AppendNotification_ | 3 |
| isITServiceStaff_ | 3 |
| listSystemBackupsV63 | 3 |
| loginAccount | 3 |
| restoreSystemBackupV63 | 3 |
| resyncAllGoogleCalendarV66 | 3 |
| runITLicenseExpiryAlertV70 | 3 |
| saveBrandingConfigV65 | 3 |
| saveITAssetV70 | 3 |
| saveITRepairTicketV70 | 3 |
| saveITSoftwareLicenseV70 | 3 |
| savePermissionMatrixV64 | 3 |
| seedPermissionMatrixV64_ | 3 |
| syncITBookingToGoogleCalendarV66_ | 3 |
| updateITRepairTicketStatusV70 | 3 |
| createITRepairMemoDocumentV722 | 2 |
| createNotificationV718_ | 2 |
| deleteNotification | 2 |
| fmtDateTime_ | 2 |
| getAdminUsersData | 2 |
| getCentralSupportContactsV712 | 2 |

## Sheet references found in Code.gs.txt

| Sheet/reference | Source kinds |
| --- | --- |
| ApprovalHistory | literal |
| Attachments | const:SHEET_ATTACHMENTS |
| AuditLogs | const:SHEET_AUDIT |
| AutoLoginDevices | literal |
| BackupLogs | const:SHEET_BACKUP_LOGS |
| CollaborativeWorkspaces | const:SHEET_WORKSPACES |
| DailyReports | const:SHEET_REPORTS |
| EMeetingReminderLog | literal |
| ErrorLogs | const:SHEET_ERROR_LOGS |
| HelpChatMessages | literal |
| HelpChatSessions | literal |
| HelpSupportContacts | literal |
| InviteLinks | literal |
| ITAssets | literal |
| ITAssetSoftwareMap | literal |
| ITBookings | const:SHEET_IT_BOOKINGS |
| ITLicenses | literal |
| ITRepairDocuments | literal |
| ITRepairTickets | literal |
| ITRepairUpdates | literal |
| ITSoftware | literal |
| LiveOpinionResponses | const:SHEET_LIVE_RESPONSES |
| LiveOpinionSurveys | const:SHEET_LIVE_SURVEYS |
| MeetingMinutes | const:SHEET_MEETING_MINUTES |
| Notifications | const:SHEET_NOTIFICATIONS |
| PasswordResetOtp | literal |
| PermissionMatrix | const:SHEET_PERMISSION_MATRIX |
| PinChangeRequests | literal |
| RecurringRules | const:SHEET_RECURRING |
| RemoteSupportFrames | literal |
| Resources | const:SHEET_RESOURCES |
| Schedules | const:SHEET_NAME |
| Settings | const:SHEET_SETTINGS |
| SHEET_ATTACHMENTS | constant-ref |
| SHEET_AUDIT | constant-ref |
| SHEET_BACKUP_LOGS | constant-ref |
| SHEET_ERROR_LOGS | constant-ref |
| SHEET_IT_BOOKINGS | constant-ref |
| SHEET_LIVE_RESPONSES | constant-ref |
| SHEET_LIVE_SURVEYS | constant-ref |
| SHEET_MEETING_MINUTES | constant-ref |
| SHEET_NAME | constant-ref |
| SHEET_NOTIFICATIONS | constant-ref |
| SHEET_PERMISSION_MATRIX | constant-ref |
| SHEET_RECURRING | constant-ref |
| SHEET_REPORTS | constant-ref |
| SHEET_RESOURCES | constant-ref |
| SHEET_SETTINGS | constant-ref |
| SHEET_USERS | constant-ref |
| SHEET_WORK_STATUSES | constant-ref |
| SHEET_WORK_TAGS | constant-ref |
| SHEET_WORKSPACES | constant-ref |
| UserProfiles | literal |
| Users | const:SHEET_USERS |
| WorkStatuses | const:SHEET_WORK_STATUSES |
| WorkTags | const:SHEET_WORK_TAGS |

## First-pass risk notes

- index.html is a patch-accumulated file; extraction should keep existing global function names stable until each module is proven.
- Code.gs.txt has repeated service implementations and repeated bridge whitelist overrides; backend refactor should start with shared read/cache helpers.
- Google Sheet cleanup must stay dry-run first. Never delete rows or sheets before a workbook copy and an audit diff exist.
- Large tables should be paginated and filtered server-side before UI refactor work.
