# Popular Vote Test Results

## Local static checks

- [x] `node --check popular-vote/assets/js/core.js`
- [x] `node --check popular-vote/assets/js/participant.js`
- [x] `node --check popular-vote/assets/js/stage.js`
- [x] `node --check popular-vote/assets/js/admin.js`
- [x] `node --check assets/js/modules/popular-vote-module.js`
- [x] `node --check tests/popular-vote/firestore-rules.test.mjs`
- [x] JSON parse check for `vercel.json`, `firebase.json`, `firestore.indexes.json`, `docs/popular-vote/install-manifest.json`
- [x] Mock load test with 2,000 in-memory voters, 20 candidates, and duplicate UID guard

## Manual test checklist

- [ ] HAOS main app still opens and `/api/gas` is unchanged
- [ ] IT Services Hub shows Popular Vote card only for Admin/Super Admin
- [ ] Participant route signs in anonymously
- [ ] Feature flag disabled page does not initialize Firebase/listeners
- [ ] Ready status shows waiting screen
- [ ] Open poll shows candidate gallery and one vote can be confirmed
- [ ] Duplicate vote shows already-voted state
- [ ] Closed status stops new votes
- [ ] Admin login allows only `wongnazaipot@gmail.com`
- [ ] Stage login allows only `wongnazaipot@gmail.com`
- [ ] Stage realtime updates without sorting positions in live mode
- [ ] Result mode ranks by score and supports ties
- [ ] Export CSV downloads correctly
- [ ] Reset votes requires confirm and typing `RESET`

## Not run in this session

- Firestore emulator rules test was not executed because Firebase emulator dependencies are not installed locally.
- No production Firebase load test was run by design.
