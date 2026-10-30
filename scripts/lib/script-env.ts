import { config } from "dotenv";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../src/lib/supabase/database.types";

config({ path: path.resolve(__dirname, "../../.env.local"), quiet: true });
config({ path: path.resolve(__dirname, "../../.env"), quiet: true });

export function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set (see .env.example).");
  }
  return createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export function must<T>(res: { data: T; error: { message: string } | null }, label: string): NonNullable<T> {
  if (res.error) throw new Error(`${label}: ${res.error.message}`);
  return res.data as NonNullable<T>;
}
