# All-app store rollout — initial inventory

Requested November 8, 2026: prepare all web apps for Apple App Store and Google Play. This is an initial inventory, not a claim that every repository is a shipping product. No store submissions have been made.

| App | Source located | Current mobile status |
| --- | --- | --- |
| Share My Prayer | tompinataro/share-my-prayer | iOS/Android projects generated and synced; 30 unit tests pass |
| Pray My Rosary | tompinataro/pray-my-rosary | iOS/Android projects generated and synced; 33 unit tests pass |
| Dear Diary | tompinataro/poppies-navy-journal, docs/dear-diary | Needs source audit and mobile packaging; preserve private entry export/import |
| Poppie's Navy Journal | tompinataro/poppies-navy-journal | Published web edition complete; assess Apple 4.2 book-content suitability before mobile work |
| Divine Mercy | Existing Sites project | Owner-only hosting observed; source audit and independent mobile package needed |
| Days of our Lives | Existing Sites project | Owner-only hosting observed; remove personal calendar data from distribution assets |
| My Insurance Inventory | Existing Sites project | Owner-only hosting observed; audit private data separation before packaging |
| Zen | Existing Sites project | Owner-only hosting observed; audit private reflection separation before packaging |
| Homily reader | tompinataro/homily-writing-samples-reader | Source located; audit distributable content and prior curation restrictions |

## Additional repositories to classify

Repository search also located RouteMaster, Bloom-Steward, Pool-Steward, CD-Valet, DVD-Valet, Pull-Tab_Valet, Phrase_Passport, italian-flashcards, picture-grid-quest, unstuck-workbook, AI-Founders-Periodic-Table, AI-Founders-Periodic-Flashcards, marcos-flower-garden, my-tixpy-ai, tixpy.dev and tixpy-canopi. Inspect README, deployment and product identity to distinguish actual apps from prototypes or duplicate versions. Older coursework repositories are also present; inventory is not yet exhaustive.

## Shared release dependencies

Apple Developer and Google Play Console account existence/access is unconfirmed. Final seller identity, bundle IDs, privacy/support URLs, store artwork, native sharing/recording, device tests and signing remain outstanding. Do not infer disclosure answers from the web version alone. Private user data must never ship as demo assets. Native projects currently use generated placeholder artwork.

Initial route: bundle approved web assets with Capacitor, then implement and test the native capabilities each product needs. Apple guideline 4.2 requires sufficient app utility; packaging alone does not guarantee acceptance. No existing site audience was changed.

References: https://developer.apple.com/app-store/review/guidelines/ ; https://capacitorjs.com/docs/getting-started ; https://support.google.com/googleplay/android-developer/answer/14151465
