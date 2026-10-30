import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { aiEnabled, describeProviderError, streamTutorReply, type TutorMode } from "@/lib/ai/tutor";
import { tutorQuota } from "@/lib/ai/usage";
import { getViewer } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const bodySchema = z.object({
  sessionId: z.uuid().nullable().optional(),
  mode: z.enum(["tutor", "grammar", "correction", "conversation", "vocabulary", "writing", "study_plan"]),
  message: z.string().trim().min(1, "Pesan kosong.").max(2000, "Pesan maksimal 2000 karakter."),
});

const HISTORY_LIMIT = 20;
const json = (status: number, error: string) => NextResponse.json({ error }, { status });

/** Streams an AI tutor reply as plain text. The session id is returned in X-Session-Id. */
export async function POST(request: NextRequest) {
  const viewer = await getViewer();
  if (!viewer) return json(401, "Silakan masuk terlebih dahulu.");
  if (!aiEnabled()) return json(503, "AI tutor belum dikonfigurasi oleh pengelola platform.");

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json(400, parsed.error.issues[0]?.message ?? "Permintaan tidak valid.");
  const { mode, message } = parsed.data;

  const db = createAdminClient();
  const { data: allowed } = await db.rpc("check_rate_limit", { p_key: `tutor:${viewer.id}`, p_limit: 8, p_window_seconds: 60 });
  if (allowed === false) return json(429, "Terlalu banyak pesan. Tunggu sebentar.");
  const quota = await tutorQuota(viewer.id);
  if (quota.remaining <= 0) return json(429, `Kuota AI tutor harian (${quota.limit} pesan) sudah habis. Coba lagi besok.`);

  // Session ownership.
  let sessionId = parsed.data.sessionId ?? null;
  if (sessionId) {
    const { data: s } = await db.from("ai_tutor_sessions").select("user_id").eq("id", sessionId).maybeSingle();
    if (!s || s.user_id !== viewer.id) return json(404, "Percakapan tidak ditemukan.");
  } else {
    const { data: s, error } = await db
      .from("ai_tutor_sessions")
      .insert({ user_id: viewer.id, mode, title: message.slice(0, 80) })
      .select("id")
      .single();
    if (error) return json(500, "Percakapan gagal dibuat.");
    sessionId = s.id;
  }

  const { data: previous } = await db
    .from("ai_tutor_messages")
    .select("role, content")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(HISTORY_LIMIT);
  const history = [...(previous ?? [])].reverse().map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
  // The API requires the conversation to start with a user turn.
  while (history.length && history[0].role !== "user") history.shift();
  history.push({ role: "user", content: message });
  await db.from("ai_tutor_messages").insert({ session_id: sessionId, user_id: viewer.id, role: "user", content: message });

  const { data: level } = viewer.profile.current_level_id
    ? await db.from("levels").select("code").eq("id", viewer.profile.current_level_id).maybeSingle()
    : { data: null };

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let text = "";
      try {
        const generator = streamTutorReply({ mode: mode as TutorMode, levelCode: level?.code ?? null, history });
        let step = await generator.next();
        while (!step.done) {
          text += step.value;
          controller.enqueue(encoder.encode(step.value));
          step = await generator.next();
        }
        const meta = step.value;
        if (meta.stopReason === "refusal") {
          const note = "\n\n_Maaf, permintaan ini tidak dapat dijawab oleh AI tutor._";
          text += note;
          controller.enqueue(encoder.encode(note));
        } else if (meta.stopReason === "max_tokens") {
          const note = "\n\n_(Jawaban terpotong karena terlalu panjang. Minta lanjutan jika perlu.)_";
          text += note;
          controller.enqueue(encoder.encode(note));
        }
        await db.from("ai_tutor_messages").insert({
          session_id: sessionId!,
          user_id: viewer.id,
          role: "assistant",
          content: text.slice(0, 20_000) || "(tidak ada jawaban)",
          input_tokens: meta.inputTokens,
          output_tokens: meta.outputTokens,
        });
        await db.from("ai_tutor_sessions").update({ updated_at: new Date().toISOString() }).eq("id", sessionId!);
      } catch (error) {
        console.error("[tutor]", error instanceof Error ? error.message : error);
        const note = `${text ? "\n\n" : ""}⚠️ ${describeProviderError(error)}`;
        controller.enqueue(encoder.encode(note));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Session-Id": sessionId!,
      "X-Quota-Remaining": String(quota.remaining - 1),
    },
  });
}
