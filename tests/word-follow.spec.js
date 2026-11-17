import { test, expect } from "@playwright/test";
import { maryTiming } from "../mary-timing.js";
test("Mary real playback follows word clock through seeking, silence, pause and resume", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const Native = window.Audio;
    window.Audio = function (...args) {
      const a = new Native(...args);
      window.testPlayerAudio = a;
      return a;
    };
  });
  await page.goto("/");
  await page.getByRole("button", { name: /Mary.*Knots/ }).click();
  await expect(page.locator("#prayer-text span")).toHaveCount(2870);
  await page.locator("#individual-play").click();
  await expect
    .poll(() => page.evaluate(() => window.testPlayerAudio.currentTime))
    .toBeGreaterThan(0.1);
  for (const i of [0, 15, 94, 151, 500, 1600, 2869]) {
    const word = maryTiming.words[i];
    await page.evaluate(
      (t) => {
        window.testPlayerAudio.playbackRate = 0.1;
        window.testPlayerAudio.currentTime = t;
      },
      (word.start + word.end) / 2,
    );
    await expect(page.locator("#prayer-text .spoken-word")).toHaveText(
      word.word,
    );
    await expect
      .poll(() =>
        page.evaluate(() => {
          const word = document
            .querySelector(".spoken-word")
            .getBoundingClientRect();
          const view = document
            .querySelector("#prayer-dialog")
            .getBoundingClientRect();
          return word.top >= view.top && word.bottom <= view.bottom;
        }),
      )
      .toBe(true);
  }
  for (const [start, end] of [
    maryTiming.pauses[0],
    maryTiming.pauses.find((p) => p[2] === "request"),
    maryTiming.pauses[30],
  ]) {
    await page.evaluate(
      (t) => (window.testPlayerAudio.currentTime = t),
      (start + end) / 2,
    );
    await expect(page.locator(".spoken-word")).toHaveCount(0);
  }
  await page.locator("#individual-play").click();
  await expect(page.locator(".spoken-word")).toHaveCount(0);
  await page.evaluate(
    (t) => (window.testPlayerAudio.currentTime = t),
    maryTiming.words[500].start + 0.03,
  );
  await page.locator("#individual-play").click();
  await expect(page.locator(".spoken-word")).toHaveText(
    maryTiming.words[500].word,
  );
  await page.keyboard.press("Escape");
  await expect(page.locator(".spoken-word")).toHaveCount(0);
});

import { ordinaryTiming } from "../ordinary-timing.js";
test("all built-in ordinary prayers follow and scroll, including contemporary compound wording", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const Native = window.Audio;
    window.Audio = function (...args) {
      const a = new Native(...args);
      window.testPlayerAudio = a;
      return a;
    };
  });
  await page.goto("/");
  for (const [key, timing] of Object.entries(ordinaryTiming)) {
    const [version, id] = key.split(":");
    await page.locator("#settings-open").click();
    await page.locator("#wording").selectOption(version);
    await page.keyboard.press("Escape");
    await page.locator(`#prayers [data-prayer="${id}"]`).click();
    await expect(page.locator("#prayer-text span")).toHaveCount(
      timing.words.length,
    );
    await page.locator("#individual-play").click();
    await expect
      .poll(() => page.evaluate(() => window.testPlayerAudio.currentTime))
      .toBeGreaterThan(0);
    for (const index of [
      0,
      Math.floor(timing.words.length / 2),
      timing.words.length - 1,
    ]) {
      const word = timing.words[index];
      await page.evaluate(
        (t) => {
          window.testPlayerAudio.playbackRate = 0.1;
          window.testPlayerAudio.currentTime = t;
        },
        (word.start + word.end) / 2,
      );
      await expect(page.locator(".spoken-word")).toHaveText(word.word);
      await expect
        .poll(() =>
          page.evaluate(() => {
            const w = document
                .querySelector(".spoken-word")
                .getBoundingClientRect(),
              v = document
                .querySelector("#prayer-dialog")
                .getBoundingClientRect();
            return w.top >= v.top && w.bottom <= v.bottom;
          }),
        )
        .toBe(true);
    }
    await page.keyboard.press("Escape");
  }
});
