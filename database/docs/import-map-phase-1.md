# Phase 1 Import Map

This map preserves the existing Google Sheet fields while moving the hot login and notification paths to PostgreSQL.

## Users -> public.users

| Sheet column | PostgreSQL column | Notes |
| --- | --- | --- |
| Phone (Username) | phone | Strip leading apostrophe before import. |
| PIN (Password) | pin_hash | Hash before insert. The phase-1 exporter stores `pbkdf2_sha256$iterations$salt$hash`, not the old plain PIN. |
| Full Name | full_name | Required. |
| Position | position | Account-level fallback; active profile should drive runtime permissions. |
| Department | department_name | Resolve to `department_id` when present in `departments`. |
| Email | email | Optional. |
| PDPA Status | pdpa_status | Keep raw value. |
| Role | account_role | Existing values: User, Admin, Super Admin. |
| Timestamp | legacy_created_at | Original registration timestamp. |
| Email Notify | email_notify | On = true, Off = false. |
| Account Status | account_status | Active, Pending, Rejected, Inactive. |
| Last Login | last_login_at | Optional. |
| Signature Data | signature_data | Large text/blob pointer for now. |
| Signature List JSON | signature_list | Parse as JSON array; fallback to `[]`. |
| Approved At | approved_at | Optional. |
| Approved By | approved_by_phone | Strip leading apostrophe. |
| Invite Token | invite_token | Optional. |
| Email Notify Preferences JSON | email_notify_preferences | Parse as JSON object; fallback to `{}`. |
| Active Profile ID | active_profile_id | Add FK after `user_profiles` import. If the sheet has duplicate `Active Profile ID` headers, keep the populated column and remove the empty duplicate before import. |

## UserProfiles -> public.user_profiles

| Sheet column | PostgreSQL column | Notes |
| --- | --- | --- |
| Profile ID | profile_id | Preserve existing profile IDs. |
| User Phone | user_phone | Use to join `users.phone` to `users.user_id`. |
| Full Name Snapshot | full_name_snapshot | Snapshot for audit readability. |
| Department | department_name | Resolve to `department_id` when present. |
| Position | position | Profile-level position. |
| Profile Role | profile_role | Member, Head, Acting Head, Coordinator, etc. |
| Is Primary | is_primary | Boolean. |
| Is Active | is_active | Boolean. |
| Can Approve | can_approve | Boolean. |
| Signature ID | signature_id | Optional. |
| Notify Email | notify_email | Optional override. |
| Notify Telegram | notify_telegram | Optional override. |
| Created At | created_at | Optional. |
| Updated At | updated_at | Optional. |
| Updated By | updated_by_phone | Strip leading apostrophe. |
| Notes | notes | Optional. |

## AutoLoginDevices -> public.auto_login_devices

| Sheet column | PostgreSQL column | Notes |
| --- | --- | --- |
| Device ID | device_id | Existing local device ID. |
| User Phone | user_phone | Use to join `users.phone` to `users.user_id`. |
| Device Label | device_label | User-visible label. |
| Token Hash | token_hash | Keep hashed value only. |
| User Agent | user_agent | Optional. |
| Created At | created_at | Optional. |
| Last Used At | last_used_at | Optional. |
| Expires At | expires_at | Optional. |
| Is Active | is_active | Boolean. |
| Revoked At | revoked_at | Optional. |
| Revoked By | revoked_by_phone | Strip leading apostrophe. |
| Notes | notes | Optional. |

## Notifications -> public.notifications

| Sheet column | PostgreSQL column | Notes |
| --- | --- | --- |
| Notif ID | notification_id | Preserve existing IDs. |
| Target Phone | target_phone | Use to join `users.phone` to `target_user_id` when possible. |
| Message | message | Required. |
| Is Read | is_read | Boolean. |
| Timestamp | created_at | Original notification time. |
| Type | type | Existing type label. |
| Entity ID | entity_id | Target entity. |
| Priority | priority | Existing priority label. |
| Email Sent At | email_sent_at | Optional. |
| Email Status | email_status | Optional. |
| Module | module | Added by v70.32. |
| Action | action | Added by v70.32. |
| Created By | created_by_phone | Strip leading apostrophe. |
| Read At | read_at | Optional. |

## AuditLogs -> public.audit_logs

| Sheet column | PostgreSQL column | Notes |
| --- | --- | --- |
| Audit ID | audit_id | Preserve existing IDs. |
| Timestamp | created_at | Original audit time. |
| Actor Phone | actor_phone | Strip leading apostrophe. |
| Actor Name | actor_name | Snapshot. |
| Action | action | Required. |
| Entity Type | entity_type | Existing label. |
| Entity ID | entity_id | Existing entity ID. |
| Summary | summary | Human-readable audit summary. |
| Before JSON | before_json | Parse JSON when possible. |
| After JSON | after_json | Parse JSON when possible. |

## Import order

1. `departments`
2. `users` without `active_profile_id`
3. `user_profiles`
4. update `users.active_profile_id`
5. `auto_login_devices`
6. `notifications`
7. `audit_logs`
8. `settings`, `resources`, `attachments`

## Validation checklist

- Count active users in PostgreSQL equals non-blank user rows in the sheet.
- Every active user has at least one active profile.
- No user has more than one active primary profile.
- No active duplicate profile exists for the same user, department, position, role, and approve flag.
- Unread notification count per user matches the sheet before switching traffic.
- Audit logs retain actor phone and active profile payload where available.
