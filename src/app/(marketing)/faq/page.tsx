import type { Metadata } from "next";
import { PublicCta, PublicHero } from "../_components";
import { FaqList, FAQS } from "../faq-data";

export const metadata: Metadata = { title: "FAQ", description: "Pertanyaan yang sering diajukan tentang Linguora." };

export default function FaqPage() {
  return (
    <>
      <PublicHero eyebrow="FAQ" title="Pertanyaan yang sering diajukan" description="Belum menemukan jawabannya? Hubungi kami lewat halaman kontak." />
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <FaqList items={FAQS} />
      </div>
      <PublicCta />
    </>
  );
}
