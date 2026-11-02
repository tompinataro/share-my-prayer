import { mkdir, copyFile, rm } from "node:fs/promises";
// Explicit allowlist: audio, backups, node_modules and test artifacts never enter Pages.
const files = [
  "index.html",
  "style.css",
  "app.js",
  "core.js",
  "texts.js",
  "storage.js",
  "audio.js",
  "SOURCES.md",
  ".nojekyll",
  "favicon.svg",
  "favicon.png",
  "apple-touch-icon.png",
];
await rm("dist", { recursive: true, force: true });
await mkdir("dist");
for (const file of files) await copyFile(file, `dist/${file}`);
console.log(
  `Static app packaged in dist/ (${files.length} allowlisted files).`,
);
