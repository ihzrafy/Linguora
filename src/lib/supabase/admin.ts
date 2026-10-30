import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";
import { serverEnv } from "@/lib/env.server";
import type { Database } from "./database.types";

let admin: ReturnType<typeof createClient<Database>> | null = null;

/**
 * Service-role client. Bypasses RLS — use only in server code after the caller's
 * identity and permissions have been verified. Never import from client components.
 */
export function createAdminClient() {
  if (!admin) {
    admin = createClient<Database>(publicEnv.NEXT_PUBLIC_SUPABASE_URL, serverEnv().SUPABASE_SECRET_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return admin;
}
