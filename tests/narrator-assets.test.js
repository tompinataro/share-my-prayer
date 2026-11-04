import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { narratorClips } from "../narrator-manifest.js";
import { library, required } from "../core.js";
import { prayerText } from "../texts.js";
import { createAudioResolver } from "../narrator.js";
const hash = (value) => createHash("sha256").update(value).digest("hex");
test("every narrator asset matches reviewed hash and canonical source text", async () => {
  for (const [key, clip] of Object.entries(narratorClips)) {
    const [version, id] = key.split(":");
    const prayer = library.find((p) => p.id === id);
    assert.ok(prayer, key);
    assert.equal(hash(prayerText(prayer, version).text), clip.textSha256, key);
    assert.equal(
      hash(await readFile(new URL("../" + clip.path, import.meta.url))),
      clip.sha256,
      key,
    );
    assert.equal(clip.spokenContentVerified, false);
  }
});
test("mystery audio is shared but personal recordings remain version-specific", () => {
  for (const prayer of library.filter((p) => p.set))
    assert.equal(
      narratorClips[`current:${prayer.id}`].path,
      narratorClips[`contemporary:${prayer.id}`].path,
    );
  const personal = {
    key: "current:Joyful-0",
    blob: new Blob(["personal"], { type: "audio/wav" }),
  };
  const resolver = createAudioResolver(new Map([[personal.key, personal]]));
  assert.equal(resolver.descriptor("current", "Joyful-0").source, "personal");
  assert.equal(resolver.descriptor("contemporary", "Joyful-0").source, "bella");
});
test("Current rosary requires held/excluded personal prayers; Contemporary is complete", () => {
  const resolver = createAudioResolver(new Map());
  assert.deepEqual(
    required({ mode: "whole", set: "Joyful" })
      .filter((id) => !resolver.descriptor("current", id))
      .sort(),
    ["creed", "hail", "fatima", "queen", "closing"].sort(),
  );
  assert.deepEqual(
    required({ mode: "whole", set: "Joyful" }).filter(
      (id) => !resolver.descriptor("contemporary", id),
    ),
    [],
  );
});
test("all real bundled assets resolve without writing to personal records", async () => {
  const records = new Map();
  let fetches = 0;
  const resolver = createAudioResolver(records, narratorClips, async (url) => {
    fetches++;
    return {
      ok: true,
      blob: async () => new Blob([await readFile(url)], { type: "audio/mpeg" }),
    };
  });
  for (const key of Object.keys(narratorClips)) {
    const [v, id] = key.split(":");
    assert.ok((await resolver.resolve(v, id)).blob.size > 0);
  }
  assert.equal(fetches, 35);
  assert.equal(records.size, 0);
});
