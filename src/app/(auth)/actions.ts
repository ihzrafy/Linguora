"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ActionError } from "@/lib/auth";
import { clientIp, rateLimit, runAction, type ActionResult } from "@/lib/actions";
import { publicEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { forgotSchema, loginSchema, registerSchema, resetSchema } from "@/lib/validation";
import { safeRedirectPath } from "@/lib/utils";

/** Determine current request origin (e.g. production domain on Vercel). */
async function getSiteOrigin() {
  const headerList = await headers();
  const origin = headerList.get("origin");
  if (origin && !origin.includes("localhost")) return origin;

  const host = headerList.get("x-forwarded-host") || headerList.get("host");
  if (host && !host.includes("localhost")) {
    const proto = headerList.get("x-forwarded-proto") || "https";
    return `${proto}://${host}`;
  }

  // Canonical production URL on Vercel or environment override
  if (process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes("localhost")) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  // Fallback for local development
  if (origin) return origin;
  if (host) {
    const proto = headerList.get("x-forwarded-proto") || "http";
    return `${proto}://${host}`;
  }
  return publicEnv.NEXT_PUBLIC_SITE_URL;
}

/** Only allow redirects to internal paths. */
const safeNext = (next: unknown) => safeRedirectPath(next);

export async function loginAction(input: unknown, next?: string): Promise<ActionResult<{ redirectTo: string }>> {
  return runAction(async () => {
    const data = loginSchema.parse(input);
    await rateLimit(`login:${await clientIp()}`, 10, 300);
    await rateLimit(`login:${data.email}`, 8, 300);
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword(data);
    if (error) {
      if (error.code === "email_not_confirmed") throw new ActionError("Email belum dikonfirmasi. Cek kotak masuk email kamu.", "invalid");
      throw new ActionError("Email atau password salah.", "invalid");
    }
    return { redirectTo: safeNext(next) };
  });
}

export async function registerAction(input: unknown): Promise<ActionResult<{ needsConfirmation: boolean }>> {
  return runAction(async () => {
    const data = registerSchema.parse(input);
    await rateLimit(`register:${await clientIp()}`, 5, 3600);
    const admin = createAdminClient();
    const { data: setting } = await admin.from("system_settings").select("value").eq("key", "registration_open").maybeSingle();
    if (setting && setting.value === false) throw new ActionError("Pendaftaran sedang ditutup sementara.", "forbidden");
    const { data: taken } = await admin.from("profiles").select("id").eq("username", data.username).maybeSingle();
    if (taken) throw new ActionError("Username sudah dipakai. Pilih username lain.", "conflict");

    const origin = await getSiteOrigin();
    const supabase = await createClient();
    const { data: result, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: { username: data.username, display_name: data.displayName, timezone: data.timezone },
        emailRedirectTo: `${origin}/auth/callback?next=/app/onboarding`,
      },
    });
    if (error) {
      if (error.code === "user_already_exists" || /already registered/i.test(error.message))
        throw new ActionError("Email sudah terdaftar. Silakan masuk.", "conflict");
      if (error.code === "weak_password") throw new ActionError("Password terlalu lemah.", "invalid");
      throw new ActionError(error.message, "invalid");
    }
    return { needsConfirmation: !result.session };
  });
}

export async function forgotPasswordAction(input: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const data = forgotSchema.parse(input);
    await rateLimit(`forgot:${await clientIp()}`, 5, 3600);
    const origin = await getSiteOrigin();
    const supabase = await createClient();
    // Always succeed to avoid revealing whether an email is registered.
    await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${origin}/auth/callback?next=/reset-password`,
    });
    return undefined;
  });
}

export async function resetPasswordAction(input: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const data = resetSchema.parse(input);
    const supabase = await createClient();
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new ActionError("Tautan reset sudah kedaluwarsa. Minta tautan baru.", "unauthenticated");
    const { error } = await supabase.auth.updateUser({ password: data.password });
    if (error) throw new ActionError(error.code === "same_password" ? "Gunakan password yang berbeda dari sebelumnya." : error.message);
    return undefined;
  });
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
