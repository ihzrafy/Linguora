"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Shuffle, Volume2 } from "lucide-react";
import { SpeakingRecorder } from "@/components/learning/speaking-recorder";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { normalizeAnswer } from "@/lib/questions/normalize";
import { speak, ttsSupported, useBrowserSupport } from "@/lib/speech";

type Item = { word: string; ipa: string | null; meaning: string; example: string | null };

export function PronunciationDrill({ userId, items }: { userId: string; items: Item[] }) {
  const tts = useBrowserSupport(ttsSupported);
  const [seed, setSeed] = useState(0);
  const deck = useMemo(() => {
    // Deterministic shuffle per "seed" (pure during render).
    let state = (seed + 1) * 2654435761;
    const rand = () => ((state = (state * 1103515245 + 12345) >>> 0) / 4294967296);
    const copy = [...items];
    for (let k = copy.length - 1; k > 0; k--) {
      const j = Math.floor(rand() * (k + 1));
      [copy[k], copy[j]] = [copy[j], copy[k]];
    }
    return copy.slice(0, 15);
  }, [items, seed]);
  const [i, setI] = useState(0);
  const [heard, setHeard] = useState("");
  const item = deck[i % deck.length];
  const recognized = heard ? normalizeAnswer(heard).split(" ").includes(normalizeAnswer(item.word)) : null;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Card>
        <CardContent className="space-y-4 text-center">
          <p className="text-4xl font-bold">{item.word}</p>
          {item.ipa && <p className="font-mono text-lg text-muted-foreground">{item.ipa}</p>}
          <p className="text-sm text-muted-foreground">{item.meaning}</p>
          {tts && (
            <div className="flex justify-center gap-2">
              <Button variant="secondary" onClick={() => speak(item.word, { rate: 0.85 })}>
                <Volume2 /> Kata (US)
              </Button>
              <Button variant="secondary" onClick={() => speak(item.word, { rate: 0.85, accent: "en-GB" })}>
                <Volume2 /> Kata (UK)
              </Button>
              {item.example && (
                <Button variant="ghost" onClick={() => speak(item.example!, { rate: 0.9 })}>
                  <Volume2 /> Kalimat
                </Button>
              )}
            </div>
          )}
          {item.example && <p className="text-sm italic">“{item.example}”</p>}
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-3">
          <SpeakingRecorder key={`${seed}-${i}`} userId={userId} promptId={null} mode="pronunciation" targetPhrases={[item.word]} onTranscript={setHeard} compact />
          {recognized !== null && (
            <p className={recognized ? "text-sm text-success" : "text-sm text-muted-foreground"}>
              {recognized ? `Browser mengenali kata “${item.word}”.` : `Browser mendengar: “${heard}”. Coba ucapkan lagi lebih jelas, perhatikan IPA dan model audio.`}
            </p>
          )}
        </CardContent>
      </Card>
      <div className="flex justify-between">
        <Button variant="ghost" onClick={() => (setSeed((s) => s + 1), setI(0), setHeard(""))}>
          <Shuffle /> Kata lain
        </Button>
        <Button onClick={() => (setI(i + 1), setHeard(""))}>
          Berikutnya <ArrowRight />
        </Button>
      </div>
    </div>
  );
}
