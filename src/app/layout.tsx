import type { Metadata, Viewport } from "next";
import { Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"], display: "swap" });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: "Linguora — Belajar Bahasa Inggris dari A1 sampai C2", template: "%s · Linguora" },
  description:
    "Platform belajar bahasa Inggris terstruktur berbasis CEFR: learning path, bank soal interaktif, placement test, spaced repetition, dan latihan empat keterampilan bahasa.",
  applicationName: "Linguora",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f8fc" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1124" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning className={`${jakarta.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="sr-only z-50 rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Lewati ke konten utama
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
