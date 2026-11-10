import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import type { Viewer } from "@/lib/auth";
import type { AnswerKey, PublicData, QuestionResponse } from "@/lib/questions/types";
import type { Database } from "@/lib/supabase/database.types";

export const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;

// These tests create users and write progress; never let them touch a hosted project.
if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/.test(url ?? "")) {
  throw new Error(`Integration tests only run against local Supabase (got ${url}). Start it with \`npm run db:start\` and export its env.`);
}
export const admin = createClient<Database>(url, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });

export const PASSWORD = "Test-password-123";

/** Creates a confirmed user and returns a signed-in client plus a Viewer for server functions. */
export async function createTestUser(prefix = "it") {
  const email = `${prefix}-${randomUUID().slice(0, 8)}@example.test`;
  const { data, error } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true, user_metadata: { display_name: "Test Learner" } });
  if (error) throw error;
  const client = createClient<Database>(url, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } });
  const { error: signInError } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (signInError) throw signInError;
  return { id: data.user.id, email, client, viewer: () => loadViewer(data.user.id, email) };
}

export async function loadViewer(id: string, email: string): Promise<Viewer> {
  const { data: profile } = await admin.from("profiles").select("*").eq("id", id).single();
  return { id, email, profile: profile!, roles: ["student"], permissions: new Set(), isStaff: false };
}

export async function deleteUser(id: string) {
  await admin.auth.admin.deleteUser(id);
}

/** Builds a correct response for a question from its private key (test-only). */
export async function correctResponses(questionIds: string[]): Promise<Record<string, QuestionResponse>> {
  const [{ data: keys }, { data: questions }] = await Promise.all([
    admin.from("question_answer_keys").select("question_id, answer, authored").in("question_id", questionIds),
    admin.from("questions").select("id, data").in("id", questionIds),
  ]);
  const out: Record<string, QuestionResponse> = {};
  for (const k of keys ?? []) {
    const key = k.answer as unknown as AnswerKey;
    const data = questions?.find((q) => q.id === k.question_id)?.data as unknown as PublicData;
    const authored = k.authored as { words?: string[]; fragments?: string[] };
    switch (key.kind) {
      case "choice":
        out[k.question_id] = { optionId: key.correct };
        break;
      case "multi":
        out[k.question_id] = { optionIds: key.correct };
        break;
      case "gaps":
        out[k.question_id] = { blanks: key.blanks.map((b) => b[0]) };
        break;
      case "dropdown":
        out[k.question_id] = { choices: key.blanks };
        break;
      case "bank":
        out[k.question_id] = { blanks: key.blanks };
        break;
      case "order": {
        if (data.kind !== "order") break;
        const parts = authored.words ?? authored.fragments ?? [];
        const used = new Set<string>();
        out[k.question_id] = {
          order: parts.map((p) => {
            const t = data.tokens.find((x) => x.text === p && !used.has(x.id))!;
            used.add(t.id);
            return t.id;
          }),
        };
        break;
      }
      case "matching":
        out[k.question_id] = { pairs: key.pairs };
        break;
      case "segments":
        out[k.question_id] = { segmentId: key.segment };
        break;
      case "text":
        out[k.question_id] = { text: key.answers[0] };
        break;
      default:
        break;
    }
  }
  return out;
}

export async function xpTotal(userId: string) {
  const { data } = await admin.from("xp_transactions").select("amount").eq("user_id", userId);
  return (data ?? []).reduce((s, r) => s + r.amount, 0);
}

export async function coreLessons(levelCode: string) {
  const { data: level } = await admin.from("levels").select("id").eq("code", levelCode).single();
  const { data: course } = await admin.from("courses").select("id").eq("level_id", level!.id).eq("is_core", true).single();
  const { data: units } = await admin.from("units").select("id, sort_order, lessons(id, slug, sort_order)").eq("course_id", course!.id).order("sort_order");
  return {
    levelId: level!.id,
    courseId: course!.id,
    units: (units ?? []).map((u) => ({ id: u.id, sort: u.sort_order, lessons: [...u.lessons].sort((a, b) => a.sort_order - b.sort_order) })),
  };
}
