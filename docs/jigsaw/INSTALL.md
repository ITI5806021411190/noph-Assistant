# Health Assistant OS Jigsaw Module - Install

## Summary

This module installs the standalone Jigsaw game at:

- `/jigsaw/`

The game is isolated from the main Health Assistant OS page. It does not change Google Apps Script, `/api/gas`, authentication, roles, database schema, environment secrets, or backend URLs.

## Detected Project Structure

- Framework/style: Static HTML app served by Vercel.
- Main entry point: `index.html`.
- Public pages: `public.html`, `remote.html`, `help-live.html`.
- API bridge: `/api/gas` through `api/gas.js`.
- Routing: `vercel.json` rewrites.
- Main service worker: `/sw.js`.
- Game service worker scope: `/jigsaw/` via `jigsaw/sw.js`.

## Installed Files

- `jigsaw/index.html`
- `jigsaw/icon.svg`
- `jigsaw/manifest.webmanifest`
- `jigsaw/sw.js`
- `assets/js/modules/jigsaw-module.js`
- `docs/jigsaw/*`
- `scripts/remove-jigsaw-module.mjs`

## Main App Integration

The menu card is injected by `assets/js/modules/jigsaw-module.js`.

Feature flag:

```js
window.HAOS_FEATURES.ENABLE_JIGSAW_GAME = true;
```

To hide the card temporarily, set it to `false` before the module script runs.

Default visibility:

- Admin
- Super Admin

The route may still open directly while the card is hidden. This keeps rollback low-risk and avoids touching authentication or backend code.

## Vercel Rewrite

`vercel.json` adds:

- `/jigsaw` -> `/jigsaw/index.html`
- `/jigsaw/` -> `/jigsaw/index.html`

Existing routes for `/remote` and `/public` are preserved.

## Service Worker Notes

- Root `/sw.js` skips `/jigsaw` and `/jigsaw/`.
- Root `/sw.js` does not delete `haos-jigsaw-*` caches during activation.
- `jigsaw/sw.js` only handles same-origin requests under `/jigsaw/`.
- `jigsaw/sw.js` does not cache `/api/gas`.
- `jigsaw/sw.js` only removes old cache names beginning with `haos-jigsaw-`.

## Deployment Flow

1. Test locally or with Vercel Preview.
2. Confirm Health Assistant OS still works.
3. Confirm `/jigsaw/` works.
4. Commit changes.
5. Deploy Preview first.
6. Promote to Production only after approval.
