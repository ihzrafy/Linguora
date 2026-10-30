"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, Loader2, Send, User } from "lucide-react";
import { Markdown } from "@/components/shared/markdown";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; content: string };
type Mode = { key: string; label: string; hint: string };

export function TutorChat({
  sessionId: initialSession,
  initialMessages,
  modes,
  initialMode,
  remaining: initialRemaining,
}: {
  sessionId: string | null;
  initialMessages: Msg[];
  modes: Mode[];
  initialMode: string;
  remaining: number;
}) {
  const router = useRouter();
  const [sessionId, setSessionId] = useState(initialSession);
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [mode, setMode] = useState(initialMode);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(initialRemaining);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setError(null);
    setBusy(true);
    setInput("");
    setMessages((m) => [...m, { role: "user", content: text }, { role: "assistant", content: "" }]);
    try {
      const res = await fetch("/api/tutor", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId, mode, message: text }) });
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => ({ error: "Terjadi kesalahan." }));
        setMessages((m) => m.slice(0, -2));
        setInput(text);
        setError(body.error);
        return;
      }
      const sid = res.headers.get("X-Session-Id");
      if (sid && sid !== sessionId) {
        setSessionId(sid);
        window.history.replaceState(null, "", `/app/conversation?session=${sid}`);
      }
      const left = Number(res.headers.get("X-Quota-Remaining"));
      if (Number.isFinite(left)) setRemaining(left);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: "assistant", content: copy[copy.length - 1].content + chunk };
          return copy;
        });
      }
      router.refresh();
    } catch {
      setError("Koneksi terputus. Coba lagi.");
    } finally {
      setBusy(false);
    }
  };

  const currentMode = modes.find((m) => m.key === mode);
  return (
    <div className="flex h-[calc(100dvh-12rem)] min-h-[28rem] flex-col rounded-2xl border bg-card">
      <div className="flex flex-wrap gap-1.5 border-b p-3" role="radiogroup" aria-label="Mode tutor">
        {modes.map((m) => (
          <button
            key={m.key}
            type="button"
            role="radio"
            aria-checked={mode === m.key}
            disabled={Boolean(sessionId) && messages.length > 0}
            onClick={() => setMode(m.key)}
            className={cn("rounded-full border px-3 py-1 text-xs font-medium disabled:opacity-50", mode === m.key ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")}
          >
            {m.label}
          </button>
        ))}
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto p-4" aria-live="polite">
        {!messages.length && (
          <div className="mx-auto max-w-md pt-10 text-center text-sm text-muted-foreground">
            <Bot className="mx-auto mb-3 size-10 text-primary" />
            <p className="font-medium text-foreground">{currentMode?.label}</p>
            <p>{currentMode?.hint}</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={cn("flex gap-3", m.role === "user" && "flex-row-reverse")}>
            <div className={cn("flex size-8 shrink-0 items-center justify-center rounded-full", m.role === "user" ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground")}>
              {m.role === "user" ? <User className="size-4" /> : <Bot className="size-4" />}
            </div>
            <div className={cn("max-w-[85%] rounded-2xl px-4 py-2.5 text-sm", m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted")}>
              {m.role === "assistant" ? m.content ? <Markdown className="text-sm leading-6">{m.content}</Markdown> : <Loader2 className="size-4 animate-spin" aria-label="Menulis jawaban" /> : <p className="whitespace-pre-wrap">{m.content}</p>}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      {error && (
        <p role="alert" className="border-t bg-destructive/5 px-4 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      <form
        className="flex items-end gap-2 border-t p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <Textarea
          aria-label="Pesan untuk AI tutor"
          rows={2}
          maxLength={2000}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          placeholder={currentMode?.hint}
          className="min-h-11 resize-none"
        />
        <Button type="submit" size="icon-lg" disabled={busy || !input.trim() || remaining <= 0} aria-label="Kirim">
          {busy ? <Loader2 className="animate-spin" /> : <Send />}
        </Button>
      </form>
      <p className="px-4 pb-2 text-[0.7rem] text-muted-foreground">
        Sisa kuota hari ini: {remaining} pesan · Jawaban AI dapat keliru dan terpisah dari kurikulum terverifikasi Linguora.
      </p>
    </div>
  );
}
