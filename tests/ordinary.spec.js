import { test, expect } from "@playwright/test";

function wav(samples = 2400) {
  const b = Buffer.alloc(44 + samples * 2);
  b.write("RIFF", 0);
  b.writeUInt32LE(b.length - 8, 4);
  b.write("WAVEfmt ", 8);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22);
  b.writeUInt32LE(24000, 24);
  b.writeUInt32LE(48000, 28);
  b.writeUInt16LE(2, 32);
  b.writeUInt16LE(16, 34);
  b.write("data", 36);
  b.writeUInt32LE(samples * 2, 40);
  for (let n = 0; n < samples; n++)
    b.writeInt16LE(
      Math.round(4000 * Math.sin((n * 440 * 2 * Math.PI) / 24000)),
      44 + n * 2,
    );
  return [...b];
}

test("ordinary app removes Rosary navigation while preserving exact instructions and independent preferences", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() =>
    localStorage.setItem(
      "pmr-settings",
      JSON.stringify({ version: "contemporary", sender: "Rosary sentinel" }),
    ),
  );
  await page.goto("/");
  await expect(page.locator("#prayers button")).toHaveText([
    "Sign of the Cross",
    "Glory Be",
    "Hail Mary",
    "Our Father",
  ]);
  for (const id of [
    "rosary-open",
    "rosary-menu",
    "rosary-dialog",
    "mystery-list",
    "settings-mode",
  ])
    await expect(page.locator(`#${id}`)).toHaveCount(0);
  await expect(page.locator("#personal-share-help span")).toHaveText([
    "After you record the four prayers above,",
    "in your own voice, you can share them.",
    "🙏",
  ]);
  await page.locator("#settings-open").click();
  await expect(page.locator("#saved-count")).toContainText("0 / 4 saved");
  await expect(page.locator("#wording")).toHaveValue("classic");
  await expect(page.locator("#rosary-migration-note")).toContainText(
    "Nothing is moved or deleted automatically",
  );
  await expect(page.locator(".sources")).toContainText("Bella AI narration");
  await page.locator("#wording").selectOption("current");
  await page.keyboard.press("Escape");
  await expect(page.locator("#settings-open")).toBeFocused();
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem("pmr-settings"))),
  ).toEqual({ version: "contemporary", sender: "Rosary sentinel" });
  await page.locator('#prayers [data-prayer="hail"]').click();
  await expect(page.locator(".prayer-instructions span")).toHaveText([
    "Record, then save and share your own voice or",
    "Play the default voice already provided.",
  ]);
  await page.keyboard.press("Escape");
  await expect(page.locator('#prayers [data-prayer="hail"]')).toBeFocused();
  expect(errors).toEqual([]);
});

