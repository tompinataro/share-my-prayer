import { test, expect } from "@playwright/test";

test("home and Rosary menu preserve prayer sets, layered Back/Escape, and focus", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("#prayers button")).toHaveText([
    "Sign of the Cross",
    "Glory Be",
    "Hail Mary",
    "Our Father",
  ]);
  await expect(page.locator("#main").getByRole("button")).toHaveCount(5);
  for (let cycle = 0; cycle < 2; cycle++) {
    await page.locator("#rosary-open").click();
    await expect(page.locator("#rosary-menu")).toBeVisible();
    await expect(page.locator("#rosary-prayers button")).toHaveText([
      "Apostles’ Creed",
      "O my Jesus",
      "Hail Holy Queen",
      "Rosary Closing Prayer",
    ]);
    await expect(page.locator("#rosary-menu-close")).toBeFocused();
    for (const id of ["creed", "fatima", "queen", "closing"]) {
      const prayer = page.locator(`#rosary-prayers [data-prayer="${id}"]`);
      await prayer.click();
      await expect(page.locator("#prayer-title")).toBeFocused();
      await page.keyboard.press("Escape");
      await expect(page.locator("#prayer-dialog")).toBeHidden();
      await expect(prayer).toBeFocused();
      await expect(page.locator("#rosary-menu")).toBeVisible();
    }
    await page
      .getByRole("button", { name: "Rosary settings", exact: true })
      .click();
    await expect(page.locator("#rosary-dialog")).toBeVisible();
    await page.locator("#mode").selectOption("whole");
    await expect(page.locator("#session-summary")).toContainText(
      "Five decades",
    );
    await page.keyboard.press("Escape");
    await expect(page.locator("#rosary-dialog")).toBeHidden();
    await expect(page.locator("#rosary-config-open")).toBeFocused();
    if (cycle) await page.locator("#rosary-menu-close").click();
    else await page.keyboard.press("Escape");
    await expect(page.locator("#rosary-menu")).toBeHidden();
    await expect(page.locator("#rosary-open")).toBeFocused();
  }
  await page.locator("#settings-open").click();
  await expect(page.locator("#settings-dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#settings-open")).toBeFocused();
});

test("Rosary menu and session navigation clean up playing audio and restore refreshed prayer focus", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const NativeAudio = window.Audio;
    window.playbackAudio = [];
    window.Audio = function (...args) {
      const audio = new NativeAudio(...args);
      window.playbackAudio.push(audio);
      return audio;
    };
  });
  await page.goto("/");
  await page.locator("#rosary-open").click();
  await page.locator('#rosary-prayers [data-prayer="creed"]').click();
  await page.locator("#individual-play").click();
  await expect(page.locator("#individual-play")).toHaveAccessibleName("Pause");
  await expect(page.locator("#individual-play")).toBeEnabled();
  await page.keyboard.press("Escape");

  await expect(
    page.locator('#rosary-prayers [data-prayer="creed"]'),
  ).toBeFocused();
  expect(
    await page.evaluate(() =>
      window.playbackAudio.every(
        (audio) => audio.paused && !audio.getAttribute("src"),
      ),
    ),
  ).toBe(true);
  await page.locator("#rosary-config-open").click();
  await page.locator("#start").click();
  await expect(page.locator("#play-status")).toContainText("Playing");
  await expect(page.locator("#start")).toBeEnabled();
  await page.locator("#rosary-close").click();
  await expect(page.locator("#rosary-config-open")).toBeFocused();
  expect(
    await page.evaluate(() =>
      window.playbackAudio.every(
        (audio) => audio.paused && !audio.getAttribute("src"),
      ),
    ),
  ).toBe(true);
  await page.locator("#rosary-menu-close").click();
  await expect(page.locator("#rosary-open")).toBeFocused();
});

test("Rosary menu keeps a dark upper-right cog and phone layout without overflow", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#rosary-open").click();
  for (const width of [1280, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    const menu = page.locator("#rosary-menu");
    const cog = page.locator("#rosary-config-open");
    await expect(cog.locator("svg")).toHaveCSS("color", "rgb(52, 36, 64)");
    const box = await cog.boundingBox();
    const title = await page.locator("#rosary-menu-title").boundingBox();
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.x).toBeGreaterThan(title.x + title.width);
    expect(await menu.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: `test-results/${test.info().project.name}-rosary-menu-${width}.png`,
    });
  }
});
