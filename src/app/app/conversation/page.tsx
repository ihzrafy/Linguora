import type { Metadata } from "next";
import Link from "next/link";
import { Bot, MessageSquarePlus } from "lucide-react";
import { Alert } from "@/app/app/_components/alert";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { aiEnabled, TUTOR_MODES } from "@/lib/ai/tutor";
import { tutorQuota } from "@/lib/ai/usage";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { TutorChat } from "./chat";

export const metadata: Metadata = { title: "AI Tutor" };

export default async function ConversationPage({ searchParams }: { searchParams: Promise<{ session?: string; mode?: string }> }) {
  const sp = await searchParams;
  const viewer = await requireViewer("/app/conversation");
  const enabled = aiEnabled();
  const supabase = await createClient();
  const { data: sessions } = await supabase.from("ai_tutor_sessions").select("id, title, mode, updated_at").eq("user_id", viewer.id).order("updated_at", { ascending: false }).limit(30);
  const active = sessions?.find((s) => s.id === sp.session) ?? null;
  const { data: messages } = active
    ? await supabase.from("ai_tutor_messages").select("role, content").eq("session_id", active.id).order("created_at")
    : { data: [] };
  const quota = enabled ? await tutorQuota(viewer.id) : { remaining: 0, limit: 0, used: 0 };
  const mode = active?.mode ?? (TUTOR_MODES.some((m) => m.key === sp.mode) ? sp.mode! : "tutor");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="AI English Tutor"
        title="AI Tutor & Simulasi Percakapan"
        description="Minta penjelasan grammar, koreksi kalimat, latihan percakapan role-play, bantuan kosakata, feedback tulisan, atau rencana belajar."
      />
      {!enabled ? (
        <Alert tone="info" icon={Bot} title="AI tutor belum aktif">
          Fitur ini belum diaktifkan oleh pengelola platform. Semua fitur inti Linguora tetap dapat digunakan tanpa AI — coba{" "}
          <Link href="/app/speaking" className="text-primary underline">
            Speaking Lab
          </Link>{" "}
          untuk latihan percakapan atau{" "}
          <Link href="/app/grammar" className="text-primary underline">
            Grammar reference
          </Link>
          .
        </Alert>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[16rem_1fr]">
          <aside className="space-y-2">
            <Button asChild className="w-full" variant="outline">
              <Link href="/app/conversation">
                <MessageSquarePlus /> Percakapan baru
              </Link>
            </Button>
            <nav aria-label="Riwayat percakapan" className="max-h-[60dvh] space-y-1 overflow-y-auto">
              {(sessions ?? []).map((s) => (
                <Link key={s.id} href={`/app/conversation?session=${s.id}`} className={cn("block truncate rounded-lg px-3 py-2 text-sm hover:bg-muted", s.id === active?.id && "bg-accent font-medium")}>
                  {s.title}
                </Link>
              ))}
            </nav>
          </aside>
          <TutorChat
            key={active?.id ?? "new"}
            sessionId={active?.id ?? null}
            initialMessages={(messages ?? []).map((m) => ({ role: m.role as "user" | "assistant", content: m.content }))}
            modes={TUTOR_MODES}
            initialMode={mode}
            remaining={quota.remaining}
          />
        </div>
      )}
    </div>
  );
}
