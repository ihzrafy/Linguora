import "server-only";
import { cache } from "react";
import { forbidden, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type AppRole = Database["public"]["Enums"]["app_role"];
export type Permission =
  | "content.read"
  | "content.write"
  | "content.publish"
  | "content.delete"
  | "users.read"
  | "users.manage"
  | "roles.manage"
  | "reports.view"
  | "audit.view"
  | "settings.manage"
  | "grading.manage";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export type Viewer = {
  id: string;
  email: string | null;
  profile: Profile;
  roles: AppRole[];
  permissions: Set<Permission>;
  isStaff: boolean;
};

/** Verified user from the Auth server (cached per request). */
export const getAuthUser = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
});

/** The signed-in user with profile, roles and permissions (cached per request). */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const user = await getAuthUser();
  if (!user) return null;
  const supabase = await createClient();
  const [{ data: profile }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("user_roles").select("role").eq("user_id", user.id),
  ]);
  if (!profile) return null;
  const roleList = (roles ?? []).map((r) => r.role);
  const { data: perms } = roleList.length
    ? await supabase.from("role_permissions").select("permission").in("role", roleList)
    : { data: [] as { permission: string }[] };
  return {
    id: user.id,
    email: user.email ?? null,
    profile,
    roles: roleList,
    permissions: new Set((perms ?? []).map((p) => p.permission as Permission)),
    isStaff: roleList.some((r) => r !== "student"),
  };
});

/** Use in pages/layouts: redirects to /login when signed out. */
export async function requireViewer(next?: string): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  return viewer;
}

/** Use in pages/layouts: renders 403 when the permission is missing. */
export async function requirePermission(permission: Permission, next?: string): Promise<Viewer> {
  const viewer = await requireViewer(next);
  if (!viewer.permissions.has(permission)) forbidden();
  return viewer;
}

export async function requireStaff(): Promise<Viewer> {
  const viewer = await requireViewer("/admin");
  if (!viewer.isStaff) forbidden();
  return viewer;
}

export class ActionError extends Error {
  constructor(
    message: string,
    public code: "unauthenticated" | "forbidden" | "invalid" | "not_found" | "conflict" | "rate_limited" | "locked" = "invalid",
  ) {
    super(message);
  }
}

/** Use in server actions / route handlers: throws instead of redirecting. */
export async function assertViewer(): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) throw new ActionError("Silakan masuk terlebih dahulu.", "unauthenticated");
  return viewer;
}

export async function assertPermission(permission: Permission): Promise<Viewer> {
  const viewer = await assertViewer();
  if (!viewer.permissions.has(permission)) throw new ActionError("Kamu tidak memiliki izin untuk tindakan ini.", "forbidden");
  return viewer;
}
