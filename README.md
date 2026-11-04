# Share My Prayer

A mobile-friendly, buildless GitHub Pages app with Bella AI narration and optional personal recordings. A saved personal recording overrides Bella for its exact prayer and wording selection. No accounts, application server, voice cloning, analytics, runtime dependencies, or automatic recording uploads. **App URL: [Share My Prayer](https://tompinataro.github.io/share-my-prayer/).** Source: [tompinataro/share-my-prayer](https://github.com/tompinataro/share-my-prayer).

Publication of this update is authorized; a successful deployment has not yet been verified. Latest local checks: 26 unit tests and the static build pass. Final Classic browser/device QA and word-for-word listening review remain unverified.

## Run locally

Requires Python 3; Node 24 and npm are used for tests and packaging only.

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:4173 in a browser. Serve over localhost or HTTPS; opening `index.html` as a file is unsupported. A phone visiting a computer’s plain HTTP LAN address will not get microphone access. Use authorized HTTPS hosting for physical iPhone testing.

## Use

The landing page contains prayer-name buttons, a Rosary button, and a settings gear at the top right.

1. Open the settings gear and choose Classic prayers, Current Catholic, or Contemporary English. New users start in Classic; existing wording preferences are preserved. If preferences are missing, existing Current or Contemporary recordings keep that wording selected. Legacy Traditional recordings remain retained in backups. Optionally enable “Made just for you. From _____, with Love” and enter a sender.
2. Tap Rosary, then choose Decades (one selected decade) or Whole Rosary (five decades plus opening/closing) and a mystery set. The rosary controls stay disabled until every required clip is available. Incomplete sessions list the personal recordings needed and explain how to record/save them.
3. Tap a prayer button to open its text first; recording, playback and sharing follow below the prayer, with source information available in Settings. Or open Settings → Mystery announcements for one of the 20 prompts. Read the displayed prayer. Tap Record to open the separate recording view, then stop, review, and explicitly save. Instructions and review details appear only in that next view; Save or Discard returns to the prayer. Re-recording leaves the previous saved audio intact until the replacement commits.
4. Begin prayer when all required Bella clips or personal recordings are available. Pause, resume, or stop at any point. Changing a selection stops playback. The player displays prayer, decade, Hail Mary number, and step progress.
5. Play, download, or share the selected prayer audio: your recording takes precedence over Bella. For a session, prepare it first, then tap ↓ Save or Share prepared audio. A second explicit tap preserves the user gesture required by Safari’s file-sharing API. Unsupported file sharing falls back to download. Share cancellation does not force a download.
6. In Settings, download a private backup regularly. Restore the JSON backup on this or another browser; review its count and confirm replacements. Restore merges by wording and prayer atomically; unrelated audio and current preferences stay intact. Private text prompts are included/restored. Preference metadata is included for reference but is not automatically applied.

## Wording and permissions

Every prayer displays its matching text immediately. **Classic prayers** combines historical Creed, Hail Mary, Hail Holy Queen and closing wording with the app's original adapted Fatima prayer; its other prayers retain customary Current wording. Classic is clearly labeled as historical plus adapted, not one approved liturgical translation. **Contemporary English** offers ELLC texts and labeled original adaptations. Both selections have Bella defaults for all 28 prayers/mystery announcements.

**Current Catholic** preserves the previous wording and personal recordings. Its Hail Mary, Hail Holy Queen, Fatima and closing defaults remain held pending exact-wording rights review; its modern Creed narration is excluded. Personal recordings remain available for those prayers. Historical audio is never inserted under a Current key.

Classic personal recordings use separate `classic:` keys. Existing Current and Contemporary recordings are not renamed, copied, deleted or relabeled. Legacy Traditional preferences still open Current Catholic, while legacy audio remains under its original keys and in backups. Historical public-domain provenance is United States-specific; see [SOURCES.md](./SOURCES.md).

The paste-text workflow has been removed. Old private prompts remain in local storage/backups for compatibility but do not replace the displayed prayers.

[SOURCES.md](./SOURCES.md) documents the primary texts and ICEL’s standing permission for approved texts on free, non-commercial websites (Publication Policies, page 25), with the required Creed attribution at the bottom of its recording view. There is no claim of app endorsement or a blanket license to all USCCB material. Contemporary adaptations are not officially approved Catholic translations.

## Privacy, storage, and backups

Personal audio bytes are stored in IndexedDB and reconstructed as Blobs (avoids WebKit Blob-storage failures). Preferences and private text prompts use localStorage. These are per browser profile and **origin**, not synced across devices. Clearing site data, browser eviction, private browsing, or changing origin can lose audio. Multiple Pages apps on the same origin share the named database. A changed repository subpath on the same origin retains it; a changed hostname does not.

Bella audio is served as static MP3 files and cached in memory. It is not written to the private recordings database or included in private backups. The manifest has 79 version/prayer mappings sharing 35 unique MP3s.

Backups are unencrypted JSON with base64 audio and can reveal your voice, sender name and private prompts. Store them privately. Sharing invokes only the platform share sheet for the chosen file. No app code uploads any audio. Backup restoration supports files up to 150 MB and 112 distinct prayer/version keys. Existing three-version backups remain accepted; backups containing new Classic keys require this updated app. Standalone audio importing is not offered. Private prompts are restored after the audio transaction, so text storage failure does not roll back successful audio restoration.

Saved replacements commit only after the IndexedDB transaction completes. On save failure, the draft remains available for retry/download and the old saved take remains intact. On backgrounding, recording stops into an unsaved reviewable take when the browser delivers the event. Force-closing or OS termination can lose an unsaved take. No guarantee of recovery from a killed tab is made.

## Audio and device limits

MediaRecorder format is selected with `isTypeSupported` at runtime: MP4/M4A when available, otherwise WebM/Opus or Ogg/Opus. The actual MIME type determines the extension. Original individual files are preserved; unknown formats are rejected rather than mislabeled.

Session export decodes each unique audio clip once, converts to 24 kHz mono 16-bit PCM and concatenates repeated PCM chunks into **one RIFF/WAV file** in the exact playback sequence. This is not a playlist or byte concatenation of compressed containers. Limits: 10 minutes per distinct clip and 90 minutes per expanded session. A 30-minute WAV is about 86 MB. WAV is widely playable but larger than AAC; browser memory and messaging attachment limits still apply. If a recording restored from another browser cannot be decoded, re-record the prayer in this browser. No automatic spoken dedication is added.

Keep the page foregrounded and phone unlocked while recording, exporting or praying. iOS may suspend a tab or interrupt audio during lock, app switching, calls, or memory pressure. Resume explicitly if interrupted; seamless background/lock-screen playback is not guaranteed. Downloaded sessions can be played in a native audio player for more reliable background use. The app itself is not offline-cached and needs access to its static files on load.

## Validation

```sh
npm test
npx playwright install chromium webkit
npm run test:browser
npm run build
```

The current unit suite has 26 passing tests, including audio/text hashes, Classic wording isolation, original-recording preservation, 112-key backups and explicit 84-key legacy compatibility. The static build passes and validates every packaged audio hash. All 35 MP3s decode structurally; this does not establish spoken accuracy.

Core tests cover every mystery set and individual decade, 80-step five-decade order, 53 Hail Marys, recording-key separation, export header/PCM, safe filenames and backup validation. Browser tests use desktop Chromium and mobile-sized WebKit: record/save/reload/replay (Chromium fake microphone), preserved replacement, wording isolation, missing links, mystery selection, dedication persistence, pause/resume/stop, combined WAV byte lengths, sharing download fallback, backup/restore, denied microphone and storage failure. The 36 browser cases parse successfully, but the final suite was not executed because browser launches are blocked in the current environment. Prior Mac QA covered playback and mixed export in the earlier partial preview, not the final Classic selection. No full word-for-word listening pass, physical iPhone verification, or final microphone save/re-record pass is claimed. [VALIDATION.md](./VALIDATION.md) contains earlier results and manual checks; those earlier results must not be treated as validation of every change in this update.

## GitHub Pages deployment — only after authorization

All runtime paths are relative, so `https://OWNER.github.io/share-my-prayer/` works without a build-time base URL. No service worker/root-scope assumptions.

1. After Tom authorizes deployment, create/select the GitHub repository and push source files and the **35 explicitly allowlisted public narrator MP3s only**. Never add personal recordings, private backups, API keys, or raw account/credit metadata. `.gitignore` excludes common audio, backup names, dependencies and test artifacts; inspect the staged diff as a final check.
2. In repository **Settings → Pages → Build and deployment**, choose **GitHub Actions**.
3. The included `.github/workflows/pages.yml` is **manual-only (`workflow_dispatch`)**. It does not publish on push. Optionally require Tom as a reviewer for the `github-pages` environment.
4. After explicit deployment authorization, run **Actions → Publish Share My Prayer → Run workflow**. The workflow runs unit tests, builds `dist/` from an explicit 14-file runtime/document allowlist plus checksum-verified narrator assets, uploads only `dist/`, then deploys it. Browser tests are run locally separately; they are not claimed as a workflow gate.
5. Open the returned HTTPS Pages URL and complete the iPhone checklist before inviting users. Enforce HTTPS in Pages settings where offered.

Verify the deployed commit and HTTPS asset responses after running the workflow before claiming this update is live. To preview the deployable artifact locally: `npm run build`, then `python3 -m http.server 4174 --directory dist`.

## Extending

`core.js` defines prayers, mystery names, stable IDs, version keys and the single shared sequence builder. Add a new prayer to `prayers` and its wording/provenance to `texts.js`; expand the sequence only when required. `storage.js` owns transactional storage, `audio.js` the exclusive player/WAV assembly, and `app.js` the UI. Stable IDs preserve existing recordings. The data accepts 28 prayers × 4 stored wording versions (112 keys), including retained legacy Traditional data. Backup bounds derive from the library and version counts. `narrator.js` resolves personal overrides and `narrator-manifest.js` maps approved static assets. Add audio only after checking matching wording, provenance, hashes and release scope; the build rejects the five restricted original Current defaults.

