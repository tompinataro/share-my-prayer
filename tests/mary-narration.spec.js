import { test, expect } from "@playwright/test";
for (const version of ["classic", "current", "contemporary"]) {
  test(`Mary Bella loads, plays, pauses and shares in ${version}`, async ({
    page,
  }) => {
    await page.addInitScript(
      (version) =>
        localStorage.setItem("smp-settings", JSON.stringify({ version })),
      version,
    );
    await page.goto("/");
    await page
      .getByRole("button", { name: "Mary Undoer of Knots", exact: true })
      .click();
    await expect(page.locator(".prayer-instructions")).toContainText(
      "Play the default voice already provided.",
    );
    await expect(page.locator("#individual-play")).toBeEnabled();
    await expect(page.locator("#individual-share")).toBeEnabled();
    await page.locator("#individual-play").click();
    await expect(page.locator("#individual-play")).toContainText("Pause");
    await page.locator("#individual-play").click();
    await expect(page.locator("#individual-play")).toContainText("Resume");
    await page.evaluate(() => {
      Object.defineProperty(navigator, "canShare", {
        configurable: true,
        value: () => true,
      });
      Object.defineProperty(navigator, "share", {
        configurable: true,
        value: async (data) => {
          window.maryShared = {
            name: data.files[0].name,
            size: data.files[0].size,
            type: data.files[0].type,
          };
        },
      });
    });
    await page.locator("#individual-share").click();
    await expect
      .poll(() => page.evaluate(() => window.maryShared?.size || 0))
      .toBeGreaterThan(1000);
    expect(await page.evaluate(() => window.maryShared.type)).toBe(
      "audio/mpeg",
    );
    expect(
      await page.evaluate(
        async () =>
          (await (await import("./storage.js")).allRecordings()).length,
      ),
    ).toBe(0);
  });
}
