# Rollback v70.120 Schedule + IT Asset Fixes

Patch scope:
- Unblock Schedule action buttons after v70.118/v70.119 guard changes.
- Reduce repeated DOM rewrites in Upcoming Agenda.
- Add IT Asset filters for department, install location, acquired year, acquired-year sort, export, print, and image download.
- Update service worker cache name.

Rollback steps:
1. Revert `index.html` script id `haos-v70-117-schedule-multilink-script` to the previous deployed version before v70.120.
2. Remove `window.haosITAssetStateV7120=state;` from `loadITAssetModuleV70` if rolling back the IT Asset tools.
3. Revert `assets/js/modules/it-asset-import.js` to `v70.111-it-asset-import`.
4. Revert `assets/js/modules/upcoming-agenda.js` if the Upcoming Agenda list needs the old render behavior.
5. Revert `sw.js` cache name to the previous deployed cache version, then redeploy so browsers fetch fresh files.

Expected rollback result:
- Schedule buttons return to the pre-v70.120 behavior.
- IT Asset dashboard loses the new filters/export tools.
- Browser cache can be refreshed by redeploying `sw.js` and hard refreshing once.
