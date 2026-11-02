import { test, expect } from "@playwright/test";
const tone = () => {
  const a = new Uint8Array(44 + 4800);
  const d = new DataView(a.buffer);
  const str = (i, s) =>
    [...s].forEach((c, j) => d.setUint8(i + j, c.charCodeAt(0)));
  str(0, "RIFF");
  d.setUint32(4, a.length - 8, true);
  str(8, "WAVE");
  str(12, "fmt ");
  d.setUint32(16, 16, true);
  d.setUint16(20, 1, true);
  d.setUint16(22, 1, true);
  d.setUint32(24, 24000, true);
  d.setUint32(28, 48000, true);
  d.setUint16(32, 2, true);
  d.setUint16(34, 16, true);
  str(36, "data");
  d.setUint32(40, 4800, true);
  for (let i = 0; i < 2400; i++)
    d.setInt16(
      44 + i * 2,
      Math.sin((i / 24000) * 440 * 2 * Math.PI) * 5000,
      true,
    );
  return Buffer.from(a);
};

// Synthetic capture fixture for cross-engine recording/storage tests. Chromium
// also exercises the real MediaRecorder with its fake microphone separately.
async function syntheticMicrophone(page) {
  await page.addInitScript(
    (bytes) => {
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
    },
    [...tone()],
  );
}
async function recordTake(page) {
  await page.locator("#record").click();
  await expect(page.locator("#record-stop")).toBeVisible();
  await page.locator("#record-stop").click();
  await expect(page.locator("#draft")).toBeVisible();
}
async function seed(page) {
  await page.evaluate(
    async (bytes) => {
      const { library, versions, keyFor } = await import("./core.js");
      const { saveMany } = await import("./storage.js");
      const blob = new Blob([new Uint8Array(bytes)], { type: "audio/wav" });
      await saveMany(
        Object.keys(versions).flatMap((version) =>
          library.map((p) => ({
            id: p.id,
            version,
            key: keyFor(version, p.id),
            blob,
            type: blob.type,
            savedAt: new Date().toISOString(),
          })),
        ),
      );
    },
    [...tone()],
  );
  await page.reload();
  await expect(page.locator("#saved-count")).toContainText("28 / 28");
}
test("responsive layout, mystery selection, settings and quiet reading view", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("h1")).toContainText("Share My Prayer");
  await expect(page.locator("#start")).toBeDisabled();
  await expect(page.locator("#missing")).toHaveCount(0);
  await page.locator("#settings-open").click();
  await page.locator("#mysteries-details summary").click();
  await expect(page.locator("#mystery-list button")).toHaveCount(20);
  await page.locator('#mystery-list [data-prayer="Joyful-0"]').click();
  await expect(page.locator("#prayer-title")).toHaveText("The Annunciation");
  await expect(page.locator("#record-state")).toBeHidden();
  await expect(page.locator("#prayer-dialog")).not.toContainText(
    /missing recording/i,
  );
  await page.locator("#prayer-close").click();
  await page.locator("#wording").selectOption("contemporary");
  await page.locator("#subtitle").check();
  await page.locator("#sender").fill("Tom");
  await page.locator("#settings-done").click();
  await expect(page.locator("#dedication")).toHaveText(
    "Made just for you. From Tom, with Love",
  );
  await page.locator('#prayers [data-prayer="father"]').click();
  await expect(page.locator("#prayer-text")).toContainText(
    "Save us from the time of trial",
  );
  await expect(page.locator("#record-state")).toBeHidden();
  await page.locator("#prayer-close").click();
  await page.locator("#rosary-open").click();
  for (const set of ["Joyful", "Luminous", "Sorrowful", "Glorious"]) {
    await page.locator("#set").selectOption(set);
    await expect(page.locator("#decade option")).toHaveCount(5);
    await page.locator("#decade").selectOption("4");
    await expect(page.locator("#decade")).toHaveValue("4");
    await expect(page.locator("#session-summary")).toContainText("One decade");
  }
  await expect(page.locator("#rosary-dialog")).not.toContainText(
    /missing recording|record .* missing/i,
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.reload();
  await expect(page.locator("#dedication")).toContainText("Tom");
});
test("record, save, reload, replay and separate versions; draft preserves previous take", async ({
  page,
}) => {
  await syntheticMicrophone(page);
  await page.goto("/");
  await page.locator('#prayers [data-prayer="hail"]').click();
  await recordTake(page);
  await page.locator("#save-recording").click();
  await expect(page.locator("#record-state")).toContainText("Saved");
  await page.reload();
  await page.locator('#prayers [data-prayer="hail"]').click();
  await page.locator("#individual-play").click();
  await expect(page.locator("#record-state")).toContainText("Playing");
  await page.locator("#individual-stop").click();
  const download = page.waitForEvent("download");
  await page.locator("#individual-download").click();
  expect((await download).suggestedFilename()).toMatch(/\.wav$/);
  await recordTake(page);
  await expect(page.locator("#draft")).toBeVisible();
  await page.locator("#discard").click();
  await expect(page.locator("#record-state")).toContainText("Saved");
  await page.locator("#prayer-close").click();
  await page.locator("#settings-open").click();
  await page.locator("#wording").selectOption("contemporary");
  await page.locator("#settings-done").click();
  await page.locator('#prayers [data-prayer="hail"]').click();
  await expect(page.locator("#record-state")).toBeHidden();
});
test("sequence export is real combined WAV; share fallback; backup restore", async ({
  page,
}) => {
  await page.goto("/");
  await seed(page);
  await page.locator("#rosary-open").click();
  await page.locator("#export").click();
  await expect(page.locator("#export-result")).toBeVisible();
  const bytes = await page
    .locator("#export-download")
    .evaluate(async (a) => [
      ...new Uint8Array(await (await fetch(a.href)).arrayBuffer()),
    ]);
  expect(bytes.length).toBe(44 + 14 * 4800);
  expect(String.fromCharCode(...bytes.slice(0, 4))).toBe("RIFF");
  await page.locator("#mode").selectOption("whole");
  await page.locator("#export").click();
  await expect(page.locator("#export-result")).toBeVisible();
  expect(
    await page
      .locator("#export-download")
      .evaluate(
        async (a) => (await (await fetch(a.href)).arrayBuffer()).byteLength,
      ),
  ).toBe(44 + 80 * 4800);
  await page.evaluate(() => {
    Object.defineProperty(navigator, "canShare", {
      value: () => false,
      configurable: true,
    });
  });
  const shareDownload = page.waitForEvent("download");
  await page.locator("#export-share").click();
  expect((await shareDownload).suggestedFilename()).toContain("Whole Rosary");
  await page.locator("#rosary-close").click();
  await page.locator("#settings-open").click();
  const backup = page.waitForEvent("download");
  await page.locator("#backup").click();
  const file = await backup;
  const path = await file.path();
  await page.evaluate(async () => {
    const { db } = await import("./storage.js");
    const d = await db();
    await new Promise((res, rej) => {
      const t = d.transaction("recordings", "readwrite");
      t.objectStore("recordings").clear();
      t.oncomplete = res;
      t.onerror = rej;
    });
  });
  await page.reload();
  await expect(page.locator("#saved-count")).toContainText("0 / 28");
  await page.locator("#restore").setInputFiles(path);
  await expect(page.locator("#restore-summary")).toContainText("84 recordings");
  await page.locator("#restore-confirm").click();
  await expect(page.locator("#saved-count")).toContainText("28 / 28");
  await expect(page.locator("#start")).toBeEnabled();
});
test("pause/resume stop do not overlap and reject incomplete sessions", async ({
  page,
}) => {
  await page.goto("/");
  await seed(page);
  await page.locator("#rosary-open").click();
  await page.locator("#start").click();
  await page.locator("#pause").click();
  await expect(page.locator("#play-status")).toContainText("Paused");
  await page.waitForTimeout(300);
  const paused = await page.locator("#play-status").textContent();
  await page.waitForTimeout(300);
  expect(await page.locator("#play-status").textContent()).toBe(paused);
  await page.locator("#resume").click();
  await expect(page.locator("#play-status")).toContainText("Playing");
  await page.locator("#play-stop").click();
  await page.waitForTimeout(300);
  await expect(page.locator("#play-status")).toHaveText("Ready when you are.");
  await expect(page.locator("#transport")).toBeHidden();
});
test("real MediaRecorder saves microphone take", async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName !== "chromium",
    "WebKit runner does not expose a fake microphone; real iPhone needs manual validation.",
  );
  await page.context().grantPermissions(["microphone"]);
  await page.goto("/");
  await page.locator('#prayers [data-prayer="father"]').click();
  await page.locator("#record").click();
  await expect(page.locator("#record-state")).toContainText("Recording");
  await page.locator("#prayer-dialog").evaluate((dialog) => {
    dialog.scrollTop = 0;
  });
  await expect(page.locator("#record-stop")).toBeInViewport();
  await page.waitForTimeout(300);
  await page.locator("#record-stop").click();
  await expect(page.locator("#draft")).toBeVisible();
  await page.locator("#save-recording").click();
  await expect(page.locator("#record-state")).toContainText("Saved");
  await page.reload();
  await page.locator('#prayers [data-prayer="father"]').click();
  await expect(page.locator("#record-state")).toContainText("Saved");
  await page.locator("#individual-play").click();
  await expect(page.locator("#record-state")).toContainText("Playing");
});
test("denied microphone and storage failure give actionable errors", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => {
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      value: async () => {
        throw new DOMException("Denied", "NotAllowedError");
      },
    });
  });
  await page.locator('#prayers [data-prayer="father"]').click();
  await page.locator("#record").click();
  await expect(page.locator("#notice")).toContainText("website settings");
  await syntheticMicrophone(page);
  await page.reload();
  await page.locator('#prayers [data-prayer="father"]').click();
  await recordTake(page);
  await page.evaluate(() => {
    IDBDatabase.prototype.transaction = function () {
      throw new DOMException("Full", "QuotaExceededError");
    };
  });
  await page.locator("#save-recording").click();
  await expect(page.locator("#notice")).toContainText(
    "previous recording is safe",
  );
  await expect(page.locator("#draft")).toBeVisible();
});
test("export failure and malformed backup are actionable", async ({ page }) => {
  await page.goto("/");
  await seed(page);
  await page.evaluate(() => {
    AudioContext.prototype.decodeAudioData = async () => {
      throw Error("Unsupported codec");
    };
  });
  await page.locator("#rosary-open").click();
  await page.locator("#export").click();
  await expect(page.locator("#notice")).toContainText("Export failed");
  await expect(page.locator("#export-result")).toBeHidden();
  await expect(page.locator("#export")).toBeEnabled();
  await page.locator("#restore").setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"format":"invalid"}'),
  });
  await expect(page.locator("#notice")).toContainText("not a supported");
  await page.locator("#rosary-close").click();
  await page.locator("#settings-open").click();
  await page.locator("#settings-mode").selectOption("whole");
  await page.locator("#settings-set").selectOption("Glorious");
  await page.locator("#settings-done").click();
  await expect(page.locator("#mode")).toHaveValue("whole");
  await expect(page.locator("#set")).toHaveValue("Glorious");
});
test("native share branch receives a genuine audio file, cancellation is respected", async ({
  page,
}) => {
  await page.goto("/");
  await seed(page);
  await page.evaluate(() => {
    Object.defineProperty(navigator, "canShare", {
      configurable: true,
      value: () => true,
    });
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async (data) => {
        window.shared = {
          name: data.files[0].name,
          type: data.files[0].type,
          size: data.files[0].size,
        };
      },
    });
  });
  await page.locator("#rosary-open").click();
  await page.locator("#share-session").click();
  await expect(page.locator("#export-result")).toBeVisible();
  await page.locator("#export-share").click();
  await expect
    .poll(() => page.evaluate(() => window.shared?.type))
    .toBe("audio/wav");
  expect(await page.evaluate(() => window.shared.size)).toBe(44 + 14 * 4800);
  let downloaded = false;
  page.on("download", () => (downloaded = true));
  await page.evaluate(() => {
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async () => {
        throw new DOMException("Cancelled", "AbortError");
      },
    });
  });
  await page.locator("#export-share").click();
  await page.waitForTimeout(100);
  expect(downloaded).toBe(false);
});
test("repository subpath and accessible page/modal", async ({ page }) => {
  const { default: AxeBuilder } = await import("@axe-core/playwright");
  await page.route("**/share-my-prayer/**", async (route) => {
    const url = route.request().url().replace("/share-my-prayer/", "/");
    const response = await route.fetch({ url });
    await route.fulfill({ response });
  });
  await page.goto("/share-my-prayer/");
  await expect(page.locator("#missing")).toHaveCount(0);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.locator('#prayers [data-prayer="father"]').click();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({
    path: `test-results/${test.info().project.name}-prayer.png`,
  });
  await page.locator("#prayer-close").click();
  await page.screenshot({
    path: `test-results/${test.info().project.name}-home.png`,
    fullPage: true,
  });
});
test("background interruption leaves an unsaved take and old recording intact", async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName !== "chromium",
    "Physical Safari interruption needs a device test.",
  );
  await page.context().grantPermissions(["microphone"]);
  await page.goto("/");
  await seed(page);
  await page.locator('#prayers [data-prayer="father"]').click();
  await page.locator("#record").click();
  await expect(page.locator("#record-state")).toContainText("Recording");
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.locator("#draft")).toBeVisible();
  await expect(page.locator("#prayer-dialog .feedback")).toContainText(
    "background",
  );
  await page.locator("#discard").click();
  await expect(page.locator("#record-state")).toContainText("Saved");
  await page.reload();
  await expect(page.locator("#saved-count")).toContainText("28 / 28");
});
test("failed batch write rolls back every audio replacement", async ({
  page,
}) => {
  await page.goto("/");
  await seed(page);
  const outcome = await page.evaluate(async () => {
    const { saveMany, allRecordings } = await import("./storage.js");
    const original = IDBObjectStore.prototype.put;
    let calls = 0;
    IDBObjectStore.prototype.put = function (...args) {
      if (++calls === 2)
        throw new DOMException("Quota failure", "QuotaExceededError");
      return original.apply(this, args);
    };
    let failed = false;
    try {
      await saveMany([
        {
          key: "traditional:father",
          id: "father",
          version: "traditional",
          blob: new Blob(["replacement"], { type: "audio/wav" }),
        },
        {
          key: "traditional:hail",
          id: "hail",
          version: "traditional",
          blob: new Blob(["replacement"], { type: "audio/wav" }),
        },
      ]);
    } catch {
      failed = true;
    } finally {
      IDBObjectStore.prototype.put = original;
    }
    const records = await allRecordings();
    return {
      failed,
      size: records.find((r) => r.key === "traditional:father").blob.size,
      count: records.length,
    };
  });
  expect(outcome).toEqual({ failed: true, size: tone().length, count: 84 });
});

