import test from "node:test";
import assert from "node:assert/strict";
import {
  library,
  versions,
  keyFor,
  initialWording,
  validateBackup,
} from "../core.js";
import { prayerText } from "../texts.js";
import { createAudioResolver } from "../narrator.js";

test("Classic chooses approved alternative text without changing other wording", () => {
  for (const p of library) {
    const source = p.set
      ? "current"
      : ["creed", "hail", "queen", "closing"].includes(p.id)
        ? "traditional"
        : p.id === "fatima"
          ? "contemporary"
          : "current";
    assert.equal(
      prayerText(p, "classic").text,
      prayerText(p, source).text,
      p.id,
    );
  }
  const hail = library.find((p) => p.id === "hail");
  assert.match(prayerText(hail, "current").text, /with you/);
  assert.match(prayerText(hail, "classic").text, /with thee/);
  assert.match(
    prayerText(
      library.find((p) => p.id === "fatima"),
      "classic",
    ).note,
    /Original Share My Prayer adaptation/,
  );
});
test("new users default Classic; old selections and recordings remain reachable", () => {
  assert.equal(initialWording(undefined, []), "classic");
  for (const v of ["classic", "current", "contemporary"])
    assert.equal(initialWording(v, []), v);
  assert.equal(initialWording("traditional", []), "current");
  assert.equal(initialWording(undefined, [{ version: "current" }]), "current");
  assert.equal(
    initialWording(undefined, [{ version: "contemporary" }]),
    "contemporary",
  );
  assert.equal(initialWording("classic", [{ version: "current" }]), "classic");
});
test("older Current recordings are never relabeled or used for different Classic text", async () => {
  const old = {
    key: "current:hail",
    id: "hail",
    version: "current",
    blob: new Blob(["old personal"], { type: "audio/wav" }),
  };
  const records = new Map([[old.key, old]]);
  const resolver = createAudioResolver(records, {});
  assert.equal((await resolver.resolve("current", "hail")).blob, old.blob);
  assert.equal(resolver.descriptor("classic", "hail"), null);
  assert.equal(records.get(old.key), old);
  assert.equal(records.size, 1);
});
test("backup validation accepts all separate classic/current/contemporary/legacy keys", () => {
  const recordings = Object.keys(versions).flatMap((version) =>
    library.map((p) => ({
      version,
      id: p.id,
      type: "audio/wav",
      data: "YQ==",
    })),
  );
  assert.equal(recordings.length, 112);
  assert.equal(
    validateBackup({ format: "share-my-prayer", version: 1, recordings })
      .recordings.length,
    112,
  );
  const legacy = recordings.filter((r) => r.version !== "classic");
  assert.equal(
    validateBackup({
      format: "share-my-prayer",
      version: 1,
      recordings: legacy,
    }).recordings.length,
    84,
  );
  assert.equal(
    new Set(recordings.map((r) => keyFor(r.version, r.id))).size,
    112,
  );
});

test("Classic has default audio for every prayer and all four complete rosary sets", () => {
  const resolver = createAudioResolver(new Map());
  for (const p of library)
    assert.equal(resolver.descriptor("classic", p.id)?.source, "bella", p.id);
});
