"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { Field, FormMessage } from "@/components/shared/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { contactSchema } from "@/lib/validation";
import { contactAction } from "./actions";

export function ContactForm() {
  const [pending, start] = useTransition();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<z.input<typeof contactSchema>>({ resolver: zodResolver(contactSchema), defaultValues: { name: "", email: "", subject: "", message: "" } });
  const { errors } = form.formState;
  if (sent) return <FormMessage tone="success">Terima kasih! Pesanmu sudah kami terima dan akan dibalas melalui email.</FormMessage>;
  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={form.handleSubmit((v) =>
        start(async () => {
          const res = await contactAction(v);
          if (!res.ok) return setError(res.error);
          setSent(true);
        }),
      )}
    >
      {error && <FormMessage>{error}</FormMessage>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nama" error={errors.name?.message}>
          {(p) => <Input {...p} {...form.register("name")} autoComplete="name" />}
        </Field>
        <Field label="Email" error={errors.email?.message}>
          {(p) => <Input {...p} {...form.register("email")} type="email" autoComplete="email" />}
        </Field>
      </div>
      <Field label="Subjek" error={errors.subject?.message}>
        {(p) => <Input {...p} {...form.register("subject")} />}
      </Field>
      <Field label="Pesan" error={errors.message?.message}>
        {(p) => <Textarea {...p} {...form.register("message")} rows={6} />}
      </Field>
      <Button type="submit" disabled={pending}>
        {pending && <Loader2 className="animate-spin" />} Kirim pesan
      </Button>
    </form>
  );
}
