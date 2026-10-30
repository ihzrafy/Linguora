import "server-only";
import { z } from "zod";

const serverSchema = z.object({
  SUPABASE_SECRET_KEY: z.string().min(20, "SUPABASE_SECRET_KEY is required (see .env.example)"),
  ANTHROPIC_API_KEY: z.string().optional().transform((v) => (v ? v : undefined)),
  AI_TUTOR_MODEL: z.string().default("claude-opus-5-5"),
  AI_TUTOR_DAILY_MESSAGE_LIMIT: z.coerce.number().int().min(1).max(1000).default(30),
  CRON_SECRET: z.string().optional().transform((v) => (v ? v : undefined)),
});

let cached: z.infer<typeof serverSchema> | null = null;

/** Validated server-only environment. Throws a descriptive error on misconfiguration. */
export function serverEnv() {
  if (!cached) {
    const parsed = serverSchema.safeParse(process.env);
    if (!parsed.success) {
      throw new Error(
        `Invalid server environment:\n${parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n")}`,
      );
    }
    cached = parsed.data;
  }
  return cached;
}
