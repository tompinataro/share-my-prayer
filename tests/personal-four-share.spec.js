import { test, expect } from "@playwright/test";
const ids = ["cross", "glory", "hail", "father"];
function recording(value) {
  const bytes = Buffer.alloc(44 + 4800);
  bytes.write("RIFF", 0);
  bytes.writeUInt32LE(bytes.length - 8, 4);
  bytes.write("WAVEfmt ", 8);
  bytes.writeUInt32LE(16, 16);
  bytes.writeUInt16LE(1, 20);
  bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(24000, 24);
  bytes.writeUInt32LE(48000, 28);
  bytes.writeUInt16LE(2, 32);
  bytes.writeUInt16LE(16, 34);
  bytes.write("data", 36);
  bytes.writeUInt32LE(4800, 40);
  for (let n = 0; n < 2400; n++) bytes.writeInt16LE(value, 44 + n * 2);
  return [...bytes];
}
function expectSamples(actual, expected) {
  expect(actual).toHaveLength(expected.length);
  for (let n = 0; n < expected.length; n++)
    expect(Math.abs(actual[n] - expected[n])).toBeLessThanOrEqual(1);
}
async function save(
  page,
  selected = ids,
  version = "classic",
  values = [4096, 8192, 12288, 16384],
) {
  await page.evaluate(
    async ({ entries, version }) => {
      const { saveMany } = await import("./storage.js");
      await saveMany(
        entries.map(({ id, bytes }) => ({
          id,
          version,
          key: `${version}:${id}`,
          blob: new Blob([new Uint8Array(bytes)], { type: "audio/wav" }),
          savedAt: "fixture",
        })),
      );
    },
    {
      entries: selected.map((id) => ({
        id,
        bytes: recording(values[ids.indexOf(id)]),
      })),
      version,
    },
  );
  await page.reload();
}
async function syntheticMicrophone(page, bytes, hold = false) {
  await page.evaluate(
    ({ bytes, hold }) => {
      const stream = () => ({ getTracks: () => [], getAudioTracks: () => [] });
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
          const blob = new Blob(
            [new Uint8Array(window.nextTakeBytes || bytes)],
            { type: "audio/wav" },
          );
          this.ondataavailable?.({ data: blob });
          queueMicrotask(() => this.onstop?.());
        }
      };
      Object.defineProperty(navigator, "mediaDevices", {
        configurable: true,
        value: {
          getUserMedia: () =>
            hold
              ? new Promise(
                  (resolve) =>
                    (window.grantMicrophone = () => resolve(stream())),
                )
              : Promise.resolve(stream()),
        },
      });
    },
    { bytes, hold },
  );
}
async function mockShare(page, outcome = "native") {
  await page.evaluate((outcome) => {
    window.shared = [];
    Object.defineProperty(navigator, "canShare", {
      configurable: true,
      value: () => outcome !== "unsupported",
    });
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async (data) => {
        const file = data.files[0];
        const buffer = await file.arrayBuffer();
        const view = new DataView(buffer);
        window.shared.push({
          name: file.name,
          type: file.type,
          size: file.size,
          samples: [0, 1, 2, 3].map((n) =>
            view.getInt16(44 + n * 4800 + 200, true),
          ),
        });
        if (outcome === "cancelled")
          throw new DOMException("Cancelled", "AbortError");
        if (outcome === "rejected")
          throw new DOMException("Unavailable", "NotAllowedError");
      },
    });
  }, outcome);
}

test("four-prayer Share requires all four personal recordings in the selected wording", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("#home-share-four")).toBeHidden();
  await expect(page.locator("#personal-share-help")).toContainText(
    "After you record the four prayers above,",
  );
  await save(page, ids.slice(0, 3));
  await expect(page.locator("#home-share-four")).toBeHidden();
  await save(page, ["father"]);
  await expect(page.locator("#home-share-four")).toBeVisible();
  await page.locator("#settings-open").click();
  await page.locator("#wording").selectOption("current");
  await page.locator("#settings-done").click();
  await expect(page.locator("#home-share-four")).toBeHidden();
  await page.locator("#settings-open").click();
  await page.locator("#wording").selectOption("classic");
  await page.locator("#settings-done").click();
  await expect(page.locator("#home-share-four")).toBeVisible();
});

