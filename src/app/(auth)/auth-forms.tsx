"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Field, FormMessage } from "@/components/shared/field";
import { forgotSchema, loginSchema, registerSchema, resetSchema } from "@/lib/validation";
import { forgotPasswordAction, loginAction, registerAction, resendConfirmationAction, resetPasswordAction } from "./actions";

function PasswordInput(props: React.ComponentProps<typeof Input>) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input {...props} type={visible ? "text" : "password"} className="h-10 pr-10" />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
        aria-label={visible ? "Sembunyikan password" : "Tampilkan password"}
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

function Submit({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  return (
    <Button type="submit" className="h-10 w-full" disabled={pending}>
      {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </Button>
  );
}

export function LoginForm({ next, initialError }: { next?: string; initialError?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(initialError ?? null);
  const form = useForm<z.input<typeof loginSchema>>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } });
  const { errors } = form.formState;

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={form.handleSubmit((values) =>
        start(async () => {
          setError(null);
          const res = await loginAction(values, next);
          if (!res.ok) return setError(res.error);
          router.replace(res.data.redirectTo);
          router.refresh();
        }),
      )}
    >
      {error && <FormMessage>{error}</FormMessage>}
      <Field label="Email" error={errors.email?.message}>
        {(p) => <Input {...p} {...form.register("email")} type="email" autoComplete="email" className="h-10" />}
      </Field>
      <Field label="Password" error={errors.password?.message}>
        {(p) => <PasswordInput {...p} {...form.register("password")} autoComplete="current-password" />}
      </Field>
      <div className="flex justify-end">
        <Link href="/forgot-password" className="text-sm font-medium text-primary hover:underline">
          Lupa password?
        </Link>
      </div>
      <Submit pending={pending}>Masuk</Submit>
    </form>
  );
}

/**
 * Shown after sign-up while the email is unconfirmed. The confirmation link may be opened on
 * another device (e.g. a phone); this tab then signs in with the credentials just entered.
 */
function CheckEmail({ email, password }: { email: string; password: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);

  return (
    <div className="space-y-4">
      <FormMessage tone="success">
        Akun berhasil dibuat. Kami mengirim tautan konfirmasi ke <strong className="font-semibold">{email}</strong>. Tautan
        boleh dibuka di HP atau perangkat lain. Tidak ada di kotak masuk? Periksa folder Spam atau Promosi.
      </FormMessage>
      {message && <FormMessage tone={message.tone}>{message.text}</FormMessage>}
      <Button
        type="button"
        className="h-10 w-full"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setMessage(null);
            const res = await loginAction({ email, password }, "/app/onboarding");
            if (!res.ok) return setMessage({ tone: "error", text: res.error });
            router.replace(res.data.redirectTo);
            router.refresh();
          })
        }
      >
        {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
        Sudah konfirmasi? Masuk
      </Button>
      <Button
        type="button"
        variant="outline"
        className="h-10 w-full"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setMessage(null);
            const res = await resendConfirmationAction({ email });
            setMessage(res.ok ? { tone: "success", text: "Email konfirmasi baru sudah dikirim." } : { tone: "error", text: res.error });
          })
        }
      >
        Kirim ulang email konfirmasi
      </Button>
    </div>
  );
}

