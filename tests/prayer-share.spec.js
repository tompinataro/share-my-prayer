import { test, expect } from "@playwright/test";

for (const mime of ["audio/mp3", "audio/mpeg"]) {
  for (const outcome of ["native", "unsupported", "rejected", "cancelled"]) {
    test(`Bella packaged MP3 Share ${mime} ${outcome} keeps bytes and file metadata`, async ({
      page,
    }) => {
      const { readFile } = await import("node:fs/promises");
      const { createHash } = await import("node:crypto");
      const bytes = await readFile(
        new URL("../narration/bella/classic-hail.mp3", import.meta.url),
      );
      await page.route("**/narration/bella/classic-hail.mp3", (route) =>
        route.fulfill({ contentType: mime, body: bytes }),
      );
      await page.addInitScript(() =>
        localStorage.setItem(
          "smp-settings",
          JSON.stringify({ version: "classic" }),
        ),
      );
      await page.goto("/");
      await page.evaluate((outcome) => {
        Object.defineProperty(navigator, "canShare", {
          configurable: true,
          value: () => outcome !== "unsupported",
        });
        Object.defineProperty(navigator, "share", {
          configurable: true,
          value: async (data) => {
            const file = data.files[0];
            window.shareResult = {
              name: file.name,
              type: file.type,
              size: file.size,
              sha: [
                ...new Uint8Array(
                  await crypto.subtle.digest(
                    "SHA-256",
                    await file.arrayBuffer(),
                  ),
                ),
              ]
                .map((x) => x.toString(16).padStart(2, "0"))
                .join(""),
            };
            if (outcome === "cancelled")
              throw new DOMException("Cancelled", "AbortError");
            if (outcome === "rejected")
              throw new DOMException("Unavailable", "NotAllowedError");
          },
        });
      }, outcome);
      const downloads = [];
      page.on("download", (download) => downloads.push(download));
      await page.locator('#prayers [data-prayer="hail"]').click();
      await expect(page.locator("#audio-source")).toContainText("Bella");
      await page.locator("#individual-share").click();
      await expect(page.locator("#individual-share")).toBeEnabled();
      await expect(
        page.getByText(
          "Unsupported audio format. Use WAV, M4A, WebM, or Ogg.",
          { exact: true },
        ),
      ).toHaveCount(0);
      if (outcome !== "unsupported") {
        const shared = await page.evaluate(() => window.shareResult);
        expect(shared).toMatchObject({
          type: "audio/mpeg",
          size: bytes.length,
          sha: createHash("sha256").update(bytes).digest("hex"),
        });
        expect(shared.name).toMatch(/Hail Mary.*\.mp3$/);
      }
      if (["unsupported", "rejected"].includes(outcome)) {
        await expect.poll(() => downloads.length).toBe(1);
        expect(downloads[0].suggestedFilename()).toMatch(/Hail Mary.*\.mp3$/);
        expect(await readFile(await downloads[0].path())).toEqual(bytes);
        await expect(page.locator("#reading-view .feedback")).toContainText(
          "share it from Files or Downloads",
        );
      } else {
        await page.waitForTimeout(100);
        expect(downloads).toHaveLength(0);
      }
      expect(
        await page.evaluate(
          async () =>
            (await (await import("./storage.js")).allRecordings()).length,
        ),
      ).toBe(0);
    });
  }
}

test("prayer instructions keep the exact lines and reading view has Share without Save", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator('#prayers [data-prayer="cross"]').click();
  const instructions = page.locator(".prayer-instructions");
  await expect(instructions.locator("span")).toHaveText([
    "Record, then save and share your own voice or",
    "Play the default voice already provided.",
  ]);
  await expect(instructions).toHaveCSS("text-align", "center");
  await expect(
    page.locator("#reading-view").getByRole("button", { name: /Save/ }),
  ).toHaveCount(0);
  await expect(page.locator("#individual-share")).toBeVisible();
  await expect(page.locator("#save-recording")).toHaveCount(1);
  await expect(page.locator("#export")).toHaveCount(1);
  const original = page.viewportSize();
  for (const width of [1280, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await instructions.scrollIntoViewIfNeeded();
    const shareBox = await page.locator("#individual-share").boundingBox();
    const controlsBox = await page
      .locator(".prayer-tools .record-controls")
      .boundingBox();
    expect(
      Math.abs(
        shareBox.x +
          shareBox.width / 2 -
          (controlsBox.x + controlsBox.width / 2),
      ),
    ).toBeLessThan(2);
    expect(shareBox.y).toBeGreaterThan(controlsBox.y);
    expect(shareBox.width).toBeLessThan(controlsBox.width);
    expect(shareBox.height).toBeGreaterThanOrEqual(44);
    const layout = await instructions.evaluate((element) => {
      const spans = [...element.children];
      const rects = spans.map((span) => span.getBoundingClientRect());
      const dialog = element.closest("dialog");
      return {
        overflow: dialog.scrollWidth > dialog.clientWidth,
        separate: rects[1].top >= rects[0].bottom,
        lineCounts: spans.map((span) => {
          const range = document.createRange();
          range.selectNodeContents(span);
          return range.getClientRects().length;
        }),
      };
    });
    expect(layout.overflow).toBe(false);
    expect(layout.separate).toBe(true);
    if (width >= 390) expect(layout.lineCounts).toEqual([1, 1]);
    await page.screenshot({
      path: `test-results/${test.info().project.name}-instructions-${width}.png`,
    });
  }
  await page.evaluate(() => (document.documentElement.style.fontSize = "32px"));
  await instructions.scrollIntoViewIfNeeded();
  expect(
    await instructions.evaluate((element) => {
      const dialog = element.closest("dialog");
      return (
        dialog.scrollWidth <= dialog.clientWidth &&
        element.scrollWidth <= element.clientWidth
      );
    }),
  ).toBe(true);
  await page.screenshot({
    path: `test-results/${test.info().project.name}-instructions-enlarged.png`,
  });
  await page.setViewportSize(original);
});
