import { expect, test } from "@playwright/test";

test("sound toggle persists and answering animates the question card", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

  await page.goto("/");
  const toggle = page.getByRole("button", { name: /efek suara/i }).first();
  await expect(toggle).toHaveAttribute("aria-pressed", "true"); // on by default

  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await page.reload();
  await expect(page.getByRole("button", { name: /efek suara/i }).first()).toHaveAttribute("aria-pressed", "false");
  await page.getByRole("button", { name: /efek suara/i }).first().click();
  await expect(page.getByRole("button", { name: /efek suara/i }).first()).toHaveAttribute("aria-pressed", "true");

  // Answer the first sample question (any option) and check it.
  const card = page.locator("div.relative.rounded-2xl").filter({ has: page.getByRole("button", { name: "Periksa jawaban" }) }).first();
  const option = card.getByRole("radio").first();
  if (await option.count()) await option.click();
  else await card.getByRole("button").filter({ hasNotText: /Periksa|Ulangi/ }).first().click();
  await card.getByRole("button", { name: "Periksa jawaban" }).click();

  await expect(page.getByRole("status").filter({ hasText: /Benar!|Belum tepat|Sebagian benar/ })).toBeVisible();
  await expect(page.locator(".animate-glow-success, .animate-shake").first()).toBeVisible();
  expect(errors.filter((e) => !/favicon|Failed to load resource/i.test(e))).toEqual([]);
});
