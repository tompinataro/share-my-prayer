# Validation record

Local verification on macOS, November 2, 2026. The initial implementation remained unpublished. After Tom requested a live link, the app was published to [GitHub Pages](https://tompinataro.github.io/share-my-prayer/). [Deployment run](https://github.com/tompinataro/share-my-prayer/actions/runs/41509966961) completed successfully; the app HTML and JavaScript asset were verified with HTTP 200. No user recordings or backups were published.

## Passed

- `npm test`: 10 core tests. All four sets, all 20 individual decades, exact opening and closing, 80 full-session steps, 53 Hail Marys, 6 Our Fathers, 6 Glory Bes, 5 Fatima Prayers, 5 distinct announcements, 2 Signs of the Cross. Version keys, names/extensions, PCM clipping/RIFF header, invalid selection and malformed/duplicate backup validation.
- `npm run test:browser`: 26 passed, 2 explicitly skipped. Desktop Chromium and WebKit at 390 × 844 with touch/mobile mode.
- Real MediaRecorder capture using Chromium’s synthetic microphone: record → stop → review → save → reload → replay. No human voice was recorded for tests.
- Synthetic microphone capture/save/reload/replay on both engines; independent wording slots; discard replacement preserves saved audio.
- All mystery-set/decade selectors and settings synchronization; dedication persistence; missing-recording buttons link to the correct prompt.
- Pause/resume retains current step while paused; stop remains stopped after pending media time elapses.
- Individual download extension, combined 14-step decade and 80-step rosary RIFF/WAV file lengths. Export uses real browser decoding of generated WAV fixtures, not mocked export output.
- Native-share branch receives a real audio File (share API stubbed; no files sent); cancellation is respected. Unsupported sharing produces a download.
- Backup of all 84 prayer/version slots, clear disposable test database, restore with count confirmation; restored recordings are playable after reload.
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

## Current content and operational limits

Current Catholic now displays all eight prayers, with the current Creed covered by ICEL’s non-commercial Internet publication policy and the customary prayers checked against the USCCB. Contemporary English remains available; adaptations are labeled in source details. Traditional is suppressed but legacy audio is retained. See `SOURCES.md` for exact provenance and terms.

No guaranteed background/locked-phone playback, no killed-tab draft recovery, no offline cache, no automatic sync, no MP3 encoding. Backups are unencrypted; restore limit is 150 MB, exports limited to 10 minutes per unique clip and 90 minutes expanded. Physical-device checks above remain applicable.

## Simplified home update

The landing page now contains the app name, a gear at the top right, eight prayer-name buttons, and a Rosary button. Hero copy, library counters, privacy sections, and session controls are removed from the landing page. Rosary controls open on demand; mystery announcements, backups and source/privacy information are in Settings. Optional dedication still appears when enabled. Existing IndexedDB recording keys and local preferences are preserved.

Regression checks cover opening each secondary surface, missing-recording links inside the Rosary dialog, stacked prayer dialogs from Settings, settings accessibility, narrow-screen layout, existing playback/export/restore behavior, and the public repository subpath.

## Prayer text first update

Prayer views open with the prayer title and text, followed by recording/playback controls, version/source details, private prompt editor, and export controls. Opening another prayer resets scroll and focuses the title. Saved private prompts now appear as reading text at the top for source-linked wording. The Stop recording button remains pinned at the bottom while recording, including when scrolling back to read a long prayer. Browser assertions verify the text/control ordering, scroll reset and private-prompt display on both engines.

## Current Catholic default and direct prayer text

Current Catholic is selected for new users and for users whose previous preference was Traditional. Settings exposes exactly Current Catholic and Contemporary English. All eight prayer buttons open to complete words with no source-linked placeholder and no paste-text workflow. Source notices are collapsed below the controls. Tests open every current prayer, retain contemporary wording, migrate a Traditional preference, ignore legacy private text overrides and preserve all 84 seeded legacy/current/contemporary audio slots.

## Quiet reading view

Missing-recording badges and the rosary missing-recordings list were removed at Tom’s request. An unrecorded prayer opens with only its text and bottom controls; an empty idle recording status is hidden. Recording, saved and playing statuses still appear when applicable. Playback/export readiness checks still prevent silently skipping required audio. Browser coverage verifies no missing-recording message and preserves record/save/replay, wording separation, sequence selection and export behavior.

## Recording-only input

The standalone Import audio control and file input, event handler, format inference, and import suggestions were removed. Prayers are recorded with the microphone. Tests exercise the record/stop/review/save/reload/replay flow and safe replacement using a synthetic capture fixture on both engines, plus real Chromium MediaRecorder capture separately. Backup restoration remains available in Settings. Regression checks assert there is no audio import input or label in any prayer view.

## Purple theme and centered prayers

General background is light lavender (#f3edf9); regular buttons are deeper lavender (#d8c6ea), lighter than the dark purple cross (#53336b). Prayer titles and full prayer text are centered. The record and play symbols retain their functional red and green colors. Desktop Chromium and mobile WebKit accessibility and secondary-surface checks passed (four targeted browser tests); home and prayer screenshots were visually inspected. No recording/storage behavior changed.

## Navigation and compact layout

The former top-right close buttons are now plain `<` back controls at the upper left of the prayer, Rosary and Settings views, retaining their existing close/back behavior. The main title is centered independently of the cross and gear. Main prayer/Rosary buttons occupy 75% of their previous content width. Source/wording details are removed from the prayer screen; required text attribution is retained only as a concise footer on that recording view, and full source information remains in Settings. Download actions are labeled “↓ Save.” Explanatory text after the Rosary buttons is removed; recording instructions stay on the recording page.

## Separate recording view

The reading view has no instructional/review paragraphs after Record/Play. Record opens a separate in-dialog recording view with the prayer text, recording status, Stop, draft review/save/discard, instructions and detailed text attribution. Save or Discard returns to reading. The back button prevents abandoning an active/unsaved take. Concise required licensed-text attribution sits before controls on applicable reading views; it is not an instructional footer. Browser recording flows verify view transitions, clean reading text, retained draft safety, returning after save, playback and version separation.

## November 16, 2026 — Mary Undoer of Knots Bella default

- Added the exact 2,603-character owner-supplied Mary text as one Bella MP3 shared across Classic, Current and Contemporary modes. The asset is 184.450563 seconds, mono 44.1 kHz, 128 kbps; SHA-256 `1cd155e2982f796f9eb26907948319f38f064e9113418a3e1685efde416b9375`.
- Updated the public packaging allowlist and visible instructions; preserved version-specific personal overrides, private database/backup formats, four-prayer personal bundle, and held Current defaults.
- Passed 31 unit tests, all 58 browser tests (Chromium and mobile-sized WebKit), build, JavaScript syntax, formatting and git whitespace checks. Browser checks include Mary playback/pause and simulated native share across all three wording modes. MP3 decodes without ffmpeg errors.
- Browser launch initially failed within the command sandbox; approved isolated test run outside it passed. Cross-app migration suite was not rerun because this temporary checkout lacks the separate Pray My Rosary fixture; neither app's storage or migration code was changed.
- Full human listening, physical iPhone microphone/background/native share verification remain unperformed. The manifest retains `spokenContentVerified: false`; no claim of pronunciation or complete audible-content QA is made.

## November 16, 2026 — revised Mary prompts and silent request interval

- Replaced the first-three and last-two decade directions with Tom's literal short phrase repeated three times and twice. Canonical text: 2,702 characters; SHA-256 `56de43386012062e906aabdb647351ab900d619e80573e7a205fde638c0aaaec`.
- Regenerated Bella in two segments, split immediately after “Mention your request here.” Inserted 220,500 zero-valued mono PCM samples at 44.1 kHz: exactly five seconds, from 34.115918 to 39.115918 seconds. Natural neighboring sentence-end/start quiet is retained; decoded MP3 silence detection measures 5.308 seconds including that natural quiet. No pause directive was submitted as speech.
- Revised MP3: 197.522449 seconds, 3,161,487 bytes; SHA-256 `e8209852eb19967ca49b44111ae9dbc55f31e6f04b900b1099cea45e3ebfc66d`. New filename and module versions avoid stale cached audio. Prior MP3 retained, but excluded from the public package.
- Verified segment text concatenation equals canonical text, zero-valued insertion samples, error-free MP3 decoding, 32 passing unit tests and nine checksum-verified packaged assets. Browser regression results recorded below. Personal recordings, storage, and four-prayer bundle unchanged.
- Full subjective listening and physical iPhone QA remain unperformed; `spokenContentVerified` remains false.

- Final revised-asset browser suite: all 58 passed (Chromium and mobile-sized WebKit), including playback/pause/share in all wording modes.

## Superseding November 16 clarification — full prayers, not titles

The owner clarified that each decade must contain a complete Our Father followed by ten complete Hail Marys. The title-only revision's Pages run `43966660446` was cancelled before deployment steps. Live HTML remained `mary-bella-1` immediately afterward. The interim commit is preserved as history but is not the intended release.

The full revised canonical text is 14,694 characters, SHA-256 `14cdc118a4ebb7cbb6e91a4a87f0f321b8d3a6932fa72a9bc7a29511816a01bd`. A unit regression verifies five exact Our Father texts, fifty exact Hail Mary texts, three-then-two decade placement, no title-only prompts, and no spoken pause instruction. The approved `current-father.mp3` and `classic-hail.mp3` narrator assets supply the complete prayers; no wording/version-specific personal recordings are changed.

Corrected assembled MP3: 18:24 (1,104.10694 seconds PCM), 17,666,760 bytes, SHA-256 `e073d63d77129ab0b0d9273318f70ffd6e975e778a1badd800c510efb1965e08`. Independently verified every assembled PCM span equals its decoded source clip, all source MP3 hashes match the assembly ledger, the complete sequence contains exactly 5 Our Fathers and 50 Hail Marys grouped 3/2, and the request pause is exactly 220,500 zero-valued samples at 44.1 kHz. Full MP3 decoding succeeds. New Mary filename and module versions prevent using cached title-only audio. Prior audio versions retained in Git but excluded from the current public package. Full subjective listening remains unverified.

Final corrected full-prayer verification: 32 unit tests and all 58 Chromium/mobile-sized WebKit browser tests passed; build contains nine checksum-verified narrator assets. Personal override, four-prayer bundle and recording/storage regressions passed. Physical iPhone and full human listening checks remain outstanding.

## November 16 — Mary top controls and bottom landing text

Moved the existing Mary Record, Play/Pause and Share controls immediately below its title and above its artwork/text. Other prayer views retain bottom controls; the same DOM buttons and event handlers are moved, not duplicated. Moved the landing-page sharing instruction below Mary, and removed “four” from that instruction and the home share-button label. The underlying personal-only four-prayer bundle remains unchanged.

Passed 32 unit tests, all 60 Chromium/mobile-sized WebKit browser tests, build and git whitespace checks. Added regression coverage for DOM/visual ordering, restored bottom controls after switching to another prayer, bottom landing instruction and labels. Existing recording, personal overrides, playback/share and bundle-content tests pass.

## November 16 — home-screen standalone configuration

Added a web app manifest with relative id/start URL/scope restricted to `/share-my-prayer/`, standalone display, existing icons and lavender theme. Added Apple home-screen web-app metadata. Normal Safari/browser address chrome cannot be removed by the page; the configuration requests a standalone experience when installed/launched from the home screen. No service worker or offline guarantee was added, and no recordings, storage keys or origin were changed. Users should back up existing recordings before switching browser/install contexts; physical iPhone installation and storage continuity remain unverified. A unit test verifies scope, metadata and existing icon files. Restored a consistent gap before the Mary landing button after moving its explanatory paragraph.

Final standalone/layout regression:33 unit tests and60 browser tests passed; public build passed.
