# Share My Prayer

A mobile-friendly, buildless GitHub Pages app for praying with your own voice. No accounts, server, uploads, narrator, voice cloning, analytics, or runtime dependencies. **Live app: [Share My Prayer](https://tompinataro.github.io/share-my-prayer/).** Tom authorized publication by requesting a live link on November 2, 2026. Source: [tompinataro/share-my-prayer](https://github.com/tompinataro/share-my-prayer).

## Run locally

Requires Python 3; Node 24 and npm are used for tests and packaging only.

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:4173 in a browser. Serve over localhost or HTTPS; opening `index.html` as a file is unsupported. A phone visiting a computer’s plain HTTP LAN address will not get microphone access. Use authorized HTTPS hosting for physical iPhone testing.

## Use

The landing page contains prayer-name buttons, a Rosary button, and a settings gear at the top right.

1. Open the settings gear and choose Traditional Catholic, Current Catholic, or Contemporary English. Optionally enable “Made just for you. From _____, with Love” and enter a sender.
2. Tap Rosary, then choose Decades (one selected decade) or Whole Rosary (five decades plus opening/closing) and a mystery set. The missing list links directly to each required recording.
3. Tap a prayer button to open its text first; recording, playback, sharing and source details follow below the prayer. Or open Settings → Mystery announcements for one of the 20 prompts. Read its prompt or linked source; record, stop, review, and explicitly save. Re-recording leaves the previous saved audio intact until the replacement commits. You may also import a WAV, M4A, WebM, or Ogg recording and review it before saving.
4. Begin prayer when all required recordings exist. Pause, resume, or stop at any point. Changing a selection stops playback. The player displays prayer, decade, Hail Mary number, and step progress.
5. Download/share individual saved recordings. For a session, prepare it first, then tap Download WAV or Share prepared audio. A second explicit tap preserves the user gesture required by Safari’s file-sharing API. Unsupported file sharing falls back to download. Share cancellation does not force a download.
6. In Settings, download a private backup regularly. Restore the JSON backup on this or another browser; review its count and confirm replacements. Restore merges by wording and prayer atomically; unrelated audio and current preferences stay intact. Private text prompts are included/restored. Preference metadata is included for reference but is not automatically applied.

## Wording and permissions

Read [SOURCES.md](./SOURCES.md) for the source-by-source register and exact limitations. Traditional contains seven historical full-text prompts; Fatima is source-linked pending a verified reuse basis. **Current Catholic has working independent recording slots, but complete modern prompts are source-linked pending permission.** It does not silently substitute historical wording. Before recording, paste a private prompt you have permission to use, or read the source on another device. Switching to a source tab during recording stops the take into review.

Contemporary English contains three licensed ELLC texts and five original CC0 adaptations, each labeled. The ELLC Lord’s Prayer differs from the requested Church of England version and includes its doxology. The collection is not presented as an approved Catholic translation. No claim is made that all 24 prayer/version texts have cleared redistribution rights.

## Privacy, storage, and backups

Audio bytes are stored in IndexedDB and reconstructed as Blobs (avoids WebKit Blob-storage failures). Preferences and private text prompts use localStorage. These are per browser profile and **origin**, not synced across devices. Clearing site data, browser eviction, private browsing, or changing origin can lose audio. Multiple Pages apps on the same origin share the named database. A changed repository subpath on the same origin retains it; a changed hostname does not.

Backups are unencrypted JSON with base64 audio and can reveal your voice, sender name and private prompts. Store them privately. Sharing invokes only the platform share sheet for the chosen file. No app code uploads any audio. Import supports backups up to 150 MB and individual audio up to 60 MB; very large libraries may need individual-file transfers. Private prompts are restored after the audio transaction, so text storage failure does not roll back successful audio restoration.

Saved replacements commit only after the IndexedDB transaction completes. On save failure, the draft remains available for retry/download and the old saved take remains intact. On backgrounding, recording stops into an unsaved reviewable take when the browser delivers the event. Force-closing or OS termination can lose an unsaved take. No guarantee of recovery from a killed tab is made.

## Audio and device limits

MediaRecorder format is selected with `isTypeSupported` at runtime: MP4/M4A when available, otherwise WebM/Opus or Ogg/Opus. The actual MIME type determines the extension. Original individual files are preserved; unknown formats are rejected rather than mislabeled.

Session export decodes each unique audio clip once, converts to 24 kHz mono 16-bit PCM and concatenates repeated PCM chunks into **one RIFF/WAV file** in the exact playback sequence. This is not a playlist or byte concatenation of compressed containers. Limits: 10 minutes per distinct clip and 90 minutes per expanded session. A 30-minute WAV is about 86 MB. WAV is widely playable but larger than AAC; browser memory and messaging attachment limits still apply. If an imported codec cannot be decoded, re-record locally or import WAV. No automatic spoken dedication is added.

Keep the page foregrounded and phone unlocked while recording, exporting or praying. iOS may suspend a tab or interrupt audio during lock, app switching, calls, or memory pressure. Resume explicitly if interrupted; seamless background/lock-screen playback is not guaranteed. Downloaded sessions can be played in a native audio player for more reliable background use. The app itself is not offline-cached and needs access to its static files on load.

## Validation

```sh
npm test
npx playwright install chromium webkit
npm run test:browser
npm run build
```

Core tests cover every mystery set and individual decade, 80-step five-decade order, 53 Hail Marys, recording-key separation, export header/PCM, safe filenames and backup validation. Browser tests use desktop Chromium and mobile-sized WebKit: record/save/reload/replay (Chromium fake microphone), imports, preserved replacement, wording isolation, missing links, mystery selection, dedication persistence, pause/resume/stop, combined WAV byte lengths, sharing download fallback, backup/restore, denied microphone and storage failure. See [VALIDATION.md](./VALIDATION.md) for results and manual device checks.

## GitHub Pages deployment — only after authorization

All runtime paths are relative, so `https://OWNER.github.io/share-my-prayer/` works without a build-time base URL. No service worker/root-scope assumptions.

1. After Tom authorizes deployment, create/select the GitHub repository and push **source files only**. Never add recordings or private backups. `.gitignore` excludes common audio, backup names, dependencies and test artifacts; inspect the staged diff as a final check.
2. In repository **Settings → Pages → Build and deployment**, choose **GitHub Actions**.
3. The included `.github/workflows/pages.yml` is **manual-only (`workflow_dispatch`)**. It does not publish on push. Optionally require Tom as a reviewer for the `github-pages` environment.
4. After explicit deployment authorization, run **Actions → Publish Share My Prayer → Run workflow**. The workflow runs unit tests, builds `dist/` from an explicit nine-file public allowlist, uploads only `dist/`, then deploys it. Browser tests are run locally separately; they are not claimed as a workflow gate.
5. Open the returned HTTPS Pages URL and complete the iPhone checklist before inviting users. Enforce HTTPS in Pages settings where offered.

The source repository has been created and pushed after Tom requested a live link. The manual Pages workflow completed successfully, and the app page and JavaScript asset returned HTTP 200. To preview the deployable artifact locally: `npm run build`, then `python3 -m http.server 4174 --directory dist`.

## Extending

`core.js` defines prayers, mystery names, stable IDs, version keys and the single shared sequence builder. Add a new prayer to `prayers` and its wording/provenance to `texts.js`; expand the sequence only when required. `storage.js` owns transactional storage, `audio.js` the exclusive player/WAV assembly, and `app.js` the UI. Stable IDs preserve existing recordings. The data accepts 28 prayers × 3 versions today; increase the backup validation count when extending the library. No bundled audio is required or shipped.
