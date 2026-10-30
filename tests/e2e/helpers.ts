import { randomUUID } from "node:crypto";
import path from "node:path";
import { expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import type { AnswerKey, PublicData } from "../../src/lib/questions/types";
import type { Database } from "../../src/lib/supabase/database.types";

config({ path: path.resolve(__dirname, "../../.env.local"), quiet: true });

export const admin = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });

export function newLearner() {
  const id = randomUUID().slice(0, 8);
  return { name: `E2E Learner ${id}`, username: `e2e_${id}`, email: `e2e-${id}@example.test`, password: "E2e-password-123" };
}

export async function userIdByEmail(email: string) {
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  return data.users.find((u) => u.email === email)?.id ?? null;
}

export async function deleteByEmail(email: string) {
  const id = await userIdByEmail(email);
  if (id) await admin.auth.admin.deleteUser(id);
}

export async function resetRateLimits() {
  await admin.from("rate_limits").delete().neq("key", "");
}

export async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Masuk" }).click();
  await page.waitForURL(/\/app\//);
}

/** Answers the visible question correctly using its private key (test-only knowledge). */
export async function answerCorrectly(page: Pick<Page, "getByRole" | "getByLabel" | "locator">, questionId: string) {
  const [{ data: key }, { data: q }, { data: options }] = await Promise.all([
    admin.from("question_answer_keys").select("answer, authored").eq("question_id", questionId).single(),
    admin.from("questions").select("data").eq("id", questionId).single(),
    admin.from("question_options").select("id, content").eq("question_id", questionId),
  ]);
  const answer = key!.answer as unknown as AnswerKey;
  const data = q!.data as unknown as PublicData;
  const optionText = (id: string) => options!.find((o) => o.id === id)!.content;
  const exact = (s: string) => new RegExp(`^\\s*[A-G]?\\s*${s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`);

  switch (answer.kind) {
    case "choice":
      await page.getByRole("radio", { name: exact(optionText(answer.correct)) }).click();
      break;
    case "multi":
      for (const id of answer.correct) await page.getByRole("checkbox", { name: exact(optionText(id)) }).click();
      break;
    case "gaps":
      for (let i = 0; i < answer.blanks.length; i++) await page.getByLabel(`Isian ${i + 1}`, { exact: true }).fill(answer.blanks[i][0]);
      break;
    case "dropdown":
      for (let i = 0; i < answer.blanks.length; i++) await page.getByLabel(`Pilihan ${i + 1}`, { exact: true }).selectOption({ index: answer.blanks[i] + 1 });
      break;
    case "bank":
      for (const word of answer.blanks) await page.getByLabel("Bank kata").getByRole("button", { name: word, exact: true }).first().click();
      break;
    case "order": {
      if (data.kind !== "order") break;
      const authored = key!.authored as { words?: string[]; fragments?: string[] };
      for (const part of authored.words ?? authored.fragments ?? []) {
        await page.locator("section").getByRole("button", { name: part, exact: true }).last().click();
      }
      break;
    }
    case "matching":
      if (data.kind !== "matching") break;
      for (const left of data.left) {
        const right = data.right.find((r) => r.id === answer.pairs[left.id])!;
        await page.getByLabel(`Pasangan untuk ${left.text}`, { exact: true }).selectOption({ label: right.text });
      }
      break;
    case "segments":
      if (data.kind !== "segments") break;
      await page.getByRole("radio", { name: data.segments.find((s) => s.id === answer.segment)!.text, exact: true }).click();
      break;
    case "text":
      await page.getByLabel("Jawaban kamu").fill(answer.answers[0]);
      break;
    default:
      throw new Error(`cannot auto-answer ${answer.kind}`);
  }
}

export async function openAttempt(userId: string, kind: string) {
  const { data } = await admin
    .from("assessment_attempts")
    .select("id, question_ids")
    .eq("user_id", userId)
    .eq("kind", kind as never)
    .eq("status", "in_progress")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  return data!;
}

export async function expectNoA11yBasics(page: Page) {
  await expect(page.locator("main#main")).toHaveCount(1);
}

export async function createStaffUser(role: "admin" | "content_editor" | "reviewer" | "super_admin") {
  const id = randomUUID().slice(0, 8);
  const email = `staff-${role}-${id}@example.test`;
  const password = "Staff-password-123";
  const name = `Staff ${role} ${id}`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: name, username: `stf_${id}` },
  });
  if (error) throw error;
  await admin.from("user_roles").upsert({ user_id: data.user.id, role }, { onConflict: "user_id,role" });
  await admin.from("profiles").update({ onboarding_completed_at: new Date().toISOString() }).eq("id", data.user.id);
  return { id: data.user.id, email, password, role, name };
}