for (const outcome of ["native", "cancelled", "unsupported", "rejected"]) {
  test(`personal four-prayer combined ${outcome} keeps order, WAV metadata and replacements`, async ({
    page,
  }) => {
    await page.goto("/");
    await save(page);
    await mockShare(page, outcome);
    const downloads = [];
    page.on("download", (d) => downloads.push(d));
    await page.locator("#home-share-four").click();
    await expect(page.locator("#home-share-four")).toBeEnabled();
    if (outcome !== "unsupported") {
      const shared = await page.evaluate(() => window.shared[0]);
      expect(shared).toMatchObject({
        type: "audio/wav",
        size: 44 + 4 * 4800,
      });
      expectSamples(shared.samples, [4096, 8192, 12288, 16384]);
      expect(shared.name).toMatch(/Four prayers.*Classic prayers.*\.wav$/);
    }
    if (["unsupported", "rejected"].includes(outcome)) {
      await expect.poll(() => downloads.length).toBe(1);
      const { readFile } = await import("node:fs/promises");
      const bytes = await readFile(await downloads[0].path());
      expect(downloads[0].suggestedFilename()).toMatch(/Four prayers.*\.wav$/);
      expectSamples(
        [0, 1, 2, 3].map((n) => bytes.readInt16LE(44 + n * 4800 + 200)),
        [4096, 8192, 12288, 16384],
      );
    } else {
      await page.waitForTimeout(100);
      expect(downloads).toHaveLength(0);
    }
    if (outcome === "native") {
      await save(page, ["glory"], "classic", [4096, 2048, 12288, 16384]);
      await mockShare(page);
      await page.locator("#home-share-four").click();
      await expect(page.locator("#home-share-four")).toBeEnabled();
      expectSamples(
        await page.evaluate(() => window.shared[0].samples),
        [4096, 2048, 12288, 16384],
      );
    }
    expect(
      await page.evaluate(
        async () =>
          (await (await import("./storage.js")).allRecordings()).length,
      ),
    ).toBe(4);
  });
}

test("personal assembly is guarded while busy and recording, and failures can retry", async ({
  page,
}) => {
  await page.goto("/");
  await save(page);
  await mockShare(page);
  await page.evaluate(() => {
    const original = AudioContext.prototype.decodeAudioData;
    window.originalDecode = original;
    let first = true;
    AudioContext.prototype.decodeAudioData = async function (bytes) {
      if (first) {
        first = false;
        await new Promise((resolve) => (window.releaseDecode = resolve));
      }
      return original.call(this, bytes);
    };
  });
  await page.locator("#home-share-four").click();
  await expect(page.locator("#home-share-four")).toBeDisabled();
  await page.locator("#home-share-four").evaluate((button) => button.click());
  await page.locator("#settings-open").click();
  await expect(page.locator("#settings-dialog")).toBeHidden();
  await page.evaluate(() => window.releaseDecode());
  await expect(page.locator("#home-share-four")).toBeEnabled();
  expect(await page.evaluate(() => window.shared.length)).toBe(1);
  await page.evaluate(() => {
    AudioContext.prototype.decodeAudioData = async () => {
      throw new Error("fixture decode failure");
    };
  });
  await page.locator("#home-share-four").click();
  await expect(page.locator("#notice")).toContainText("fixture decode failure");
  await expect(page.locator("#home-share-four")).toBeEnabled();
  await page.evaluate(
    () => (AudioContext.prototype.decodeAudioData = window.originalDecode),
  );
  await page.locator("#home-share-four").click();
  await expect(page.locator("#home-share-four")).toBeEnabled();
  expect(await page.evaluate(() => window.shared.length)).toBe(2);
  await syntheticMicrophone(page, recording(2048), true);
  await page.locator('#prayers [data-prayer="hail"]').click();
  await page.locator("#record").click();
  await expect(page.locator("#home-share-four")).toBeDisabled();
  await page.evaluate(() => window.grantMicrophone());
  await expect(page.locator("#record-stop")).toBeVisible();
  await expect(page.locator("#home-share-four")).toBeDisabled();
  await page.locator("#record-stop").click();
  await expect(page.locator("#draft")).toBeVisible();
  await expect(page.locator("#home-share-four")).toBeDisabled();
  await page.locator("#discard").click();
  await expect(page.locator("#home-share-four")).toBeEnabled();
});

