"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ArrowLeft, ArrowRight, Briefcase, Compass, GraduationCap, Loader2, MessageCircle, Plane, Rocket, Trophy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { completeOnboardingAction } from "./actions";

gsap.registerPlugin(useGSAP);

const GOALS = [
  { key: "daily", label: "Komunikasi sehari-hari", icon: MessageCircle, track: "general-english" },
  { key: "travel", label: "Traveling", icon: Plane, track: "general-english" },
  { key: "academic", label: "Studi & akademik", icon: GraduationCap, track: "academic-english" },
  { key: "exam", label: "Persiapan tes bahasa", icon: Trophy, track: "academic-english" },
  { key: "business", label: "Bisnis & kantor", icon: Briefcase, track: "business-english" },
  { key: "career", label: "Karier & wawancara kerja", icon: Rocket, track: "career-development" },
] as const;

const TRACKS = [
  { key: "general-english", label: "General English", text: "Fondasi komunikasi sehari-hari." },
  { key: "academic-english", label: "English for Academic Purposes", text: "Membaca, menulis, dan presentasi akademik." },
  { key: "business-english", label: "Business English", text: "Email, rapat, negosiasi." },
  { key: "career-development", label: "English for Career Development", text: "CV, wawancara, komunikasi kerja." },
] as const;

const PACES = [
  { minutes: 10, xp: 20, label: "Santai", text: "10 menit/hari" },
  { minutes: 15, xp: 30, label: "Rutin", text: "15 menit/hari" },
  { minutes: 30, xp: 60, label: "Serius", text: "30 menit/hari" },
  { minutes: 45, xp: 90, label: "Intensif", text: "45 menit/hari" },
];

