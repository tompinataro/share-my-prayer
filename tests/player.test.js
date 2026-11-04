import { test } from "node:test";
import assert from "node:assert/strict";
import { Player } from "../audio.js";

test("stale resume rejections cannot revive stopped or newer playback", async () => {
  const NativeAudio = globalThis.Audio;
  const pending = [];
  globalThis.Audio = class {
    pause() {}
    play() {
      return new Promise((resolve, reject) =>
        pending.push({ resolve, reject }),
      );
    }
    removeAttribute() {}
    load() {}
  };
  try {
    const errors = [];
    const player = new Player(
      () => {},
      (error) => errors.push(error),
    );
    const start = player.start([{ blob: new Blob(["audio"]) }]);
    pending.shift().resolve();
    await start;
    player.pause();
    const resume = player.resume();
    player.stop();
    pending.shift().reject(new Error("aborted"));
    await resume;
    assert.equal(player.state, "stopped");
    assert.equal(errors.length, 0);
    const next = player.start([{ blob: new Blob(["next"]) }]);
    player.pause();
    const newer = player.resume();
    pending.shift().reject(new Error("superseded"));
    await next;
    assert.equal(player.state, "playing");
    pending.shift().resolve();
    await newer;
    assert.equal(errors.length, 0);
    player.pause();
    const oldResume = player.resume();
    player.pause();
    const latestResume = player.resume();
    pending.shift().reject(new Error("older resume"));
    await oldResume;
    assert.equal(player.state, "playing");
    pending.shift().resolve();
    await latestResume;
    assert.equal(errors.length, 0);
    player.stop();
  } finally {
    globalThis.Audio = NativeAudio;
  }
});
