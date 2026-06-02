import { test, expect } from "@playwright/test";

test("unauthenticated /dashboard redirects to auth", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/auth/);
});

test("unauthenticated /syllabus redirects to auth", async ({ page }) => {
  await page.goto("/syllabus");
  await expect(page).toHaveURL(/\/auth/);
});
