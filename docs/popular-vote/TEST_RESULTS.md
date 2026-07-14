# Popular Vote Test Results

## Dependency install

Installed dev dependencies:

- `firebase@12.16.0`
- `@firebase/rules-unit-testing@5.0.1`
- `firebase-tools@15.23.0`

Portable Java runtime used for local emulator test only:

- `OpenJDK Runtime Environment Temurin-21.0.11+10`
- path: `%TEMP%\haos-jre21\jdk-21.0.11+10-jre\bin\java.exe`

## Commands run

```powershell
& 'C:\Users\Worawong\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd' add -D firebase @firebase/rules-unit-testing firebase-tools
```

```powershell
& 'C:\Users\Worawong\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd' install --offline
```

```powershell
$env:PATH = 'C:\Users\Worawong\AppData\Local\Temp\haos-jre21\jdk-21.0.11+10-jre\bin;C:\Users\Worawong\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;' + $env:PATH
$env:XDG_CONFIG_HOME = Join-Path $env:TEMP 'haos-firebase-config'
$env:XDG_CACHE_HOME = Join-Path $env:TEMP 'haos-firebase-cache'
$env:FIREBASE_CLI_DISABLE_UPDATE_CHECK = 'true'
New-Item -ItemType Directory -Force -Path $env:XDG_CONFIG_HOME | Out-Null
New-Item -ItemType Directory -Force -Path $env:XDG_CACHE_HOME | Out-Null
& .\node_modules\.bin\firebase.cmd emulators:exec --only firestore "node tests/popular-vote/firestore-rules.test.mjs"
```

## Final emulator result

- Passed: 25
- Failed: 0
- Total: 25

## Security cases covered

- unauthenticated user cannot read event
- anonymous user can read event
- anonymous user can read poll
- anonymous user can read active candidate
- admin can create event
- admin can update poll
- non-admin google user cannot update event
- unverified admin email cannot update event
- anonymous user can create one valid vote for own uid
- anonymous user can read own vote
- anonymous user cannot read another user's vote
- anonymous user cannot create vote with another document id
- anonymous user cannot create vote with mismatched voterUid
- anonymous user cannot create vote with mismatched pollId
- anonymous user cannot create vote when poll is closed
- anonymous user cannot create vote for missing candidate
- anonymous user cannot create vote for inactive candidate
- anonymous user cannot create vote with mismatched candidateNumber
- anonymous user cannot create vote with extra fields
- anonymous user cannot update existing vote
- anonymous user cannot delete own vote
- anonymous user cannot overwrite duplicate vote
- google user cannot create participant vote
- admin can read any vote
- admin can delete vote for reset

## Not done

- Firestore Rules were not deployed.
- Branch was not merged to main.
- No production Firebase load test was run.
