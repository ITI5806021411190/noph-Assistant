# Rollback v70.91 User Notes

Use this only if the User Notes module needs to be removed after testing.

## Frontend

Remove these lines from `index.html`:

```html
<link rel="stylesheet" href="assets/css/notes.css">
<script src="assets/js/modules/notes.js"></script>
```

Remove the hero quick action button that calls:

```html
window.HAOSNotes?.quickNote?.()
```

Remove these files from the deployed frontend if you want a clean repo:

```text
assets/css/notes.css
assets/js/modules/notes.js
```

Update `sw.js`:

- Remove `/assets/css/notes.css`
- Remove `/assets/js/modules/notes.js`
- Bump `CACHE_NAME` again so users refresh out of the old cache.

## Google Apps Script

Remove the v70.90 User Notes block from `Code.gs.txt`:

- `SHEET_USER_NOTES`
- `getUserNotesSheetV790_`
- `getUserNotesV790`
- `saveUserNoteV790`
- `toggleUserNotePinV790`
- `archiveUserNoteV790`
- `deleteUserNoteV790`
- `bridgeWhitelistHealthCheckV790`
- the v70.90 whitelist wrapper.

## Database

The module creates a new Google Sheet tab:

```text
UserNotes
```

If you have already tested and want to remove all note data, delete only this tab. Do not delete other tabs.