test("personal four-prayer Share fits the phone and is accessible", async ({
  page,
}) => {
  await page.goto("/");
  await save(page);
  for (const width of [1280, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    const button = page.locator("#home-share-four");
    await expect(button).toHaveAccessibleName(
      "Share these four prayers together",
    );
    expect((await button.boundingBox()).height).toBeGreaterThanOrEqual(44);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/${test.info().project.name}-personal-four-${width}.png`,
    });
  }
});

test("saving the fourth prayer and replacing a take updates combined Share without reload", async ({
  page,
}) => {
  await page.goto("/");
  await save(page, ids.slice(0, 3));
  await syntheticMicrophone(page, recording(16384));
  await mockShare(page);
  await expect(page.locator("#home-share-four")).toBeHidden();
  await page.locator('#prayers [data-prayer="father"]').click();
  await page.locator("#record").click();
  await page.locator("#record-stop").click();
  await expect(page.locator("#home-share-four")).toBeHidden();
  await page.locator("#save-recording").click();
  await page.locator("#prayer-close").click();
  await expect(page.locator("#home-share-four")).toBeVisible();
  await page.locator("#home-share-four").click();
  await expect(page.locator("#home-share-four")).toBeEnabled();
  expectSamples(
    await page.evaluate(() => window.shared[0].samples),
    [4096, 8192, 12288, 16384],
  );
  await page.evaluate(
    (bytes) => (window.nextTakeBytes = bytes),
    recording(2048),
  );
  await page.locator('#prayers [data-prayer="hail"]').click();
  await page.locator("#record").click();
  await page.locator("#record-stop").click();
  await expect(page.locator("#home-share-four")).toBeDisabled();
  await page.locator("#save-recording").click();
  await page.locator("#prayer-close").click();
  await page.locator("#home-share-four").click();
  await expect(page.locator("#home-share-four")).toBeEnabled();
  expectSamples(
    await page.evaluate(() => window.shared[1].samples),
    [4096, 8192, 2048, 16384],
  );
});

test("home sharing instruction has the exact three centered lines and safe text enlargement", async ({
  page,
}) => {
  await page.goto("/");
  const note = page.locator("#personal-share-help");
  await expect(note.locator("span")).toHaveText([
    "After you record the four prayers above,",
    "in your own voice, you can share them.",
    "🙏",
  ]);
  await expect(note.locator("br")).toHaveCount(2);
  await expect(note).toHaveCSS("text-align", "center");
  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: 1000 });
    const result = await note.evaluate((el) => ({
      lines: [...el.querySelectorAll("span")].map((span) => {
        const range = document.createRange();
        range.selectNodeContents(span);
        return range.getClientRects().length;
      }),
      overflow:
        el.scrollWidth > el.clientWidth ||
        document.documentElement.scrollWidth > innerWidth,
    }));
    expect(result.lines).toEqual([1, 1, 1]);
    expect(result.overflow).toBe(false);
    await page.screenshot({
      path: `test-results/${test.info().project.name}-home-copy-${width}.png`,
    });
  }
  await page.setViewportSize({ width: 320, height: 1000 });
  await page.evaluate(() => (document.documentElement.style.fontSize = "32px"));
  expect(
    await note.evaluate(
      (el) =>
        el.scrollWidth <= el.clientWidth &&
        document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `test-results/${test.info().project.name}-home-copy-enlarged.png`,
  });
});
