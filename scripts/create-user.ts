/**
 * Creates (or updates) a user and grants a role.
 *
 *   npm run user:create -- --email admin@example.com --password 'S3cure-pass' --role super_admin --name "Admin"
 *
 * Roles: super_admin | admin | content_editor | reviewer | student (default)
 */
import { adminClient } from "./lib/script-env";

const ROLES = ["super_admin", "admin", "content_editor", "reviewer", "student"] as const;
type Role = (typeof ROLES)[number];

function arg(name: string) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const email = arg("email");
  const password = arg("password");
  const role = (arg("role") ?? "student") as Role;
  const name = arg("name") ?? email?.split("@")[0] ?? "Learner";
  if (!email || !password) throw new Error("Usage: --email <email> --password <password> [--role <role>] [--name <name>]");
  if (!ROLES.includes(role)) throw new Error(`Unknown role ${role}`);
  if (password.length < 8) throw new Error("Password must be at least 8 characters.");

  const db = adminClient();
  const { data: list } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
  let user = list?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!user) {
    const { data, error } = await db.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: name, username: name.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 18) },
    });
    if (error) throw error;
    user = data.user;
    console.log(`✓ created ${email}`);
  } else {
    await db.auth.admin.updateUserById(user.id, { password });
    console.log(`✓ updated password for ${email}`);
  }
  if (role !== "student") {
    const { error } = await db.from("user_roles").upsert({ user_id: user.id, role }, { onConflict: "user_id,role" });
    if (error) throw error;
    console.log(`✓ granted ${role}`);
  }
  await db.from("profiles").update({ onboarding_completed_at: role === "student" ? null : new Date().toISOString() }).eq("id", user.id);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
