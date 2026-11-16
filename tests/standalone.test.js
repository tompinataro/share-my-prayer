import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
test("home-screen metadata stays scoped to Share My Prayer without changing storage or claiming offline support", async () => {
  const manifest = JSON.parse(
    await readFile(new URL("../manifest.webmanifest", import.meta.url), "utf8"),
  );
  const base =
    "https://tompinataro.github.io/share-my-prayer/manifest.webmanifest";
  for (const field of ["id", "start_url", "scope"])
    assert.equal(
      new URL(manifest[field], base).href,
      "https://tompinataro.github.io/share-my-prayer/",
    );
  assert.equal(manifest.display, "standalone");
  const html = await readFile(
    new URL("../index.html", import.meta.url),
    "utf8",
  );
  assert.match(html, /name="apple-mobile-web-app-capable" content="yes"/);
  assert.match(html, /rel="manifest" href="\.\/manifest.webmanifest/);
  for (const icon of manifest.icons)
    assert.ok(
      (await readFile(new URL("../" + icon.src.split("?")[0], import.meta.url)))
        .length > 0,
    );
});
