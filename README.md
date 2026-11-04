# Share My Prayer

This is the ordinary-prayer app. Rosary recording and playback now live in the separate [Pray My Rosary app](https://tompinataro.github.io/pray-my-rosary/).

The ordinary app retains Sign of the Cross, Glory Be, Hail Mary and Our Father; private recording/review/save, individual Play/Pause/Resume and Share; the personal-only four-prayer WAV; exact home and reading instructions; wording selections, dedication, copyright notices and private backup/restore.

## Recording safety and migration

- Keep the existing IndexedDB database `share-my-prayer`, schema version 1, with `version:id` recording keys and ArrayBuffer audio bytes. Existing `smp-settings` and `smp-prompt:*` preferences stay in place.
- Removing Rosary navigation does **not** delete any recording or prompt. Full backups still include all older prayers, all 20 mystery announcements and all wording versions, including legacy Traditional records.
- Use Settings → Back up recordings to export a private `share-my-prayer` version-1 JSON backup. Restore continues to accept full older backups. No data is sent to a server.
- The separate **Pray My Rosary** app uses its own database and preference namespace. It can copy/import legacy recordings with explicit preview and confirmation. Existing destination recordings take precedence during repeated legacy migration; the source is never deleted.
- Copies are independent after migration. Re-recording in one app does not update the other. Keep a private backup before changing devices, clearing browser data, or migrating.

## Published apps

- Share My Prayer: https://tompinataro.github.io/share-my-prayer/
- Pray My Rosary: https://tompinataro.github.io/pray-my-rosary/

Publication of this cleanup is authorized after the standalone Rosary app was published and verified. Both repositories retain manual-only Pages workflows. Removing the old Rosary interface does not delete legacy recordings or change the full private-backup format.

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
