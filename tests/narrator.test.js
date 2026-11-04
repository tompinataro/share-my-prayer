import test from "node:test";
import assert from "node:assert/strict";
import { createAudioResolver, sessionReadinessMessage } from "../narrator.js";
import { narratorClips } from "../narrator-manifest.js";
const path = "./narration/bella/current/hail.mp3";
const audio = () =>
  new Blob(["test fixture, not speech"], { type: "audio/mpeg" });
const response = () => ({ ok: true, blob: async () => audio() });
test("preview contains 79 mappings and excludes every held or excluded Current default", () => {
  assert.equal(Object.keys(narratorClips).length, 79);
  for (const id of ["hail", "queen", "fatima", "closing", "creed"])
    assert.equal(narratorClips[`current:${id}`], undefined);
  assert.equal(
    new Set(Object.values(narratorClips).map((c) => c.path)).size,
    35,
  );
});
test("personal recordings always override Bella without fetching or mutation", async () => {
  const saved = {
    key: "current:hail",
    id: "hail",
    version: "current",
    blob: audio(),
    savedAt: "unchanged",
  };
  const records = new Map([[saved.key, saved]]);
  const resolver = createAudioResolver(
    records,
    { [saved.key]: { path } },
    () => {
      throw Error("unexpected fetch");
    },
  );
  assert.equal((await resolver.resolve("current", "hail")).blob, saved.blob);
  assert.equal(resolver.descriptor("current", "hail").source, "personal");
  assert.equal(records.get(saved.key), saved);
  assert.equal(records.size, 1);
});
test("Bella fallback deduplicates downloads and uses separate export keys", async () => {
  let count = 0;
  const records = new Map();
  const resolver = createAudioResolver(
    records,
    { "current:hail": { path } },
    async () => {
      count++;
      return response();
    },
  );
  const [a, b] = await Promise.all([
    resolver.resolve("current", "hail"),
    resolver.resolve("current", "hail"),
  ]);
  assert.equal(count, 1);
  assert.equal(a.blob, b.blob);
  assert.equal(a.key, "bella:current:hail");
  assert.equal(records.size, 0);
  assert.equal(resolver.descriptor("contemporary", "hail"), null);
});
test("saving personal audio takes precedence even after Bella is cached", async () => {
  const records = new Map();
  const resolver = createAudioResolver(
    records,
    { "current:hail": { path } },
    async () => response(),
  );
  await resolver.resolve("current", "hail");
  const own = audio();
  records.set("current:hail", { key: "current:hail", blob: own });
  assert.equal((await resolver.resolve("current", "hail")).blob, own);
});
test("failed narrator fetches can retry and never modify personal storage", async () => {
  let count = 0;
  const resolver = createAudioResolver(
    new Map(),
    { "current:hail": { path } },
    async () => (++count === 1 ? { ok: false } : response()),
  );
  await assert.rejects(
    resolver.resolve("current", "hail"),
    /could not be loaded/,
  );
  assert.ok((await resolver.resolve("current", "hail")).blob);
  assert.equal(count, 2);
});
test("missing, remote, and non-audio assets reject safely", async () => {
  await assert.rejects(
    createAudioResolver(new Map()).resolve("current", "hail"),
    /not available/,
  );
  await assert.rejects(
    createAudioResolver(new Map(), {
      "current:hail": { path: "https://example.com/audio.mp3" },
    }).resolve("current", "hail"),
    /Invalid/,
  );
  await assert.rejects(
    createAudioResolver(new Map(), { "current:hail": { path } }, async () => ({
      ok: true,
      blob: async () => new Blob(["html"], { type: "text/html" }),
    })).resolve("current", "hail"),
    /unsupported/,
  );
});

test("readiness explains missing personal recordings without claiming ready", () => {
  const names = [
    "Apostles’ Creed",
    "Hail Mary",
    "Fatima Prayer (O my Jesus)",
    "Hail Holy Queen",
    "Rosary Closing Prayer",
  ];
  const message = sessionReadinessMessage(names);
  assert.match(message, /needs 5 personal recordings/);
  for (const name of names) assert.ok(message.includes(name));
  assert.match(message, /Bella audio is not available/);
  assert.match(message, /Record and Save/);
  assert.ok(!message.includes("Ready when you are"));
  assert.equal(sessionReadinessMessage([]), "Ready when you are.");
  assert.match(
    sessionReadinessMessage(["Hail Mary"]),
    /needs 1 personal recording:/,
  );
});
