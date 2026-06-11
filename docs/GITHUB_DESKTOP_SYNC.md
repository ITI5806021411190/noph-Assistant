# GitHub Desktop Sync Guide

Last updated: 2026-06-11

## Purpose

Use GitHub Desktop to keep the local Health Assistant OS files synced with GitHub and Vercel without manually uploading many files one by one.

## Current Local Status

This workspace is not a Git repository yet, and the `git` command is not available in PowerShell on this machine. The easiest path is GitHub Desktop.

## Recommended Setup

1. Install GitHub Desktop.
2. Sign in with the GitHub account that owns the Health Assistant OS repository.
3. In GitHub Desktop, choose one of these:
   - If the GitHub repository already exists: `File > Clone repository`.
   - If the local folder should become the first source: `File > Add local repository`.
4. Put the project files in the repository folder.
5. Check the changed files list before every commit.
6. Write a short commit summary, such as `Extract external organization module`.
7. Click `Commit to main`.
8. Click `Push origin`.
9. Vercel should deploy automatically from GitHub if the Vercel project is connected.

## Local Private Folder

Real database exports should be kept outside the GitHub repository, or in a local-only folder such as:

```text
_local_private/database_exports/
```

This folder is ignored by Git and should not be uploaded to GitHub. It is for local backups, workbook exports, and inspection files that may contain real users, phone numbers, PIN-related data, email addresses, or office records. The current workspace has been cleaned, so `_local_private/` may not exist unless you create it again for a temporary local inspection.

## Files That Should Go To GitHub

Runtime files:

- `index.html`
- `public.html`
- `remote.html`
- `sw.js`
- `manifest.json`
- `vercel.json`
- `package.json`
- `api/`
- `assets/`
- `logo-moph.png`

Apps Script source history:

- `Code.gs.txt`
- `appsscript.json`

Documentation and maintenance tools:

- `docs/`
- `scripts/`
- `database/README.md`
- `database/docs/`
- `database/migrations/`
- `docs/REMOTE_SUPPORT_ANYDESK.md`
- `docs/REMOTE_SUPPORT_ROLLBACK.md`

## Files That Should Not Go To GitHub

Real data and secrets:

- `_local_private/`
- `_local_private/database_exports/AI Assistant OS (present).xlsx`
- `_local_private/database_exports/AI Assistant OS (old).xlsx`
- Any `.xlsx`, `.xls`, `.csv`, `.tsv` export containing real users or office data
- `.env`
- `.env.local`
- `.env.production`
- `.clasp.json`
- Generated import SQL/CSV/JSON under `database/imports/`

The `.gitignore` file already blocks these by default.

## Before Every Push

Check these points:

1. No real database export is listed in GitHub Desktop changes.
2. No `.env` file is listed.
3. `_local_private/` should not appear in the changed files list.
4. If `Code.gs.txt` changed, remember GitHub does not update Google Apps Script automatically.
5. If frontend files changed, confirm Vercel deployment after push.
6. If `sw.js` changed, verify cache name changed only when needed.

## If A Sensitive File Appears In GitHub Desktop

Do not commit.

1. Right-click the file in GitHub Desktop.
2. Choose discard only if it is a generated copy you do not need.
3. If the file must remain locally, confirm `.gitignore` covers it.
4. Close and reopen GitHub Desktop if needed.

## Google Apps Script Note

GitHub/Vercel sync does not automatically update Apps Script.

When `Code.gs.txt` changes:

1. Open Google Apps Script.
2. Copy the contents of `Code.gs.txt`.
3. Paste into the Apps Script project.
4. Save/deploy as usual.

Later, this can be automated with `clasp`, but that should be a separate setup step because it needs Apps Script project credentials.