export function RegisterForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState<{ email: string; password: string } | null>(null);
  const form = useForm<z.input<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: { displayName: "", username: "", email: "", password: "", acceptTerms: false as unknown as true },
  });
  const { errors } = form.formState;
  const acceptTerms = useWatch({ control: form.control, name: "acceptTerms" });

  if (checkEmail) return <CheckEmail {...checkEmail} />;

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={form.handleSubmit((values) =>
        start(async () => {
          setError(null);
          const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
          const res = await registerAction({ ...values, timezone });
          if (!res.ok) {
            if (res.code === "conflict" && /username/i.test(res.error)) form.setError("username", { message: res.error });
            return setError(res.error);
          }
          if (res.data.needsConfirmation) return setCheckEmail({ email: values.email, password: values.password });
          router.replace("/app/onboarding");
          router.refresh();
        }),
      )}
    >
      {error && <FormMessage>{error}</FormMessage>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nama" error={errors.displayName?.message}>
          {(p) => <Input {...p} {...form.register("displayName")} autoComplete="name" className="h-10" />}
        </Field>
        <Field label="Username" error={errors.username?.message} hint="Ditampilkan di leaderboard.">
          {(p) => <Input {...p} {...form.register("username")} autoComplete="username" className="h-10" />}
        </Field>
      </div>
      <Field label="Email" error={errors.email?.message}>
        {(p) => <Input {...p} {...form.register("email")} type="email" autoComplete="email" className="h-10" />}
      </Field>
      <Field label="Password" error={errors.password?.message} hint="Minimal 8 karakter, berisi huruf dan angka.">
        {(p) => <PasswordInput {...p} {...form.register("password")} autoComplete="new-password" />}
      </Field>
      <div className="space-y-1">
        <label className="flex items-start gap-2.5 text-sm text-muted-foreground">
          <Checkbox
            className="mt-0.5"
            checked={Boolean(acceptTerms)}
            onCheckedChange={(v) => form.setValue("acceptTerms", (v === true) as true, { shouldValidate: true })}
            aria-invalid={Boolean(errors.acceptTerms)}
          />
          <span>
            Saya menyetujui{" "}
            <Link href="/terms" className="font-medium text-primary hover:underline">
              Syarat Layanan
            </Link>{" "}
            dan{" "}
            <Link href="/privacy" className="font-medium text-primary hover:underline">
              Kebijakan Privasi
            </Link>
            .
          </span>
        </label>
        {errors.acceptTerms && (
          <p role="alert" className="text-xs font-medium text-destructive">
            {errors.acceptTerms.message}
          </p>
        )}
      </div>
      <Submit pending={pending}>Buat akun</Submit>
    </form>
  );
}

export function ForgotForm() {
  const [pending, start] = useTransition();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<z.input<typeof forgotSchema>>({ resolver: zodResolver(forgotSchema), defaultValues: { email: "" } });

  if (sent)
    return (
      <FormMessage tone="success">
        Jika email tersebut terdaftar, tautan untuk mengatur ulang password sudah dikirim. Periksa kotak masuk dan folder spam.
      </FormMessage>
    );
  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={form.handleSubmit((values) =>
        start(async () => {
          const res = await forgotPasswordAction(values);
          if (!res.ok) return setError(res.error);
          setSent(true);
        }),
      )}
    >
      {error && <FormMessage>{error}</FormMessage>}
      <Field label="Email" error={form.formState.errors.email?.message}>
        {(p) => <Input {...p} {...form.register("email")} type="email" autoComplete="email" className="h-10" />}
      </Field>
      <Submit pending={pending}>Kirim tautan reset</Submit>
    </form>
  );
}

export function ResetForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<z.input<typeof resetSchema>>({ resolver: zodResolver(resetSchema), defaultValues: { password: "", confirm: "" } });
  const { errors } = form.formState;
  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={form.handleSubmit((values) =>
        start(async () => {
          const res = await resetPasswordAction(values);
          if (!res.ok) return setError(res.error);
          router.replace("/app/dashboard?passwordUpdated=1");
        }),
      )}
    >
      {error && <FormMessage>{error}</FormMessage>}
      <Field label="Password baru" error={errors.password?.message}>
        {(p) => <PasswordInput {...p} {...form.register("password")} autoComplete="new-password" />}
      </Field>
      <Field label="Ulangi password" error={errors.confirm?.message}>
        {(p) => <PasswordInput {...p} {...form.register("confirm")} autoComplete="new-password" />}
      </Field>
      <Submit pending={pending}>Simpan password</Submit>
    </form>
  );
}
