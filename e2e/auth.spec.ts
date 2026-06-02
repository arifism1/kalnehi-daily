import { test, expect } from "@playwright/test";

test("auth page renders sign-in entry", async ({ page }) => {
  await page.goto("/auth");
  await expect(page.locator("body")).toBeVisible();
  await expect(page.getByRole("heading").first()).toBeVisible();

  const googleButton = page.getByRole("button", { name: "Continue with Google" });
  const emailInput = page.getByLabel("Email");

  await expect(googleButton).toBeVisible();
  await expect(emailInput).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue with email" })).toBeVisible();

  const googleBeforeEmail = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll("button"));
    const googleBtn = buttons.find((b) =>
      b.textContent?.includes("Continue with Google"),
    );
    const email = document.getElementById("auth-email");
    if (!googleBtn || !email) return false;
    return Boolean(googleBtn.compareDocumentPosition(email) & Node.DOCUMENT_POSITION_FOLLOWING);
  });
  expect(googleBeforeEmail).toBe(true);
});
