import test from "node:test";
import assert from "node:assert/strict";
import { narratorClips } from "../narrator-manifest.js";
import { createAudioResolver } from "../narrator.js";
import { selectableVersions } from "../core.js";
import { personalShareIds, personalPrayerBatch } from "../personal-share.js";

test("Mary default is shared across all selectable wording modes, never added to four-prayer bundle", async () => {
  const records = new Map();
  const resolver = createAudioResolver(records);
  const paths = new Set();
  for (const version of Object.keys(selectableVersions)) {
    const clip = resolver.descriptor(version, "mary-undoer");
    assert.equal(clip.source, "bella");
    assert.equal(clip.voiceId, "dsigZNN9uZvzbZVKvb6a");
    paths.add(clip.path);
    const own = {
      key: `${version}:mary-undoer`,
      blob: new Blob(["private"], { type: "audio/wav" }),
    };
    records.set(own.key, own);
    assert.equal(
      (await resolver.resolve(version, "mary-undoer")).blob,
      own.blob,
    );
  }
  assert.equal(paths.size, 1);
  assert.deepEqual(personalShareIds, ["cross", "glory", "hail", "father"]);
  assert.equal(personalPrayerBatch(records, "classic"), null);
  assert.equal(records.size, 3);
  assert.equal(narratorClips["current:creed"], undefined);
});
