import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { serverEnv } from "@/lib/env.server";

/**
 * AI tutor provider: OpenAI (when OPENAI_API_KEY is set) or Anthropic Claude (ANTHROPIC_API_KEY).
 * The feature is optional: everything in Linguora works without it, and it stays disabled until a
 * key is set. Keys never leave the server.
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

export type AiProvider = "openai" | "anthropic";

const DEFAULT_MODEL: Record<AiProvider, string> = { openai: "gpt-5.4-mini", anthropic: "claude-sonnet-5-5" };

export function aiProvider(): AiProvider | null {
  const env = serverEnv();
  if (env.OPENAI_API_KEY) return "openai";
  if (env.ANTHROPIC_API_KEY) return "anthropic";
  return null;
}

export function aiEnabled(): boolean {
  return aiProvider() !== null;
}

export function aiModel(): string {
  const provider = aiProvider();
  return serverEnv().AI_TUTOR_MODEL ?? (provider ? DEFAULT_MODEL[provider] : "");
}

let anthropicClient: Anthropic | null = null;
let openaiClient: OpenAI | null = null;

function anthropic(): Anthropic {
  const key = serverEnv().ANTHROPIC_API_KEY;
  if (!key) throw new Error("AI provider is not configured");
  if (!anthropicClient) anthropicClient = new Anthropic({ apiKey: key, maxRetries: 2, timeout: 60_000 });
  return anthropicClient;
}

function openai(): OpenAI {
  const key = serverEnv().OPENAI_API_KEY;
  if (!key) throw new Error("AI provider is not configured");
  if (!openaiClient) openaiClient = new OpenAI({ apiKey: key, maxRetries: 2, timeout: 60_000 });
  return openaiClient;
}

export function systemPrompt(mode: TutorMode, levelCode: string | null) {
  return `${BASE_SYSTEM}\n\nLearner level (estimated): ${levelCode ?? "unknown"}.\nMode: ${MODE_INSTRUCTIONS[mode]}`;
}

export type TutorTurn = { role: "user" | "assistant"; content: string };

export type TutorStreamResult = { stopReason: "end" | "max_tokens" | "refusal"; inputTokens: number; outputTokens: number };

/** Streams a tutor reply. Yields text deltas; resolves with usage and the final stop reason. */
export async function* streamTutorReply(params: { mode: TutorMode; levelCode: string | null; history: TutorTurn[] }): AsyncGenerator<string, TutorStreamResult> {
  const system = systemPrompt(params.mode, params.levelCode);
  if (aiProvider() === "openai") {
    const stream = await openai().chat.completions.create({
      model: aiModel(),
      stream: true,
      stream_options: { include_usage: true },
      max_completion_tokens: 4000,
      reasoning_effort: "low",
      messages: [{ role: "system", content: system }, ...params.history.map((t) => ({ role: t.role, content: t.content }))],
    });
    let finish: string | null = null;
    let refused = false;
    let usage: OpenAI.CompletionUsage | undefined;
    for await (const chunk of stream) {
      const choice = chunk.choices[0];
      if (choice?.delta?.content) yield choice.delta.content;
      if (choice?.delta?.refusal) {
        refused = true;
        yield choice.delta.refusal;
      }
      if (choice?.finish_reason) finish = choice.finish_reason;
      if (chunk.usage) usage = chunk.usage;
    }
    return {
      stopReason: refused || finish === "content_filter" ? "refusal" : finish === "length" ? "max_tokens" : "end",
      inputTokens: usage?.prompt_tokens ?? 0,
      outputTokens: usage?.completion_tokens ?? 0,
    };
  }

  const stream = anthropic().beta.messages.stream({
    model: aiModel(),
    max_tokens: 4000,
    // Chat responses do well at low effort; keeps latency and cost down.
    output_config: { effort: "low" },
    // Server-side fallback re-runs a declined request on a suitable model.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
    messages: params.history.map((t) => ({ role: t.role, content: t.content })),
  });
  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") yield event.delta.text;
  }
  const final = await stream.finalMessage();
  return {
    stopReason: final.stop_reason === "refusal" ? "refusal" : final.stop_reason === "max_tokens" ? "max_tokens" : "end",
    inputTokens: final.usage.input_tokens,
    outputTokens: final.usage.output_tokens,
  };
}

/** Non-streaming single answer (used for writing feedback). */
export async function tutorAnswer(params: { mode: TutorMode; levelCode: string | null; prompt: string }): Promise<{ text: string | null; refused: boolean }> {
  const system = systemPrompt(params.mode, params.levelCode);
  if (aiProvider() === "openai") {
    const res = await openai().chat.completions.create({
      model: aiModel(),
      max_completion_tokens: 4000,
      reasoning_effort: "low",
      messages: [
        { role: "system", content: system },
        { role: "user", content: params.prompt },
      ],
    });
    const choice = res.choices[0];
    if (!choice?.message || choice.message.refusal || choice.finish_reason === "content_filter") return { text: null, refused: true };
    return { text: (choice.message.content ?? "").trim(), refused: false };
  }

  const res = await anthropic().beta.messages.create({
    model: aiModel(),
    max_tokens: 4000,
    output_config: { effort: "low" },
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system,
    messages: [{ role: "user", content: params.prompt }],
  });
  if (res.stop_reason === "refusal") return { text: null, refused: true };
  const text = res.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
  return { text, refused: false };
}

export function describeProviderError(error: unknown): string {
  if (error instanceof OpenAI.APIError) {
    if (error.code === "insufficient_quota" || error.code === "credit_balance_exhausted" || error.type === "insufficient_quota")
      return "Kredit layanan AI sedang habis. Hubungi administrator.";
    if (error instanceof OpenAI.RateLimitError) return "Layanan AI sedang sibuk. Coba lagi sebentar lagi.";
    if (error instanceof OpenAI.AuthenticationError || error instanceof OpenAI.PermissionDeniedError) return "Konfigurasi penyedia AI tidak valid. Hubungi administrator.";
    if (error instanceof OpenAI.BadRequestError) return "Permintaan ke AI tidak valid. Coba ubah pesanmu.";
    return "Layanan AI sedang tidak tersedia. Coba lagi nanti.";
  }
  if (error instanceof Anthropic.RateLimitError) return "Layanan AI sedang sibuk. Coba lagi sebentar lagi.";
  if (error instanceof Anthropic.AuthenticationError) return "Konfigurasi penyedia AI tidak valid. Hubungi administrator.";
  if (error instanceof Anthropic.BadRequestError) return "Permintaan ke AI tidak valid. Coba ubah pesanmu.";
  if (error instanceof Anthropic.APIError) return "Layanan AI sedang tidak tersedia. Coba lagi nanti.";
  return "AI tutor tidak dapat dihubungi saat ini.";
}
