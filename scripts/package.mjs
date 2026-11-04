import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { narratorClips } from "../narrator-manifest.js";
import { library, selectableVersions, keyFor } from "../core.js";
import { mkdir, copyFile, rm, readFile } from "node:fs/promises";
// Explicit allowlist: only approved narrator manifest audio can enter Pages.
// Private recordings, backups, node_modules and test artifacts remain excluded.
const files = [
  "index.html",
  "style.css",
  "app.js",
  "personal-share.js",
  "core.js",
  "texts.js",
  "storage.js",
  "audio.js",
  "narrator.js",
  "narrator-manifest.js",
  "SOURCES.md",
  ".nojekyll",
  "favicon.svg",
  "favicon.png",
  "apple-touch-icon.png",
];
const allowedKeys = new Set(
  Object.keys(selectableVersions).flatMap((v) =>
    library.map((p) => keyFor(v, p.id)),
  ),
);
const blockedDefaults = new Set([
  "current:hail",
  "current:queen",
  "current:fatima",
  "current:closing",
  "current:creed",
]);
const publicAudio = new Set();
for (const [key, clip] of Object.entries(narratorClips)) {
  if (
    !allowedKeys.has(key) ||
    blockedDefaults.has(key) ||
    ![
      "historical-standard-form-basis",
      "historical-us-public-domain-reviewed",
      "documented-CC0-or-ELLC-permission",
    ].includes(clip.releaseReview) ||
    typeof clip.path !== "string" ||
    !/^\.\/narration\/bella\/[a-zA-Z0-9_/-]+\.(mp3|m4a|wav)$/.test(clip.path)
  )
    throw Error(`Invalid public narrator manifest entry: ${key}`);
  const bytes = await readFile(clip.path);
  if (createHash("sha256").update(bytes).digest("hex") !== clip.sha256)
    throw Error(`Narrator audio hash mismatch: ${key}`);
  publicAudio.add(clip.path);
}
await rm("dist", { recursive: true, force: true });
await mkdir("dist");
for (const file of files) await copyFile(file, `dist/${file}`);
console.log(
  `Static app packaged in dist/ (${files.length} allowlisted files).`,
);

for (const file of publicAudio) {
  const target = resolve("dist", file);
  await mkdir(dirname(target), { recursive: true });
  await copyFile(file, target);
}

console.log(
  `${publicAudio.size} checksum-verified narrator assets packaged. Preview only; listening/device QA and release authorization still required.`,
);
