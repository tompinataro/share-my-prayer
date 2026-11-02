import test from "node:test";
import assert from "node:assert/strict";
import {
  sequence,
  required,
  mysteries,
  library,
  keyFor,
  versions,
  extension,
  filename,
  wavHeader,
  pcm16,
  validateBackup,
} from "../core.js";
for (const set of Object.keys(mysteries)) {
  test(`${set}: complete rosary and all individual decades`, () => {
    const s = sequence({ mode: "whole", set });
    assert.equal(s.length, 80);
    const count = (id) => s.filter((x) => x.id === id).length;
    assert.equal(count("hail"), 53);
    assert.equal(count("father"), 6);
    assert.equal(count("glory"), 6);
    assert.equal(count("fatima"), 5);
    assert.equal(count("cross"), 2);
    assert.deepEqual(
      s.slice(0, 7).map((x) => x.id),
      ["cross", "creed", "father", "hail", "hail", "hail", "glory"],
    );
    assert.deepEqual(
      s.slice(-3).map((x) => x.id),
      ["queen", "closing", "cross"],
    );
    for (let d = 0; d < 5; d++) {
      const decade = sequence({ mode: "decade", set, decade: d });
      assert.equal(decade.length, 14);
      assert.deepEqual(
        decade.map((x) => x.id),
        [`${set}-${d}`, "father", ...Array(10).fill("hail"), "glory", "fatima"],
      );
      assert.deepEqual(
        decade.filter((x) => x.id === "hail").map((x) => x.hail),
        [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      );
      assert.ok(decade.every((x) => x.decade === d + 1));
      assert.deepEqual(
        s.filter((x) => x.decade === d + 1),
        decade,
      );
    }
    assert.equal(required({ mode: "whole", set }).length, 13);
  });
}
test("library keys isolate versions and include all mystery prompts", () => {
  assert.equal(library.length, 28);
  assert.equal(
    new Set(
      Object.keys(versions).flatMap((v) => library.map((p) => keyFor(v, p.id))),
    ).size,
    84,
  );
});
test("accurate types and safe dedication filenames", () => {
  assert.equal(extension("audio/mp4;codecs=mp4a.40.2"), "m4a");
  assert.equal(extension("audio/webm;codecs=opus"), "webm");
  assert.equal(extension("audio/ogg"), "ogg");
  assert.throws(() => extension("audio/mpeg"));
  const name = filename(
    "Joyful",
    { subtitle: true, sender: "Tom/Family" },
    "wav",
  );
  assert.ok(name.includes("From TomFamily, with Love"));
  assert.ok(name.endsWith(".wav"));
});
test("PCM header and clipping", () => {
  const h = new DataView(wavHeader(100));
  assert.equal(h.getUint32(40, true), 200);
  assert.equal(h.getUint32(24, true), 24000);
  assert.equal(h.getUint16(22, true), 1);
  assert.deepEqual(
    [...pcm16([new Float32Array([-2, 0, 2])])],
    [-32768, 0, 32767],
  );
});
test("backup rejects unknown versions, keys, types, duplicate entries", () => {
  const r = { id: "hail", version: "current", type: "audio/wav", data: "AAAA" };
  const b = { format: "share-my-prayer", version: 1, recordings: [r] };
  assert.equal(validateBackup(b), b);
  for (const recordings of [
    [{ ...r, version: "bad" }],
    [{ ...r, id: "bad" }],
    [{ ...r, type: "text/html" }],
    [r, r],
    [{ ...r, data: "<script>" }],
  ])
    assert.throws(() => validateBackup({ ...b, recordings }));
});
test("invalid selections rejected", () => {
  for (const s of [
    { set: "bad" },
    { decade: -1 },
    { decade: 5 },
    { mode: "bad" },
  ])
    assert.throws(() => sequence(s));
});