test("simple home has prayer-name buttons and a gear; secondary controls open on demand", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("#main button")).toHaveCount(9);
  await expect(page.locator("#prayers button")).toHaveText([
    "Sign of the Cross",
    "Glory Be",
    "Hail Mary",
    "Our Father",
    "Apostles’ Creed",
    "O my Jesus",
    "Hail Holy Queen",
    "Rosary Closing Prayer",
  ]);
  await expect(
    page.getByRole("button", { name: "Settings", exact: true }),
  ).toBeVisible();
  await expect(page.locator("#main")).not.toContainText("Record once");
  await expect(page.locator("#rosary-dialog")).not.toBeVisible();
  await expect(page.locator("#settings-dialog")).not.toBeVisible();
  await page.locator("#settings-open").click();
  await page.locator("#mysteries-details summary").click();
  await page.locator('#mystery-list [data-prayer="Glorious-4"]').click();
  await expect(page.locator("#prayer-title")).toHaveText(
    "The Coronation of Mary",
  );
  await page.evaluate(() => {
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      configurable: true,
      value: async () => {
        throw new DOMException("Denied", "NotAllowedError");
      },
    });
  });
  await page.locator("#record").click();
  await expect(page.locator("#prayer-dialog .feedback")).toContainText(
    "website settings",
  );
  await page.locator("#prayer-close").click();
  const { default: AxeBuilder } = await import("@axe-core/playwright");
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.locator("#settings-done").click();
  await page.locator("#rosary-open").click();
  await expect(page.locator("#session-summary")).toBeVisible();
  await page.locator("#rosary-close").click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("prayers open directly with complete current Catholic wording and controls below", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("#wording")).toHaveValue("current");
  await expect(page.locator("#wording option")).toHaveText([
    "Current Catholic",
    "Contemporary English",
  ]);
  for (const [id, words] of Object.entries({
    cross: "In the name of the Father",
    glory: "Glory be to the Father",
    hail: "Hail Mary, full of grace",
    father: "Our Father, who art in heaven",
    creed: "I believe in God",
    fatima: "O my Jesus, forgive us our sins",
    queen: "Hail, holy Queen",
    closing: "O God, whose Only Begotten Son",
  })) {
    await page.locator(`#prayers [data-prayer="${id}"]`).click();
    await expect(page.locator("#prayer-text")).toContainText(words);
    expect(
      await page.locator("#prayer-dialog").evaluate((d) => d.scrollTop),
    ).toBe(0);
    expect(
      await page
        .locator("#prayer-text")
        .evaluate(
          (p) =>
            !!(
              p.compareDocumentPosition(
                document.querySelector(".prayer-tools"),
              ) & Node.DOCUMENT_POSITION_FOLLOWING
            ),
        ),
    ).toBe(true);
    await expect(page.locator("#custom-field")).toHaveCount(0);
    await expect(page.locator("#audio-import")).toHaveCount(0);
    await expect(page.locator("#prayer-dialog")).not.toContainText(
      "Import audio",
    );
    await expect(page.locator("#prayer-dialog")).not.toContainText("paste");
    await expect(page.locator(".prayer-source")).not.toHaveAttribute(
      "open",
      "",
    );
    await page.locator("#prayer-close").click();
  }
  await page.locator("#settings-open").click();
  await page.locator("#wording").selectOption("contemporary");
  await page.locator("#settings-done").click();
  await page.locator('#prayers [data-prayer="father"]').click();
  await expect(page.locator("#prayer-text")).toContainText(
    "Our Father in heaven",
  );
  await expect(page.locator("#prayer-text")).toContainText(
    "Save us from the time of trial",
  );
});
test("old Traditional preference migrates to Current Catholic without deleting audio", async ({
  page,
}) => {
  await page.goto("/");
  await seed(page);
  await page.evaluate(() => {
    localStorage.setItem(
      "smp-settings",
      JSON.stringify({
        version: "traditional",
        mode: "decade",
        set: "Joyful",
        decade: 0,
      }),
    );
    localStorage.setItem(
      "smp-prompt:current:hail",
      "Old paste prompt must not replace the prayer.",
    );
  });
  await page.reload();
  await expect(page.locator("#wording")).toHaveValue("current");
  await page.locator('#prayers [data-prayer="hail"]').click();
  await expect(page.locator("#prayer-text")).toContainText(
    "Hail Mary, full of grace",
  );
  await expect(page.locator("#prayer-text")).not.toContainText("Old paste");
  await expect(page.locator("#record-state")).toContainText("Saved");
  expect(
    await page.evaluate(async () => {
      const { allRecordings } = await import("./storage.js");
      return (await allRecordings()).length;
    }),
  ).toBe(84);
});
