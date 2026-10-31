import { expect, test } from "@playwright/test";
import { admin, deleteByEmail, login, newLearner } from "./helpers";

const learner = newLearner();
test.afterAll(() => deleteByEmail(learner.email));

test("each speaker in a listening dialogue gets their own voice", async ({ page }) => {
  await admin.auth.admin.createUser({ email: learner.email, password: learner.password, email_confirm: true, user_metadata: { display_name: learner.name } });
  const { data: material } = await admin.from("listening_materials").select("slug, script, levels!inner(code)").eq("levels.code", "A1").eq("kind", "dialogue").limit(1).single();
  const speakers = [...new Set((material!.script as { speaker: string }[]).map((l) => l.speaker))];
  expect(speakers.length).toBeGreaterThanOrEqual(2);

  await login(page, learner.email, learner.password);
  await page.goto(`/app/listening/${material!.slug}`);
  // The legend appears once the browser has loaded its (asynchronous) voice list.
  const legend = page.getByRole("list", { name: "Suara pembicara" });
  await expect(legend.getByRole("listitem")).toHaveCount(speakers.length);
  const voiceCount = await page.evaluate(() => speechSynthesis.getVoices().filter((v) => v.lang.startsWith("en")).length);
  test.skip(voiceCount === 0, "No English TTS voices in this browser environment");
  for (const s of speakers) await expect(legend.getByText(s, { exact: true })).toBeVisible();
  // Two-person dialogue: the voice descriptions differ (different gender/voice or pitch).
  const labels = await legend.getByRole("listitem").allInnerTexts();
  expect(new Set(labels.map((t) => t.replace(speakers.find((s) => t.includes(s)) ?? "", "").trim())).size).toBe(labels.length);
  await expect(legend.getByRole("button", { name: `Dengar contoh suara ${speakers[0]}` })).toBeVisible();
});