test("full legacy Rosary recordings remain exported, cancel-safe, restorable and persistent", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(async (bytes) => {
    const { saveMany } = await import("./storage.js");
    await saveMany(
      [
        ["classic", "hail"],
        ["current", "creed"],
        ["traditional", "Joyful-0"],
        ["contemporary", "closing"],
      ].map(([version, id]) => ({
        key: `${version}:${id}`,
        version,
        id,
        blob: new Blob([new Uint8Array(bytes)], { type: "audio/wav" }),
        savedAt: "legacy-fixture",
      })),
    );
    localStorage.setItem(
      "smp-prompt:traditional:Joyful-0",
      "Legacy mystery prompt",
    );
  }, wav());
  await page.reload();
  await page.locator("#settings-open").click();
  await page.locator("#wording").selectOption("classic");
  await expect(page.locator("#saved-count")).toContainText("1 / 4 saved");
  const download = page.waitForEvent("download");
  await page.locator("#backup").click();
  const path = await (await download).path();
  const { readFile } = await import("node:fs/promises");
  const backup = JSON.parse(await readFile(path, "utf8"));
  expect(backup.format).toBe("share-my-prayer");
  expect(backup.recordings).toHaveLength(4);
  expect(backup.prompts["traditional:Joyful-0"]).toBe("Legacy mystery prompt");
  expect(backup.recordings.map((r) => `${r.version}:${r.id}`).sort()).toEqual([
    "classic:hail",
    "contemporary:closing",
    "current:creed",
    "traditional:Joyful-0",
  ]);
  await page.locator("#restore").setInputFiles(path);
  await expect(page.locator("#restore-summary")).toContainText("4 recordings");
  await page.locator("#restore-cancel").click();
  expect(
    await page.evaluate(
      async () => (await (await import("./storage.js")).allRecordings()).length,
    ),
  ).toBe(4);
  await page.evaluate(async () => {
    const d = await (await import("./storage.js")).db();
    await new Promise((resolve, reject) => {
      const tx = d.transaction("recordings", "readwrite");
      tx.objectStore("recordings").clear();
      tx.oncomplete = resolve;
      tx.onerror = reject;
    });
  });
  await page.reload();
  await page.locator("#settings-open").click();
  await page.locator("#restore").setInputFiles(path);
  await page.evaluate(() => {
    const original = Blob.prototype.arrayBuffer;
    let first = true;
    Blob.prototype.arrayBuffer = async function () {
      if (first) {
        first = false;
        await new Promise((resolve) => (window.finishRestore = resolve));
      }
      return original.call(this);
    };
  });
  await page.locator("#restore-confirm").click();
  await page.keyboard.press("Escape");
  await expect(page.locator("#restore-dialog")).toBeVisible();
  await page.locator("#restore-cancel").click();
  await expect(page.locator("#restore-dialog")).toBeVisible();
  await expect(page.locator("#notice")).toContainText(
    "Wait for the current restore",
  );
  await page.evaluate(() => window.finishRestore());
  await expect(page.locator("#notice")).toContainText("Recordings restored");
  await page.reload();
  const data = await page.evaluate(async () => {
    const { allRecordings, db } = await import("./storage.js");
    const rows = await allRecordings();
    const d = await db();
    const raw = await new Promise((resolve) => {
      const r = d.transaction("recordings").objectStore("recordings").getAll();
      r.onsuccess = () => resolve(r.result);
    });
    return {
      rows: rows.map((r) => [r.key, r.blob.size, r.savedAt]),
      rawBytes: raw.every((r) => r.bytes instanceof ArrayBuffer && !r.blob),
    };
  });
  expect(data.rows).toHaveLength(4);
  expect(
    data.rows.every((r) => r[1] === 4844 && r[2] === "legacy-fixture"),
  ).toBe(true);
  expect(data.rawBytes).toBe(true);
});

test("ordinary recording review, save, reload, pause/resume and repeated Back remain usable", async ({
  page,
}) => {
  await page.addInitScript((bytes) => {
    const blob = new Blob([new Uint8Array(bytes)], { type: "audio/wav" });
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: async () => ({
          getTracks: () => [],
          getAudioTracks: () => [],
        }),
      },
    });
    window.MediaRecorder = class {
      static isTypeSupported() {
        return false;
      }
      constructor() {
        this.mimeType = "audio/wav";
        this.state = "inactive";
      }
      start() {
        this.state = "recording";
      }
      stop() {
        this.state = "inactive";
        this.ondataavailable?.({ data: blob });
        queueMicrotask(() => this.onstop?.());
      }
    };
    const NativeAudio = window.Audio;
    window.playbackAudio = [];
    window.Audio = function (...args) {
      const audio = new NativeAudio(...args);
      window.playbackAudio.push(audio);
      return audio;
    };
  }, wav(72000));
  await page.goto("/");
  await page.locator('#prayers [data-prayer="hail"]').click();
  await page.locator("#record").click();
  await expect(page.locator("#record-stop")).toBeVisible();
  await page.locator("#record-stop").click();
  await expect(page.locator("#draft")).toBeVisible();
  await page.locator("#save-recording").click();
  await expect(page.locator("#play-label")).toHaveText("Play saved");
  await page.locator("#prayer-close").click();
  await page.reload();
  for (let n = 0; n < 2; n++) {
    await page.locator('#prayers [data-prayer="hail"]').click();
    const play = page.locator("#individual-play");
    await expect(play).toHaveAccessibleName("Play saved");
    await play.click();
    await expect(play).toHaveAccessibleName("Pause");
    await expect(play).toBeEnabled();
    await play.click();
    await expect(play).toHaveAccessibleName("Resume");
    await play.click();
    await expect(play).toHaveAccessibleName("Pause");
    await page.keyboard.press("Escape");
    await expect(page.locator('#prayers [data-prayer="hail"]')).toBeFocused();
    expect(
      await page.evaluate(() =>
        window.playbackAudio.every(
          (audio) => audio.paused && !audio.getAttribute("src"),
        ),
      ),
    ).toBe(true);
  }
});

