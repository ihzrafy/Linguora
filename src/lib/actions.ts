import "server-only";
import { headers } from "next/headers";
import { z } from "zod";
import { ActionError } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string; fieldErrors?: Record<string, string[]> };

/** Wraps a server action body: maps validation/permission errors to a friendly result. */
export async function runAction<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (error) {
    if (error instanceof ActionError) return { ok: false, error: error.message, code: error.code };
    if (error instanceof z.ZodError) {
      return {
        ok: false,
        error: error.issues[0]?.message ?? "Data tidak valid.",
        code: "invalid",
        fieldErrors: z.flattenError(error).fieldErrors as Record<string, string[]>,
      };
    }
    // Next.js control-flow errors (redirect, notFound) must propagate.
    if (error && typeof error === "object" && "digest" in error && String((error as { digest: unknown }).digest).startsWith("NEXT_")) throw error;
    console.error("[action]", error);
    return { ok: false, error: "Terjadi kesalahan pada server. Silakan coba lagi.", code: "server" };
  }
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

/** Database-backed fixed-window rate limit (works across server instances). */
export async function rateLimit(key: string, limit: number, windowSeconds: number) {
  const { data, error } = await createAdminClient().rpc("check_rate_limit", {
    p_key: key,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    console.error("[rate-limit]", error.message);
    return; // fail open on infrastructure errors, never on abuse
  }
  if (!data) throw new ActionError("Terlalu banyak percobaan. Silakan tunggu sebentar lalu coba lagi.", "rate_limited");
}
