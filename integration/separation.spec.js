import { test, expect } from "@playwright/test";
const ordinary = "http://127.0.0.1:4175/work/share-my-prayer-cog/";
const rosary = "http://127.0.0.1:4175/outputs/share-my-rosary/";
async function snapshot(page) {
  return page.evaluate(async () => {
    const { allRecordings } = await import("./storage.js");
    return {
      rows: await Promise.all(
        (await allRecordings()).map(async (r) => ({
          key: r.key,
          savedAt: r.savedAt,
          bytes: [...new Uint8Array(await r.blob.arrayBuffer())],
        })),
      ),
      settings: localStorage.getItem("smp-settings"),
      prompt: localStorage.getItem("smp-prompt:traditional:Joyful-0"),
    };
  });
}

test("real apps sharing one origin keep source data and preferences isolated through migration", async ({
  context,
}) => {
  const source = await context.newPage();
  await source.goto(ordinary);
  await source.evaluate(async () => {
    const { saveMany } = await import("./storage.js");
    await saveMany(
      [
        ["current", "cross", 1],
        ["current", "creed", 2],
        ["traditional", "Joyful-0", 3],
      ].map(([version, id, n]) => ({
        key: `${version}:${id}`,
        version,
        id,
        blob: new Blob([new Uint8Array([n, n, n, n])], { type: "audio/wav" }),
        savedAt: "2020-source",
      })),
    );
    localStorage.setItem(
      "smp-settings",
      JSON.stringify({
        version: "current",
        sender: "Source only",
        mode: "whole",
        set: "Sorrowful",
        decade: 3,
      }),
    );
    localStorage.setItem(
      "smp-prompt:traditional:Joyful-0",
      "Private legacy mystery fixture",
    );
  });
  await source.reload();
  const before = await snapshot(source);
  const destination = await context.newPage();
  await destination.goto(rosary);
  expect(
    await destination.evaluate(
      async () => (await (await import("./storage.js")).allRecordings()).length,
    ),
  ).toBe(0);
  expect(
    await destination.evaluate(() => localStorage.getItem("smr-settings")),
  ).toBe(null);
  expect(await snapshot(source)).toEqual(before);
  await destination.locator("#settings-open").click();
  await destination.locator("#migrate-legacy").click();
  await expect(destination.locator("#restore-summary")).toContainText(
    "3 recordings",
  );
  await destination.locator("#restore-cancel").click();
  expect(
    await destination.evaluate(
      async () => (await (await import("./storage.js")).allRecordings()).length,
    ),
  ).toBe(0);
  await destination.locator("#migrate-legacy").click();
  // A newer take wins even when saved after the source-copy preview opened.
  await destination.evaluate(async () => {
    const { saveMany } = await import("./storage.js");
    await saveMany([
      {
        key: "current:creed",
        version: "current",
        id: "creed",
        blob: new Blob([new Uint8Array([9, 9, 9, 9, 9])], {
          type: "audio/wav",
        }),
        savedAt: "2030-destination",
      },
    ]);
    localStorage.setItem(
      "smr-settings",
      JSON.stringify({ version: "classic", sender: "Destination only" }),
    );
    localStorage.setItem(
      "smr-prompt:traditional:Joyful-0",
      "Newer destination prompt",
    );
  });
  await destination.locator("#restore-confirm").click();
  await expect(destination.locator("#notice")).toContainText(
    "missing recordings copied",
  );
  const copied = await destination.evaluate(async () => ({
    rows: (await (await import("./storage.js")).allRecordings()).map((r) => [
      r.key,
      r.blob.size,
      r.savedAt,
    ]),
    settings: JSON.parse(localStorage.getItem("smr-settings")),
    prompt: localStorage.getItem("smr-prompt:traditional:Joyful-0"),
  }));
  expect(copied.rows).toContainEqual(["current:creed", 5, "2030-destination"]);
  expect(copied.rows).toHaveLength(3);
  expect(copied.settings.sender).toBe("Destination only");
  expect(copied.prompt).toBe("Newer destination prompt");
  await destination.locator("#migrate-legacy").click();
  await destination.locator("#restore-confirm").click();
  await expect(destination.locator("#notice")).toContainText(
    "0 missing recordings copied",
  );
  expect(await snapshot(source)).toEqual(before);
  await destination.reload();
  expect(
    await destination.evaluate(
      async () =>
        (await (await import("./storage.js")).allRecordings()).find(
          (r) => r.key === "current:creed",
        ).savedAt,
    ),
  ).toBe("2030-destination");
  await source.reload();
  expect(await snapshot(source)).toEqual(before);
});

test("original full backup file imports in independent app without changing legacy source", async ({
  context,
}) => {
  const source = await context.newPage();
  await source.goto(ordinary);
  await source.evaluate(async () => {
    const { saveMany } = await import("./storage.js");
    const { library, versions } = await import("./core.js");
    await saveMany(
      Object.keys(versions).flatMap((version) =>
        library.map(({ id }) => ({
          key: `${version}:${id}`,
          version,
          id,
          blob: new Blob([new Uint8Array([1, 2, 3, 4])], { type: "audio/ogg" }),
          savedAt: "legacy",
        })),
      ),
    );
  });
  await source.reload();
  const before = await snapshot(source);
  await source.locator("#settings-open").click();
  const download = source.waitForEvent("download");
  await source.locator("#backup").click();
  const path = await (await download).path();
  const destination = await context.newPage();
  await destination.goto(rosary);
  await destination.locator("#settings-open").click();
  await destination.locator("#restore").setInputFiles(path);
  await expect(destination.locator("#restore-summary")).toContainText(
    "Share My Prayer migration",
  );
  await destination.locator("#restore-confirm").click();
  await expect(destination.locator("#notice")).toContainText(
    "112 missing recordings copied",
  );
  const imported = await destination.evaluate(async () =>
    (await (await import("./storage.js")).allRecordings()).map((r) => [
      r.key,
      r.blob.type,
      r.blob.size,
    ]),
  );
  expect(imported).toHaveLength(112);
  expect(imported).toContainEqual(["traditional:Glorious-4", "audio/ogg", 4]);
  expect(imported.every((row) => row[1] === "audio/ogg" && row[2] === 4)).toBe(
    true,
  );
  expect(await snapshot(source)).toEqual(before);
});
