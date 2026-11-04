# Share My Prayer

This local branch prepares the ordinary-prayer half of the app separation. **It has not been pushed or published.** The existing live site still has its Rosary path.

The ordinary app retains Sign of the Cross, Glory Be, Hail Mary and Our Father; private recording/review/save, individual Play/Pause/Resume and Share; the personal-only four-prayer WAV; exact home and reading instructions; wording selections, dedication, copyright notices and private backup/restore.

## Recording safety and migration

- Keep the existing IndexedDB database `share-my-prayer`, schema version 1, with `version:id` recording keys and ArrayBuffer audio bytes. Existing `smp-settings` and `smp-prompt:*` preferences stay in place.
- Removing Rosary navigation does **not** delete any recording or prompt. Full backups still include all older prayers, all 20 mystery announcements and all wording versions, including legacy Traditional records.
- Use Settings → Back up recordings to export a private `share-my-prayer` version-1 JSON backup. Restore continues to accept full older backups. No data is sent to a server.
- The separate local **Pray My Rosary** project uses its own database and preference namespace. It can copy/import legacy recordings with explicit preview and confirmation. Existing destination recordings take precedence during repeated legacy migration; the source is never deleted.
- Copies are independent after migration. Re-recording in one app does not update the other. Keep a private backup before changing devices, clearing browser data, or migrating.

The standalone local project is at `/Users/tompinataro/Documents/Codex/2026-11-03/can/outputs/pray-my-rosary`. See its `MIGRATION.md` for the supported paths and limitations.

## Release gate — keep this cleanup local

Tom approved publication of the separate public `tompinataro/pray-my-rosary` repository and Pages app at `https://tompinataro.github.io/pray-my-rosary/`. That approval does not cover publishing this ordinary-app cleanup.

Keep this branch local until Tom separately authorizes publishing the original cleanup. The manual Pages workflow is retained; no workflow was dispatched for this branch.

## Development and checks

```sh
npm ci
npm test
npm run test:browser
npm run build
npm run test:separation
npx prettier --check app.js index.html storage.js tests/ordinary.spec.js
node --check app.js
```

No separate lint or typecheck command is configured. Browser coverage includes ordinary recording/reload/playback, sharing, old full-backup preservation, preferences, mobile layout and text enlargement. The remaining sequence/text unit tests retain coverage for legacy backup data and shared historical source tables, not a Rosary route in this app.

The packaging script uses an explicit public-file allowlist. Test recordings, backups, test output and dependencies are excluded. All approved source narrator assets and copyright metadata are retained unchanged in the checkout. The ordinary build packages only the defaults used by its four prayers; the standalone Rosary build retains the full narrator set. Physical-device microphone, background audio and native sharing still require device QA.
