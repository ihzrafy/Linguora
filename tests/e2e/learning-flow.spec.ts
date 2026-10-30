import { expect, test } from "@playwright/test";
import { admin, answerCorrectly, deleteByEmail, login, newLearner, openAttempt, resetRateLimits, userIdByEmail } from "./helpers";

const learner = newLearner();

test.beforeAll(async () => {
  await resetRateLimits();
});

test.afterAll(async () => {
  await deleteByEmail(learner.email);
});

test("full learner journey: register → placement → lesson → quiz → XP → persisted after re-login", async ({ page }) => {
  // 1. Register
  await page.goto("/register");
  await page.getByLabel("Nama").fill(learner.name);
  await page.getByLabel("Username").fill(learner.username);
  await page.getByLabel("Email").fill(learner.email);
  await page.getByLabel("Password", { exact: true }).fill(learner.password);
  await page.getByRole("checkbox").click();
  await page.getByRole("button", { name: "Buat akun" }).click();

  // 2. Onboarding
  await page.waitForURL("**/app/onboarding");
  await page.getByRole("radio", { name: /Komunikasi sehari-hari/ }).click();
  await page.getByRole("button", { name: "Lanjut" }).click();
  await expect(page.getByRole("radio", { name: /General English/ })).toHaveAttribute("aria-checked", "true");
  await page.getByRole("button", { name: "Lanjut" }).click();
  await page.getByRole("radio", { name: /Rutin/ }).click();
  await page.getByRole("button", { name: "Lanjut" }).click();
  await page.getByRole("button", { name: /Ikuti placement test/ }).click();

  // 3. Placement test (answer the first question, then submit)
  await page.waitForURL("**/app/placement-test");
  await page.getByRole("button", { name: /Mulai placement test/ }).click();
  await page.waitForURL(/attempt=/);
  const userId = (await userIdByEmail(learner.email))!;
  const placement = await openAttempt(userId, "placement");
  expect(placement.question_ids.length).toBeGreaterThanOrEqual(30);
  await answerCorrectly(page, placement.question_ids[0]);
  await expect(page.getByText("1 terjawab")).toBeVisible();

  // Resume after reload: the answer is restored.
  await page.waitForTimeout(1200);
  await page.reload();
  await expect(page.getByText("1 terjawab")).toBeVisible();

  await page.getByRole("button", { name: `Soal ${placement.question_ids.length}`, exact: true }).click();
  await page.getByRole("button", { name: "Kumpulkan" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Kumpulkan" }).click();

  // 4. Recommendation
  await page.waitForURL("**/app/results/**");
  await expect(page.getByText(/Estimasi level kamu: A1/)).toBeVisible();
  await expect(page.getByText("Rekomendasi belajar")).toBeVisible();
  await expect(page.getByText(/bukan pengukuran sempurna/).first()).toBeVisible();

  // 5–6. Open the first lesson and study the material
  await page.goto("/app/learn/a1");
  await page.getByRole("link", { name: /^1\. / }).first().click();
  await page.waitForURL("**/app/lesson/**");
  await expect(page.getByRole("heading", { name: "Penjelasan Konsep" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Kosakata" })).toBeVisible();

  // 7–8. Answer a guided practice question and receive feedback
  const lessonSlug = page.url().split("/").pop()!;
  const { data: lesson } = await admin.from("lessons").select("id").eq("slug", lessonSlug).single();
  const { data: guided } = await admin.from("questions").select("id").eq("lesson_id", lesson!.id).eq("stage", "guided").limit(1).single();
  const guidedCard = page.locator("#s-7");
  await expect(guidedCard.getByRole("button", { name: "Periksa jawaban" })).toBeVisible();
  await answerCorrectly(guidedCard, guided!.id);
  await guidedCard.getByRole("button", { name: "Periksa jawaban" }).click();
  await expect(guidedCard.getByText("Benar!")).toBeVisible();

  // 9. Complete the material and pass the mini quiz
  await page.getByRole("button", { name: /mulai mini quiz/i }).click();
  await page.waitForURL(/\/app\/quiz\/.+attempt=/);
  const quiz = await openAttempt(userId, "lesson_quiz");
  for (let i = 0; i < quiz.question_ids.length; i++) {
    await answerCorrectly(page, quiz.question_ids[i]);
    if (i < quiz.question_ids.length - 1) await page.getByRole("button", { name: /Berikutnya/ }).click();
  }
  await page.getByRole("button", { name: "Kumpulkan" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Kumpulkan" }).click();

  // 10. XP is awarded
  await page.waitForURL("**/app/results/**");
  await expect(page.getByText("Lulus!")).toBeVisible();
  await expect(page.getByText(/\+\d+ XP/).first()).toBeVisible();

  // 11. Dashboard shows progress
  await page.goto("/app/dashboard");
  await expect(page.getByText("Lesson selesai")).toBeVisible();
  const lessonsStat = page.locator("p", { hasText: "Lesson selesai" }).locator("xpath=following-sibling::p[1]");
  await expect(lessonsStat).toHaveText("1");

  // 12–13. Logout and login again: progress persists
  await page.getByRole("button", { name: "Menu akun" }).click();
  await page.getByRole("menuitem", { name: "Keluar" }).click();
  await page.waitForURL("**/login");
  await login(page, learner.email, learner.password);
  await page.goto("/app/learn/a1");
  await expect(page.getByText(/Selesai|Dikuasai/).first()).toBeVisible();
  await page.goto("/app/dashboard");
  await expect(lessonsStat).toHaveText("1");
});

test("direct access to a locked lesson is refused", async ({ page }) => {
  await login(page, learner.email, learner.password);
  const { data } = await admin.from("lessons").select("slug").eq("slug", "a1-u05-l1-present-simple-i-you-we-they").maybeSingle();
  const { data: anyLocked } = data
    ? { data }
    : await admin.from("lessons").select("slug, units!inner(slug)").eq("units.slug", "a1-u05-routines").order("sort_order").limit(1).single();
  await page.goto(`/app/lesson/${anyLocked!.slug}`);
  await expect(page.getByText("Lesson ini masih terkunci")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Penjelasan Konsep" })).toHaveCount(0);
});

test("signed-out visitors are redirected away from the app", async ({ page }) => {
  await page.goto("/app/dashboard");
  await page.waitForURL(/\/login\?next=/);
  await expect(page.getByRole("heading", { name: "Selamat datang kembali" })).toBeVisible();
});
