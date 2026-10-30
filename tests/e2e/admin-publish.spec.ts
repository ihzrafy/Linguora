import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { admin, createStaffUser, deleteByEmail, login } from "./helpers";

let adminUser: Awaited<ReturnType<typeof createStaffUser>>;
let contentEditor: Awaited<ReturnType<typeof createStaffUser>>;
const testLessonSlug = `e2e-pub-${randomUUID().slice(0, 8)}`;
let testLessonId: string | null = null;

test.beforeAll(async () => {
  adminUser = await createStaffUser("admin");
  contentEditor = await createStaffUser("content_editor");

  // Create a draft lesson in the database for testing publishing workflows
  const { data: unit } = await admin.from("units").select("id").order("sort_order").limit(1).single();
  const { data: created, error } = await admin
    .from("lessons")
    .insert({
      unit_id: unit!.id,
      slug: testLessonSlug,
      title: `E2E Publish Test Lesson ${testLessonSlug}`,
      summary: "Draft lesson for testing admin publishing workflow.",
      objectives: ["Understand publishing workflow"],
      completion_criteria: "Complete mini quiz",
      status: "in_review",
      sort_order: 999,
      xp_reward: 20,
      estimated_minutes: 10,
    })
    .select("id")
    .single();
  if (error) throw error;
  testLessonId = created.id;
});

test.afterAll(async () => {
  if (testLessonId) {
    await admin.from("lessons").delete().eq("id", testLessonId);
  }
  if (adminUser) await deleteByEmail(adminUser.email);
  if (contentEditor) await deleteByEmail(contentEditor.email);
});

test.describe("Admin Content Publishing Workflow", () => {
  test("content review queue shows in_review lessons", async ({ page }) => {
    await login(page, adminUser.email, adminUser.password);
    await page.goto("/admin/content-review");

    await expect(page.getByRole("heading", { name: "Antrean review" })).toBeVisible();
    await expect(page.getByText(`E2E Publish Test Lesson ${testLessonSlug}`)).toBeVisible();
  });

  test("admin can publish in_review content via bulk status bar", async ({ page }) => {
    await login(page, adminUser.email, adminUser.password);
    await page.goto("/admin/content-review");

    // Select the test lesson checkbox
    const checkbox = page.locator(`input[data-bulk][value="${testLessonId}"]`);
    await expect(checkbox).toBeVisible();
    await checkbox.check();

    // Set status to "published"
    const select = page.getByLabel("Status baru").first();
    await select.selectOption("published");

    // Click Terapkan
    await page.getByRole("button", { name: "Terapkan" }).first().click();

    // Wait for the lesson to update in the database
    await expect.poll(async () => {
      const { data } = await admin.from("lessons").select("status").eq("id", testLessonId!).single();
      return data?.status;
    }).toBe("published");

    // Verify it now appears as published in /admin/lessons
    await page.goto(`/admin/lessons?q=${testLessonSlug}`);
    await expect(page.getByText(`E2E Publish Test Lesson ${testLessonSlug}`)).toBeVisible();
    await expect(page.locator("#lessons").getByRole("cell", { name: "published" })).toBeVisible();
  });
});
