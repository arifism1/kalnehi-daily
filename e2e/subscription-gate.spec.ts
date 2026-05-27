import { test, expect } from "@playwright/test";

test("unauthenticated /home redirects to auth", async ({ page }) => {
  await page.goto("/home");
  await expect(page).toHaveURL(/\/auth/);
});
