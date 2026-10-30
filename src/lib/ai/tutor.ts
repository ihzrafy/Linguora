import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { serverEnv } from "@/lib/env.server";

/**
 * AI tutor provider (Anthropic Claude). The feature is optional: everything in
 * Linguora works without it, and it is disabled until ANTHROPIC_API_KEY is set.
 * The key never leaves the server.
 */
export type TutorMode = "tutor" | "grammar" | "correction" | "conversation" | "vocabulary" | "writing" | "study_plan";

export const TUTOR_MODES: { key: TutorMode; label: string; hint: string }[] = [
  { key: "tutor", label: "Tanya bebas", hint: "Tanyakan apa saja tentang bahasa Inggris." },
  { key: "grammar", label: "Jelaskan grammar", hint: "Contoh: Apa beda present perfect dan past simple?" },
  { key: "correction", label: "Koreksi kalimat", hint: "Tempel kalimatmu, AI akan memperbaiki dan menjelaskan." },
  { key: "conversation", label: "Simulasi percakapan", hint: "Contoh: Role-play check-in di hotel, level A2." },
  { key: "vocabulary", label: "Kosakata", hint: "Beda kata yang mirip, daftar kosakata per topik, kolokasi." },
  { key: "writing", label: "Feedback tulisan", hint: "Tempel paragraf untuk feedback awal berdasarkan rubrik." },
  { key: "study_plan", label: "Rencana belajar", hint: "Contoh: Target IELTS 6.5 dalam 4 bulan, 1 jam/hari." },
];

const BASE_SYSTEM = `You are the Linguora English tutor for Indonesian-speaking learners.

Rules:
- Explain in Bahasa Indonesia for beginners (A1–A2) and mix in more English as the learner's level rises; follow the learner's language if they write in English.
- Be accurate and concise. Use short examples. Format with Markdown (short lists, bold for key forms); avoid long essays.
- Never invent sources, statistics, exam scores, or claims about official certification. If you are unsure, say so.
- You are an assistant, not the curriculum: when relevant, suggest the learner checks the Linguora lesson or grammar reference. Your answers may contain mistakes.
- Stay on English learning, study skills, and language practice. Politely decline unrelated requests.
- Never ask for or repeat personal data such as passwords, phone numbers, or addresses.`;

const MODE_INSTRUCTIONS: Record<TutorMode, string> = {
  tutor: "Answer the learner's question about English clearly, with 2–3 examples.",
  grammar: "Explain the grammar point: form (formula), meaning/usage, 3 examples (positive, negative, question), and one common mistake Indonesian speakers make.",
  correction:
    "Correct the learner's sentence(s). Show: the corrected version, then a short list of each change and why. If the original is already correct, say so and offer a more natural alternative only if one exists.",
  conversation:
    "Run a role-play conversation at the learner's level. Stay in character, keep each turn to 1–3 sentences, and after every reply add a short line in Indonesian starting with '💡' with at most one correction or tip. Start the scene if the learner only gives a situation.",
  vocabulary: "Help with vocabulary: meanings (with Indonesian), differences between similar words, collocations, and example sentences.",
  writing:
    "Give initial feedback on the learner's writing using five criteria: task completion, organization, coherence & cohesion, grammar, vocabulary. For each, give a short comment. Then list the 3 most important corrections. Do not give a numeric grade; say this is preliminary AI feedback.",
  study_plan:
    "Create a realistic weekly study plan based on the learner's goal, current level and available time. Reference Linguora features (learning path, review queue, labs) instead of external paid products. Keep it to one week template plus milestones.",
};

let client: Anthropic | null = null;

export function aiEnabled(): boolean {
  return Boolean(serverEnv().ANTHROPIC_API_KEY);
}

function getClient(): Anthropic {
  const key = serverEnv().ANTHROPIC_API_KEY;
  if (!key) throw new Error("AI provider is not configured");
  if (!client) client = new Anthropic({ apiKey: key, maxRetries: 2, timeout: 60_000 });
  return client;
}

export function systemPrompt(mode: TutorMode, levelCode: string | null) {
  return `${BASE_SYSTEM}\n\nLearner level (estimated): ${levelCode ?? "unknown"}.\nMode: ${MODE_INSTRUCTIONS[mode]}`;
}

export type TutorTurn = { role: "user" | "assistant"; content: string };

/** Streams a tutor reply. Yields text deltas; resolves with usage and the final stop reason. */
export async function* streamTutorReply(params: { mode: TutorMode; levelCode: string | null; history: TutorTurn[] }) {
  const stream = getClient().beta.messages.stream({
    model: serverEnv().AI_TUTOR_MODEL,
    max_tokens: 4000,
    // Chat responses do well at low effort; keeps latency and cost down.
    output_config: { effort: "low" },
    // Server-side fallback re-runs a declined request on a suitable model.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: [{ type: "text", text: systemPrompt(params.mode, params.levelCode), cache_control: { type: "ephemeral" } }],
    messages: params.history.map((t) => ({ role: t.role, content: t.content })),
  });
  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") yield event.delta.text;
  }
  const final = await stream.finalMessage();
  return {
    stopReason: final.stop_reason,
    inputTokens: final.usage.input_tokens,
    outputTokens: final.usage.output_tokens,
  };
}

/** Non-streaming single answer (used for writing feedback). */
export async function tutorAnswer(params: { mode: TutorMode; levelCode: string | null; prompt: string }) {
  const res = await getClient().beta.messages.create({
    model: serverEnv().AI_TUTOR_MODEL,
    max_tokens: 4000,
    output_config: { effort: "low" },
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: systemPrompt(params.mode, params.levelCode),
    messages: [{ role: "user", content: params.prompt }],
  });
  if (res.stop_reason === "refusal") return { text: null, refused: true, usage: res.usage };
  const text = res.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
  return { text, refused: false, usage: res.usage };
}

export function describeProviderError(error: unknown): string {
  if (error instanceof Anthropic.RateLimitError) return "Layanan AI sedang sibuk. Coba lagi sebentar lagi.";
  if (error instanceof Anthropic.AuthenticationError) return "Konfigurasi penyedia AI tidak valid. Hubungi administrator.";
  if (error instanceof Anthropic.BadRequestError) return "Permintaan ke AI tidak valid. Coba ubah pesanmu.";
  if (error instanceof Anthropic.APIError) return "Layanan AI sedang tidak tersedia. Coba lagi nanti.";
  return "AI tutor tidak dapat dihubungi saat ini.";
}
