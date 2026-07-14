# Health Assistant OS Jigsaw Module - Uninstall

## Safe Rollback Steps

1. Hide the menu card by setting:

   ```js
   window.HAOS_FEATURES.ENABLE_JIGSAW_GAME = false;
   ```

2. Remove the script tag from `index.html`:

   ```html
   <script src="assets/js/modules/jigsaw-module.js?v=70127"></script>
   ```

3. Remove the `/jigsaw` and `/jigsaw/` rewrites from `vercel.json`.

4. Remove the `/jigsaw` skip and `assets/js/modules/jigsaw-module.js` cache entry from `sw.js`.

5. Delete module-owned files:

   - `jigsaw/index.html`
   - `jigsaw/icon.svg`
   - `jigsaw/manifest.webmanifest`
   - `jigsaw/sw.js`
   - `assets/js/modules/jigsaw-module.js`
   - `docs/jigsaw/*`
   - `scripts/remove-jigsaw-module.mjs`

6. Clear only the game cache in browser DevTools if needed:

   - `haos-jigsaw-game-v1`

7. Test main Health Assistant OS:

   - Login/logout
   - IT Services Hub
   - Schedule
   - Workspace
   - Booking
   - `/api/gas`

8. Commit rollback and deploy Preview before Production.

## Optional Script

Run:

```bash
node scripts/remove-jigsaw-module.mjs
```

The script prints every module-owned file first and asks for confirmation. It does not automatically edit shared files such as `index.html`, `sw.js`, or `vercel.json`.

