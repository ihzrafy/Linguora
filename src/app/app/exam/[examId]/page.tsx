import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Award, Clock, Lock, ListChecks, Target } from "lucide-react";
import { AttemptHistory } from "@/app/app/_components/attempt-history";
import { AttemptView } from "@/app/app/_components/attempt-view";
import { StartAttemptButton } from "@/components/questions/start-button";
import { PageHeader } from "@/components/shared/page-header";
import { Alert } from "@/app/app/_components/alert";
import { Card, CardContent } from "@/components/ui/card";
import { requireViewer } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Ujian Level" };

export default async function ExamPage({
  params,
  searchParams,
}: {
  params: Promise<{ examId: string }>;
  searchParams: Promise<{ attempt?: string }>;
}) {
  const [{ examId }, { attempt }] = await Promise.all([params, searchParams]);
  const viewer = await requireViewer(`/app/exam/${examId}`);
  if (attempt) return <AttemptView viewer={viewer} attemptId={attempt} expect={(a) => a.exam_id === examId} />;

  const supabase = await createClient();
  const { data: exam } = await supabase
    .from("exams")
    .select("id, kind, title, description, pass_threshold, time_limit_seconds, max_attempts, cooldown_hours, question_count, level_id, levels(code, slug, name)")
    .eq("id", examId)
    .maybeSingle();
  if (!exam) notFound();
  if (exam.kind === "placement") redirect("/app/placement-test");
  const level = exam.levels as { code: string; slug: string; name: string } | null;

  const [{ data: unlocked }, { data: attempts }, { data: certificate }] = await Promise.all([
    createAdminClient().rpc("level_exam_unlocked_for", { p_user: viewer.id, p_level: exam.level_id! }),
    supabase
      .from("assessment_attempts")
      .select("id, status, score_percent, passed, submitted_at, started_at, attempt_number")
      .eq("user_id", viewer.id)
      .eq("exam_id", examId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase.from("certificates").select("verification_code, score_percent, issued_at").eq("user_id", viewer.id).eq("level_id", exam.level_id!).maybeSingle(),
  ]);
  const open = attempts?.find((a) => a.status === "in_progress");
  const last = attempts?.find((a) => a.status !== "in_progress");
  const cooldownUntil =
    last && !last.passed && last.submitted_at && exam.cooldown_hours > 0
      ? new Date(new Date(last.submitted_at).getTime() + exam.cooldown_hours * 3_600_000)
      : null;
  // eslint-disable-next-line react-hooks/purity -- request-time comparison in a server component
  const cooling = cooldownUntil !== null && cooldownUntil.getTime() > Date.now();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href={level ? `/app/learn/${level.slug}` : "/app/learn"} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Kembali ke level {level?.code}
      </Link>
      <PageHeader eyebrow={`Ujian level ${level?.code ?? ""}`} title={exam.title} description={exam.description} />
      {certificate && (
        <Alert tone="success" icon={Award} title={`Kamu sudah lulus level ini (${Number(certificate.score_percent)}%)`}>
          Sertifikat internal Linguora · kode verifikasi <span className="font-mono">{certificate.verification_code}</span>. Sertifikat ini bukan sertifikasi CEFR resmi.
        </Alert>
      )}
      <Card>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <Stat icon={ListChecks} label="Jumlah soal" value={`${exam.question_count}`} />
          <Stat icon={Target} label="Nilai lulus" value={`${exam.pass_threshold}%`} />
          <Stat icon={Clock} label="Batas waktu" value={exam.time_limit_seconds ? `${Math.round(exam.time_limit_seconds / 60)} menit` : "Tidak ada"} />
        </CardContent>
      </Card>
      {!unlocked && !open ? (
        <Alert tone="warning" icon={Lock} title="Ujian masih terkunci">
          Selesaikan semua lesson dan lulus semua unit assessment di level ini untuk membuka ujian level.
        </Alert>
      ) : cooling && !open ? (
        <Alert tone="info" icon={Clock} title="Masa tunggu ujian ulang">
          Kamu dapat mengulang ujian setelah {cooldownUntil!.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}. Gunakan waktu ini untuk review materi yang masih lemah.
        </Alert>
      ) : (
        <div className="space-y-2">
          <StartAttemptButton target={{ kind: "level_exam", levelId: exam.level_id! }} hrefFor={`/app/exam/${examId}`} size="lg">
            {open ? "Lanjutkan ujian" : last ? "Ulangi ujian" : "Mulai ujian"}
          </StartAttemptButton>
          <p className="text-xs text-muted-foreground">
            Timer berjalan di server. Jawaban tersimpan otomatis; jika koneksi terputus kamu dapat melanjutkan selama waktu masih tersisa.
          </p>
        </div>
      )}
      <AttemptHistory attempts={attempts ?? []} />
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="rounded-lg bg-accent p-2 text-accent-foreground">
        <Icon className="size-4" aria-hidden />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-semibold">{value}</p>
      </div>
    </div>
  );
}
