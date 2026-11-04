import test from "node:test";
import assert from "node:assert/strict";
import { personalPrayerBatch, personalShareIds } from "../personal-share.js";

test("personal batch gates all four by wording and excludes narrator descriptors", () => {
  const records = new Map();
  assert.equal(personalPrayerBatch(records, "classic"), null);
  for (const [index, id] of personalShareIds.entries()) {
    records.set(`classic:${id}`, {
      blob: new Blob([id], { type: "audio/wav" }),
    });
    if (index < 3) assert.equal(personalPrayerBatch(records, "classic"), null);
  }
  assert.deepEqual(
    personalPrayerBatch(records, "classic").map((x) => x.id),
    ["cross", "glory", "hail", "father"],
  );
  assert.equal(personalPrayerBatch(records, "current"), null);
  records.set("classic:father", { blob: new Blob([]) });
  assert.equal(personalPrayerBatch(records, "classic"), null);
  records.set("classic:father", {
    source: "bella",
    blob: new Blob(["default"]),
  });
  assert.equal(personalPrayerBatch(records, "classic"), null);
});

test("personal batch takes fresh replacement snapshots and preserves recording formats", () => {
  const records = new Map(
    personalShareIds.map((id, i) => [
      `current:${id}`,
      {
        blob: new Blob([id], {
          type: ["audio/wav", "audio/mp4", "audio/webm", "audio/ogg"][i],
        }),
      },
    ]),
  );
  const first = personalPrayerBatch(records, "current");
  const replacement = new Blob(["replacement"], { type: "audio/mp4" });
  records.set("current:glory", { blob: replacement });
  const next = personalPrayerBatch(records, "current");
  assert.notEqual(first[1].blob, next[1].blob);
  assert.equal(next[1].blob, replacement);
  assert.deepEqual(
    first.map((x) => x.blob.type),
    ["audio/wav", "audio/mp4", "audio/webm", "audio/ogg"],
  );
  assert.equal(records.size, 4);
});
