# Jigsaw Module Changed Files

## Created

- `jigsaw/index.html` - standalone game page from the provided package.
- `jigsaw/icon.svg` - game icon.
- `jigsaw/manifest.webmanifest` - game PWA manifest scoped to the game folder.
- `jigsaw/sw.js` - game-only service worker, hardened for `/jigsaw/`.
- `assets/js/modules/jigsaw-module.js` - Health Assistant OS menu/card integration and feature flag.
- `docs/jigsaw/INSTALL.md`
- `docs/jigsaw/UNINSTALL.md`
- `docs/jigsaw/CHANGED_FILES.md`
- `docs/jigsaw/TEST_RESULTS.md`
- `docs/jigsaw/install-manifest.json`
- `scripts/remove-jigsaw-module.mjs`

## Modified

- `index.html`
  - Adds `assets/js/modules/jigsaw-module.js?v=70127`.

- `vercel.json`
  - Adds rewrites for `/jigsaw` and `/jigsaw/`.
  - Preserves `/remote` and `/public`.

- `sw.js`
  - Bumps root cache name.
  - Adds `assets/js/modules/jigsaw-module.js` to core cache.
  - Skips `/jigsaw` and `/jigsaw/` so the game service worker can own that path.

## Not Changed

- Google Apps Script backend.
- `/api/gas`.
- Authentication/login/role logic.
- Database/schema.
- Environment variables and secrets.
- Existing `/remote` and `/public` rewrites.

