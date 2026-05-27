import { test, expect } from "@playwright/test";

test("marketing home or landing loads", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("body")).toBeVisible();
  const title = await page.title();
  expect(title.length).toBeGreaterThan(0);
});
