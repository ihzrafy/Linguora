import type { Metadata } from "next";
import { PublicHero } from "../_components";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = { title: "Kontak", description: "Hubungi tim Linguora." };

export default function ContactPage() {
  return (
    <>
      <PublicHero eyebrow="Kontak" title="Hubungi kami" description="Punya pertanyaan, masukan materi, atau menemukan kesalahan pada soal? Kirim pesan dan tim kami akan membalas melalui email." />
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <div className="rounded-2xl border bg-card p-6 md:p-8">
          <ContactForm />
        </div>
      </div>
    </>
  );
}
