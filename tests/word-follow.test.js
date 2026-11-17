import test from "node:test";
import assert from "node:assert/strict";
import { maryTiming } from "../mary-timing.js";
import { maryUndoerText } from "../texts.js";
import { wordAtTime } from "../word-follow.js";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
test("all 2870 spoken words match displayed text and audio identity", () => {
  assert.deepEqual(
    maryTiming.words.map((w) => w.word),
    maryUndoerText.split(/\s+/),
  );
  assert.equal(maryTiming.words.length, 2870);
  assert.equal(
    createHash("sha256")
      .update(
        readFileSync(
          new URL(
            "../narration/bella/mary-undoer-timed-20261116.mp3",
            import.meta.url,
          ),
        ),
      )
      .digest("hex"),
    maryTiming.audioSha256,
  );
});
test("timestamps find every word after forward and backward seeks, no drift", () => {
  for (const i of [...maryTiming.words.keys()].reverse()) {
    const w = maryTiming.words[i];
    assert.ok(w.end > w.start);
    if (i) assert.ok(w.start >= maryTiming.words[i - 1].end, `${i}: ${w.word}`);
    assert.equal(wordAtTime(maryTiming.words, (w.start + w.end) / 2), i);
  }
  assert.equal(wordAtTime(maryTiming.words, -1), -1);
  assert.equal(wordAtTime(maryTiming.words, maryTiming.duration), -1);
});
test("58 one-second Amen inserts and preserved five-second request silence have no underline", () => {
  assert.equal(maryTiming.pauses.filter((p) => p[2] === "amen").length, 58);
  for (const [start, end, kind] of maryTiming.pauses) {
    assert.ok(Math.abs(end - start - (kind === "amen" ? 1 : 5)) < 0.00001);
    assert.equal(wordAtTime(maryTiming.words, (start + end) / 2), -1);
  }
});

import { ordinaryTiming } from "../ordinary-timing.js";
import { narratorClips } from "../narrator-manifest.js";
import { prayerText } from "../texts.js";
import { library } from "../core.js";
import { timingFor } from "../word-follow.js";
test("all eleven ordinary Bella wording entries match canonical text, media and timing", () => {
  assert.equal(Object.keys(ordinaryTiming).length, 11);
  for (const [key, timing] of Object.entries(ordinaryTiming)) {
    const [version, id] = key.split(":");
    const text = prayerText(
      library.find((p) => p.id === id),
      version,
    ).text;
    assert.equal(
      timing.words.map((w) => w.word).join(" "),
      text.split(/\s+/).join(" "),
    );
    assert.equal(timing.audioSha256, narratorClips[key].sha256);
    assert.equal(
      createHash("sha256")
        .update(
          readFileSync(
            new URL("../" + narratorClips[key].path, import.meta.url),
          ),
        )
        .digest("hex"),
      timing.audioSha256,
    );
    timing.words.forEach((w, i) => {
      assert.ok(w.end > w.start);
      if (i) assert.ok(w.start >= timing.words[i - 1].end);
      assert.equal(wordAtTime(timing.words, (w.start + w.end) / 2), i);
    });
    assert.equal(timingFor({ version, id, source: "personal" }), null);
  }
});
