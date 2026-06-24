# Rollback v70.100 Help + Workspace Hardening

Patch: `haos-v70-100-help-workspace-hardening`

## Scope

This patch hardens two areas that still had stale/legacy behavior:

- Help Center / Live Chat settings popup: intercepts legacy `Swal.fire()` calls that still contain `helpSupportSettingsTableV713` and converts them to the stable list renderer before display.
- Collaborative Workspaces: opens workspace viewer/editor from the exact clicked row and workspace ID, and blocks the popup if the returned workspace title does not match the clicked row.

It also bumps the service worker cache name to:

```js
haos-v70-100-help-workspace-hardening
```

## Files Changed

- `index.html`
- `sw.js`

## Rollback Steps

1. In `index.html`, remove this block near the end of the file:

```html
<script id="haos-v70-100-help-workspace-hardening-script">
...
</script>
```

2. In `sw.js`, change the cache name back to:

```js
const CACHE_NAME = 'haos-v70-99-admin-help-workspace-fixes';
```

3. Redeploy to GitHub/Vercel and hard refresh the browser once.

## Verification After Rollback

- Help Center / Live Chat returns to the previous v70.99 behavior.
- Workspace edit/open behavior returns to the previous v70.99 wrapper behavior.
- `scripts/check_inline_scripts.mjs index.html` passes.
- `node --check sw.js` passes.
