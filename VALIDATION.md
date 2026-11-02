# Validation record

Local verification on macOS, November 2, 2026. The initial implementation remained unpublished. After Tom requested a live link, the app was published to [GitHub Pages](https://tompinataro.github.io/share-my-prayer/). [Deployment run](https://github.com/tompinataro/share-my-prayer/actions/runs/41509966961) completed successfully; the app HTML and JavaScript asset were verified with HTTP 200. No user recordings or backups were published.

## Passed

- `npm test`: 9 core tests. All four sets, all 20 individual decades, exact opening and closing, 80 full-session steps, 53 Hail Marys, 6 Our Fathers, 6 Glory Bes, 5 Fatima Prayers, 5 distinct announcements, 2 Signs of the Cross. Version keys, names/extensions, PCM clipping/RIFF header, invalid selection and malformed/duplicate backup validation.
- `npm run test:browser`: 24 passed, 2 explicitly skipped. Desktop Chromium and WebKit at 390 × 844 with touch/mobile mode.
- Real MediaRecorder capture using Chromium’s synthetic microphone: record → stop → review → save → reload → replay. No human voice was recorded for tests.
- Audio import/save/reload/replay on both engines; independent wording slots; discard replacement preserves saved audio.
- All mystery-set/decade selectors and settings synchronization; dedication persistence; missing-recording buttons link to the correct prompt.
- Pause/resume retains current step while paused; stop remains stopped after pending media time elapses.
- Individual download extension, combined 14-step decade and 80-step rosary RIFF/WAV file lengths. Export uses real browser decoding of generated WAV fixtures, not mocked export output.
- Native-share branch receives a real audio File (share API stubbed; no files sent); cancellation is respected. Unsupported sharing produces a download.
- Backup of all 84 prayer/version slots, clear disposable test database, restore with count confirmation; imported recordings are playable after reload.
- Denied microphone, quota/storage failure, unsupported decode/export failure, malformed backup, and interrupted/background recording produce actionable messages. Unsaved draft remains reviewable. A forced failure during the second write proves batch rollback preserves all existing audio.
- Repository-subpath `/share-my-prayer/` loads all relative assets successfully using a test routing prefix.
- Axe automated accessibility scan: zero violations on home and open prayer dialog in both engines. Keyboard focus rings, dialog labels, source links, text labels alongside icons, live statuses, mobile no-horizontal-overflow check. Screenshots inspected for desktop and mobile. Safari native select sizing was corrected with normalized 48 px controls.
- `npm run build`: nine public files only, produced through an explicit allowlist. Includes source register and `.nojekyll`; no audio, private JSON, test artifacts, node_modules, or credentials.
- JavaScript syntax checks and production dependency audit passed; no runtime npm dependencies.

The first WebKit run exposed Blob persistence failure in IndexedDB. Storage now encodes ArrayBuffers before opening the transaction and reconstructs playable Blobs on read. Browser tests passed with this implementation. A separate test verifies that synchronous batch-write exceptions explicitly abort the transaction.

## Physical-device checks still required

The two skipped cases are WebKit microphone capture and OS/background recording interruption: the WebKit test runner does not expose a synthetic microphone. Chromium equivalents passed. Mobile-sized desktop WebKit is useful coverage but is not a physical iPhone.

Before release, on an authorized HTTPS preview:

1. On a real iPhone Safari, allow the microphone, record audible speech, stop/save, close/reopen the page, and replay. Try denial, then allow access in website settings.
2. Re-record while reading a long prayer; scroll through the prompt and verify the bottom Stop recording control stays reachable. Discard, then replace; verify only saved replacement changes playback.
3. Try a phone call, app switch, and screen lock while recording. Review the stopped/partial take; never assume it saved automatically. Force-killed tabs may lose drafts.
4. Pray an entire five-decade rosary with normal-length speech. Pause/resume at a Hail Mary and confirm the same count resumes without another track overlapping. Lock/unlock and verify the documented interruption behavior.
5. Export a normal-length whole rosary. Download and listen in Files/native playback; verify all five announcements and repeated prayers. Check WAV duration and memory behavior on the oldest intended iPhone.
6. Share an individual M4A recording and prepared WAV through the real iOS share sheet to a destination Tom chooses. Check attachment size limits and dedication filename. No live destination was exercised automatically.
7. Save a backup into Files and restore in another authorized browser/device. Verify all selected wording versions and private prompts. Keep a private second copy.
8. Test VoiceOver and increased text size, all settings dialogs, keyboard-only navigation on desktop, and another current desktop browser such as Firefox. Automated accessibility checks cannot replace these checks.

## Known content and operational limits

Current Catholic full texts and Traditional Fatima text are source-linked pending documented redistribution permission; independent recording slots, local private prompts, imports, sequence playback and exports all work. See `SOURCES.md`. No official approval is claimed for contemporary adaptations.

No guaranteed background/locked-phone playback, no killed-tab draft recovery, no offline cache, no automatic sync, no MP3 encoding. Backups are unencrypted; restore limit is 150 MB, individual import 60 MB, exports limited to 10 minutes per unique clip and 90 minutes expanded. Real codec behavior and attachment limits depend on the browser/device. Complete permissions and physical-device review before treating the app as release-ready.

## Simplified home update

The landing page now contains the app name, a gear at the top right, eight prayer-name buttons, and a Rosary button. Hero copy, library counters, privacy sections, and session controls are removed from the landing page. Rosary controls open on demand; mystery announcements, backups and source/privacy information are in Settings. Optional dedication still appears when enabled. Existing IndexedDB recording keys and local preferences are preserved.

Regression checks cover opening each secondary surface, missing-recording links inside the Rosary dialog, stacked prayer dialogs from Settings, settings accessibility, narrow-screen layout, existing playback/export/restore behavior, and the public repository subpath.

## Prayer text first update

Prayer views open with the prayer title and text, followed by recording/playback controls, version/source details, private prompt editor, and export controls. Opening another prayer resets scroll and focuses the title. Saved private prompts now appear as reading text at the top for source-linked wording. The Stop recording button remains pinned at the bottom while recording, including when scrolling back to read a long prayer. Browser assertions verify the text/control ordering, scroll reset and private-prompt display on both engines.
