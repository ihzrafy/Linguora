import { expect, test } from "@playwright/test";
import { deleteByEmail, newLearner, resetRateLimits } from "./helpers";

const learner = newLearner();

test.beforeAll(async () => {
  await resetRateLimits();
});

test.afterAll(async () => {
  await deleteByEmail(learner.email);
});

test.describe("Mobile Viewport and Responsive UI", () => {
  test("marketing navigation drawer opens, links work, and no horizontal overflow", async ({ page }) => {
    // Ensure mobile viewport (e.g. Pixel 7 / iPhone dimensions)
    if ((page.viewportSize()?.width ?? 0) > 600) {
      await page.setViewportSize({ width: 390, height: 844 });
    }
    await page.goto("/");

    // Check main content is visible
    await expect(page.locator("main#main")).toBeVisible();

    // Verify hamburger button is visible on mobile
    const menuBtn = page.getByRole("button", { name: "Buka menu" });
    await expect(menuBtn).toBeVisible();

    // Open mobile menu
    await menuBtn.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("dialog").getByRole("navigation")).toBeVisible();

    // Navigate to Fitur page via mobile drawer
    await page.getByRole("dialog").getByRole("link", { name: "Fitur" }).click();
    await page.waitForURL("**/features");
    await expect(page.getByRole("heading", { name: /Semua yang kamu butuhkan/i })).toBeVisible();

    // Verify no horizontal overflow on mobile
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(hasHorizontalScroll).toBe(false);
  });

  test("learner registration and responsive dashboard on mobile", async ({ page }) => {
    await resetRateLimits();
    const testLearner = newLearner();

    if ((page.viewportSize()?.width ?? 0) > 600) {
      await page.setViewportSize({ width: 390, height: 844 });
    }

    try {
      // Register on mobile
      await page.goto("/register");
      await page.getByLabel("Nama").fill(testLearner.name);
      await page.getByLabel("Username").fill(testLearner.username);
      await page.getByLabel("Email").fill(testLearner.email);
      await page.getByLabel("Password", { exact: true }).fill(testLearner.password);
      await page.getByRole("checkbox").click();
      await page.getByRole("button", { name: "Buat akun" }).click();

      // Onboarding mobile flow
    await page.waitForURL("**/app/onboarding");
    await page.getByRole("radio", { name: /Komunikasi sehari-hari/ }).click();
    await page.getByRole("button", { name: "Lanjut" }).click();
    await page.getByRole("button", { name: "Lanjut" }).click();
    await page.getByRole("radio", { name: /Rutin/ }).click();
    await page.getByRole("button", { name: "Lanjut" }).click();
    await page.getByRole("button", { name: /Mulai dari A1/ }).click();

    // Verify dashboard displays properly on mobile
    await page.waitForURL("**/app/learn/a1");
    await page.goto("/app/dashboard");
    await expect(page.getByText("Total XP")).toBeVisible();
    await expect(page.getByText("Streak")).toBeVisible();

    // Mobile app sidebar drawer
    const appMenuBtn = page.getByRole("button", { name: "Buka menu navigasi" });
    await expect(appMenuBtn).toBeVisible();
    await appMenuBtn.click();

    // Verify sidebar drawer navigation links
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("dialog").getByRole("link", { name: "Learning Path" }).click();
    await page.waitForURL("**/app/learn");
    await expect(page.getByRole("heading", { name: /Learning Path/i })).toBeVisible();

    // Check no horizontal overflow on app screens
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(hasHorizontalScroll).toBe(false);
    } finally {
      await deleteByEmail(testLearner.email);
    }
  });
});
