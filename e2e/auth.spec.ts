import { test, expect } from "@playwright/test";

test("auth page renders sign-in entry", async ({ page }) => {
  await page.goto("/auth");
  await expect(page.locator("body")).toBeVisible();
  await expect(page.getByRole("heading").first()).toBeVisible();
});