test("ordinary mobile layouts and enlarged instructions remain readable", async ({
  page,
}) => {
  await page.goto("/");
  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/${test.info().project.name}-ordinary-home-${width}.png`,
    });
  }
});

test("packaged ordinary app contains only four-prayer public defaults and still plays", async ({
  page,
}) => {
  await page.goto("/dist/");
  const ids = await page.evaluate(async () =>
    Object.keys((await import("./narrator-manifest.js")).narratorClips).map(
      (key) => key.split(":")[1],
    ),
  );
  expect(ids.length).toBeGreaterThan(0);
  expect(
    ids.every((id) => ["cross", "glory", "hail", "father"].includes(id)),
  ).toBe(true);
  await page.locator('#prayers [data-prayer="father"]').click();
  await page.locator("#individual-play").click();
  await expect(page.locator("#individual-play")).toHaveAccessibleName("Pause");
  await expect(page.locator("#individual-play")).toBeEnabled();
  await page.locator("#prayer-close").click();
  await expect(page.locator('#prayers [data-prayer="father"]')).toBeFocused();
});

test("slow backup parsing holds Settings open and cannot overlap another import", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#settings-open").click();
  await page.evaluate(() => {
    const read = File.prototype.text;
    let first = true;
    File.prototype.text = async function () {
      if (first) {
        first = false;
        await new Promise((resolve) => (window.finishBackupRead = resolve));
      }
      return read.call(this);
    };
  });
  const backup = {
    format: "share-my-prayer",
    version: 1,
    recordings: [
      { id: "cross", version: "classic", type: "audio/wav", data: "AQID" },
    ],
    prompts: {},
  };
  await page.locator("#restore").setInputFiles({
    name: "fixture.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await page.keyboard.press("Escape");
  await expect(page.locator("#settings-dialog")).toBeVisible();
  await page.locator("#settings-done").click();
  await expect(page.locator("#settings-dialog")).toBeVisible();
  await expect(page.locator("#restore-dialog")).toBeHidden();
  await page.evaluate(() => window.finishBackupRead());
  await expect(page.locator("#restore-summary")).toContainText("1 recordings");
  await page.locator("#restore-confirm").click();
  await expect(page.locator("#restore-dialog")).toBeHidden();
  await expect(page.locator("#saved-count")).toContainText("1 / 4 saved");
});

test("Mary prayer is separate from the four-prayer bundle and has cleaned complete text", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("#prayers button")).toHaveCount(4);
  await page
    .getByRole("button", { name: "Mary Undoer of Knots", exact: true })
    .click();
  await expect(page.locator("#prayer-text")).toContainText(
    "Say the first 3 decades of the Rosary.",
  );
  await expect(page.locator("#prayer-text")).toContainText(
    "Say the last 2 decades of the Rosary.",
  );
  await expect(page.locator("#prayer-text")).toContainText("You are my hope.");
  expect(await page.locator("#prayer-text").textContent()).not.toMatch(/[\\…]/);
  await page.keyboard.press("Escape");
  await expect(page.locator("#additional-prayers button")).toBeFocused();
});
