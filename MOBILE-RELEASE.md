# Mobile release preparation — November 8, 2026

Status: development scaffold, not submitted or approved for either store.

Capacitor packages the allowlisted dist output inside each app. No remote server URL or ChatGPT sign-in gate is configured. The web deployment remains separate. Bundle identifiers in capacitor.config.json are proposed identifiers; confirm ownership and availability before creating store records.

## Build

Run `npm ci`, `npm test`, then `npm run mobile:sync`. Open iOS with `npm run mobile:ios` on a Mac with the supported Xcode toolchain; open Android with `npm run mobile:android` with the supported Android SDK and JDK. Configure signing in the platform tools using the owner's developer accounts. Never commit signing keys.

## Required before submission

- Test on real iPhone and Android devices: microphone permission allow/deny, recording, save/relaunch, playback, interruption, sharing WAV files, backup export and restore. Native file sharing and recording compatibility are not yet verified.
- Existing Safari/Chrome recordings do not automatically appear in the installed app. Preserve the existing backup/restore workflow and test import explicitly. Never clear source browser recordings.
- Verify all bundled Bella audio and prayer text release permissions. Preserve existing narrator allowlists and held-back Creed audio.
- Complete app icons, launch screen, screenshots, support and privacy-policy URLs, age/content ratings, Apple privacy disclosures and Google Data safety from verified app behavior.
- Confirm useful app functionality under Apple guideline 4.2. Bundling the website alone does not establish acceptance.
- Confirm Apple Developer and Google Play Console account access, seller identity, signing, testing eligibility and store identifiers.
- Run the applicable Google closed-testing requirements and TestFlight/device checks. Obtain signed release builds and review them before submission.

References: https://capacitorjs.com/docs/getting-started ; https://developer.apple.com/app-store/review/guidelines/ ; https://support.google.com/googleplay/android-developer/answer/14151465

Initial validation: existing unit tests passed (30 Share My Prayer / 33 Pray My Rosary), web packaging passed, and both native platforms generated and synced. iOS microphone purpose text and Android recording permission are declared. Android automatic backup is disabled to keep recordings out of automatic cloud backup; explicit private export remains available. Native compilation, signing, emulator and physical-device tests have not run.

Repository handoff: run `npm run mobile:prepare` first to reproduce the native projects and microphone declarations. Generated native projects were validated locally; this branch tracks their reproducible preparation script rather than generated artwork and binaries. Native project generation requires dependencies installed by `npm ci`.
