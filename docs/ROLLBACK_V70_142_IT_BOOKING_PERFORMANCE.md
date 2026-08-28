# Rollback v70.142 - IT Booking Performance

## Scope

This patch reduces the initial load time of the Meeting Room / Zoom booking module.
It does not change the booking data schema.

Changed runtime files:

- `Code.gs.txt`
- `index.html`
- `sw.js`
- `package.json`

Test files:

- `tests/it-booking/performance.test.mjs`
- `tests/dashboard-builder/dashboard-builder.test.mjs`

## Database impact

None. No sheet, column, row, or stored value is added, changed, or removed.

## Recommended rollback

After this patch is committed, use GitHub Desktop to revert the single v70.142
commit, push the revert commit, and restore the previous `Code.gs.txt` content in
Google Apps Script. Do not delete or clean any Google Sheet data.

After Vercel finishes the rollback deployment, reload the application with
`Ctrl+F5` so the previous Service Worker cache is active.

## Verification after rollback

1. Sign in with a normal user and open the booking module.
2. Confirm that the user sees only their authorized bookings.
3. Sign in as IT Manager/Admin and confirm that booking management still works.
4. Create or update one test booking and confirm that the list refreshes.
