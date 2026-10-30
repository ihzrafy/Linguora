import { expect, test } from "@playwright/test";
import { admin, createStaffUser, deleteByEmail, login, newLearner } from "./helpers";

const student = newLearner();
let contentEditor: Awaited<ReturnType<typeof createStaffUser>>;
let adminUser: Awaited<ReturnType<typeof createStaffUser>>;

test.beforeAll(async () => {
  // Create student user directly via admin auth
  const { data: user, error } = await admin.auth.admin.createUser({
    email: student.email,
    password: student.password,
    email_confirm: true,
    user_metadata: { display_name: student.name, username: student.username },
  });
  if (error) throw error;
  await admin.from("profiles").update({ onboarding_completed_at: new Date().toISOString() }).eq("id", user.user.id);

  contentEditor = await createStaffUser("content_editor");
  adminUser = await createStaffUser("admin");
});

test.afterAll(async () => {
  await deleteByEmail(student.email);
  if (contentEditor) await deleteByEmail(contentEditor.email);
  if (adminUser) await deleteByEmail(adminUser.email);
});

test.describe("Role-Based Access Control and Permissions Enforcement", () => {
  test("student cannot access admin panel and is served 403 Forbidden", async ({ page }) => {
    await login(page, student.email, student.password);

    // Visiting /admin directly
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Akses ditolak" })).toBeVisible();
    await expect(page.getByText("403")).toBeVisible();
    await expect(page.getByRole("link", { name: "Kembali ke dashboard" })).toBeVisible();

    // Visiting /admin/system-settings directly
    await page.goto("/admin/system-settings");
    await expect(page.getByRole("heading", { name: "Akses ditolak" })).toBeVisible();

    // Return to dashboard works
    await page.getByRole("link", { name: "Kembali ke dashboard" }).click();
    await page.waitForURL("**/app/dashboard");
    await expect(page.getByText("Total XP")).toBeVisible();
  });

  test("content editor can access content management but cannot access user roles or settings", async ({ page }) => {
    await login(page, contentEditor.email, contentEditor.password);

    // Can access /admin/lessons and /admin/content-review
    await page.goto("/admin/lessons");
    await expect(page.getByRole("heading", { name: "Lesson" })).toBeVisible();

    await page.goto("/admin/content-review");
    await expect(page.getByRole("heading", { name: "Antrean review" })).toBeVisible();

    // Forbidden from /admin/roles (requires users.read)
    await page.goto("/admin/roles");
    await expect(page.getByRole("heading", { name: "Akses ditolak" })).toBeVisible();

    // Forbidden from /admin/audit-logs (requires audit.view)
    await page.goto("/admin/audit-logs");
    await expect(page.getByRole("heading", { name: "Akses ditolak" })).toBeVisible();
  });

  test("admin user has full access to admin CMS, roles matrix, and audit logs", async ({ page }) => {
    await login(page, adminUser.email, adminUser.password);

    // Admin dashboard
    await page.goto("/admin");
    await expect(page.getByText("Admin CMS · admin")).toBeVisible();

    // Roles matrix
    await page.goto("/admin/roles");
    await expect(page.getByRole("heading", { name: "Role & izin" })).toBeVisible();
    await expect(page.getByText("content.read").first()).toBeVisible();
    await expect(page.getByText("users.manage").first()).toBeVisible();

    // Audit logs
    await page.goto("/admin/audit-logs");
    await expect(page.getByRole("heading", { name: "Audit log" })).toBeVisible();
  });
});
