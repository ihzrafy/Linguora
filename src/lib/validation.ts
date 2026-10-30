import { z } from "zod";

export const emailSchema = z.email("Masukkan alamat email yang valid.").max(200).transform((v) => v.trim().toLowerCase());

export const passwordSchema = z
  .string()
  .min(8, "Password minimal 8 karakter.")
  .max(72, "Password maksimal 72 karakter.")
  .regex(/[A-Za-z]/, "Password harus mengandung huruf.")
  .regex(/[0-9]/, "Password harus mengandung angka.");

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_]{3,24}$/, "Username 3–24 karakter: huruf kecil, angka, atau garis bawah.");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Masukkan password."),
});

export const registerSchema = z.object({
  displayName: z.string().trim().min(1, "Masukkan nama.").max(60),
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
  timezone: z.string().max(64).optional(),
  acceptTerms: z.literal(true, { error: "Kamu harus menyetujui syarat & kebijakan privasi." }),
});

export const forgotSchema = z.object({ email: emailSchema });

export const resetSchema = z
  .object({ password: passwordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { message: "Konfirmasi password tidak sama.", path: ["confirm"] });

export const contactSchema = z.object({
  name: z.string().trim().min(1, "Masukkan nama.").max(100),
  email: emailSchema,
  subject: z.string().trim().min(1, "Masukkan subjek.").max(150),
  message: z.string().trim().min(10, "Pesan minimal 10 karakter.").max(5000),
});
