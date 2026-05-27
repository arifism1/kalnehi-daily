import { test, expect } from "@playwright/test";

test("mastermind route requires auth (redirects away from app shell)", async ({
  page,
}) => {
  await page.goto("/mastermind");
  await expect(page).toHaveURL(/\/(auth|mastermind)/);
});