export function OnboardingWizard({ name }: { name: string }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState<(typeof GOALS)[number]["key"] | null>(null);
  const [track, setTrack] = useState<(typeof TRACKS)[number]["key"]>("general-english");
  const [pace, setPace] = useState(PACES[1]);
  const [optIn, setOptIn] = useState(false);
  const [pending, start] = useTransition();
  const panel = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.matchMedia().add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from("[data-step] > *", { opacity: 0, y: 18, duration: 0.4, stagger: 0.05, ease: "power2.out" });
      });
    },
    { scope: panel, dependencies: [step] },
  );

  const finish = (next: "placement" | "a1") =>
    start(async () => {
      if (!goal) return;
      const res = await completeOnboardingAction({
        goal,
        trackSlug: track,
        dailyGoalMinutes: pace.minutes,
        dailyGoalXp: pace.xp,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        leaderboardOptIn: optIn,
      });
      if (!res.ok) return void toast.error(res.error);
      router.replace(next === "placement" ? "/app/placement-test" : "/app/learn/a1");
      router.refresh();
    });

  const steps = ["Tujuan", "Track", "Target", "Mulai"];
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Langkah {step + 1} dari {steps.length} · {steps[step]}
        </p>
        <Progress value={((step + 1) / steps.length) * 100} aria-label="Progres onboarding" />
      </div>

      <div ref={panel} key={step} data-step className="space-y-6">
        {step === 0 && (
          <>
            <h1 className="text-3xl font-bold">Hai {name}! Apa tujuan utamamu belajar bahasa Inggris?</h1>
            <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Tujuan belajar">
              {GOALS.map((g) => (
                <button
                  key={g.key}
                  type="button"
                  role="radio"
                  aria-checked={goal === g.key}
                  onClick={() => {
                    setGoal(g.key);
                    setTrack(g.track);
                  }}
                  className={cn("flex items-center gap-3 rounded-xl border-2 p-4 text-left transition", goal === g.key ? "border-primary bg-primary/5" : "hover:border-primary/40")}
                >
                  <g.icon className="size-5 text-primary dark:text-brand-lavender" aria-hidden />
                  <span className="font-medium">{g.label}</span>
                </button>
              ))}
            </div>
          </>
        )}
        {step === 1 && (
          <>
            <h1 className="text-3xl font-bold">Pilih learning track</h1>
            <p className="text-muted-foreground">Kami memilihkan track berdasarkan tujuanmu. Semua track memakai jalur inti General English sebagai fondasi.</p>
            <div className="grid gap-3" role="radiogroup" aria-label="Learning track">
              {TRACKS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  role="radio"
                  aria-checked={track === t.key}
                  onClick={() => setTrack(t.key)}
                  className={cn("rounded-xl border-2 p-4 text-left transition", track === t.key ? "border-primary bg-primary/5" : "hover:border-primary/40")}
                >
                  <p className="font-semibold">{t.label}</p>
                  <p className="text-sm text-muted-foreground">{t.text}</p>
                </button>
              ))}
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <h1 className="text-3xl font-bold">Berapa lama kamu ingin belajar setiap hari?</h1>
            <p className="text-muted-foreground">Target yang realistis lebih mudah dijaga. Kamu bisa mengubahnya kapan saja.</p>
            <div className="grid gap-3 sm:grid-cols-4" role="radiogroup" aria-label="Target harian">
              {PACES.map((p) => (
                <button
                  key={p.minutes}
                  type="button"
                  role="radio"
                  aria-checked={pace.minutes === p.minutes}
                  onClick={() => setPace(p)}
                  className={cn("rounded-xl border-2 p-4 text-center transition", pace.minutes === p.minutes ? "border-primary bg-primary/5" : "hover:border-primary/40")}
                >
                  <p className="font-semibold">{p.label}</p>
                  <p className="text-sm text-muted-foreground">{p.text}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{p.xp} XP</p>
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between gap-4 rounded-xl border p-4">
              <Label htmlFor="optin" className="flex flex-col items-start gap-1">
                <span>Tampilkan saya di leaderboard</span>
                <span className="text-xs font-normal text-muted-foreground">Hanya nama tampilan, username, dan XP yang terlihat. Email tidak pernah ditampilkan.</span>
              </Label>
              <Switch id="optin" checked={optIn} onCheckedChange={setOptIn} />
            </div>
          </>
        )}
        {step === 3 && (
          <>
            <h1 className="text-3xl font-bold">Mulai dari mana?</h1>
            <p className="text-muted-foreground">Placement test (48 soal, ±30–40 menit) mengestimasi levelmu dan membuka level yang sesuai. Kamu juga bisa langsung mulai dari A1.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <button type="button" disabled={pending} onClick={() => finish("placement")} className="rounded-xl border-2 border-primary bg-primary/5 p-5 text-left transition hover:bg-primary/10">
                <Compass className="mb-2 size-6 text-primary" aria-hidden />
                <p className="font-semibold">Ikuti placement test</p>
                <p className="text-sm text-muted-foreground">Direkomendasikan jika kamu sudah pernah belajar bahasa Inggris.</p>
              </button>
              <button type="button" disabled={pending} onClick={() => finish("a1")} className="rounded-xl border-2 p-5 text-left transition hover:border-primary/40">
                <Rocket className="mb-2 size-6 text-primary" aria-hidden />
                <p className="font-semibold">Mulai dari A1</p>
                <p className="text-sm text-muted-foreground">Cocok untuk pemula yang ingin belajar dari dasar.</p>
              </button>
            </div>
            {pending && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Menyimpan preferensi…
              </p>
            )}
          </>
        )}
      </div>

      <div className="flex justify-between">
        <Button variant="ghost" onClick={() => setStep((s) => s - 1)} disabled={step === 0 || pending}>
          <ArrowLeft /> Kembali
        </Button>
        {step < 3 && (
          <Button onClick={() => setStep((s) => s + 1)} disabled={step === 0 && !goal}>
            Lanjut <ArrowRight />
          </Button>
        )}
      </div>
    </div>
  );
}
