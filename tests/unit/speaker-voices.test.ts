import { describe, expect, it } from "vitest";
import { assignSpeakerVoices, speakerGender, voiceGender } from "@/lib/speech";

const voice = (name: string, lang = "en-US") => ({ name, lang, voiceURI: name, localService: true, default: false }) as SpeechSynthesisVoice;

// Typical Windows/Chrome sets.
const WINDOWS = [voice("Microsoft David - English (United States)"), voice("Microsoft Zira - English (United States)"), voice("Microsoft Mark - English (United States)")];
const CHROME = [voice("Google US English"), voice("Google UK English Female", "en-GB"), voice("Google UK English Male", "en-GB"), ...WINDOWS];

describe("speaker gender guess", () => {
  it("uses titles, roles and common names", () => {
    expect(speakerGender("Mrs. Lewis")).toBe("female");
    expect(speakerGender("Mr Adams")).toBe("male");
    expect(speakerGender("Rina")).toBe("female");
    expect(speakerGender("Budi")).toBe("male");
    expect(speakerGender("Receptionist")).toBeNull();
    expect(speakerGender("A")).toBeNull();
  });

  it("classifies common system voices", () => {
    expect(voiceGender(voice("Microsoft Zira - English (United States)"))).toBe("female");
    expect(voiceGender(voice("Microsoft David - English (United States)"))).toBe("male");
    expect(voiceGender(voice("Google UK English Female", "en-GB"))).toBe("female");
    expect(voiceGender(voice("Google UK English Male", "en-GB"))).toBe("male");
  });
});

describe("assignSpeakerVoices", () => {
  it("gives two speakers in a dialogue different voices", () => {
    const map = assignSpeakerVoices(["A", "B", "A", "B"], WINDOWS);
    expect(map.size).toBe(2);
    expect(map.get("A")!.voice!.name).not.toBe(map.get("B")!.voice!.name);
  });

  it("matches voice gender to the speaker when it can be guessed", () => {
    const map = assignSpeakerVoices(["Mr. Adams", "Rina"], WINDOWS);
    expect(voiceGender(map.get("Mr. Adams")!.voice!)).toBe("male");
    expect(voiceGender(map.get("Rina")!.voice!)).toBe("female");
  });

  it("alternates female/male for unknown speakers", () => {
    const map = assignSpeakerVoices(["Receptionist", "Guest"], CHROME);
    expect(map.get("Receptionist")!.gender).toBe("female");
    expect(map.get("Guest")!.gender).toBe("male");
  });

  it("prefers a different accent for each speaker when available", () => {
    const map = assignSpeakerVoices(["Anna", "Sarah"], CHROME);
    expect(map.get("Anna")!.voice!.lang).not.toBe(map.get("Sarah")!.voice!.lang);
  });

  it("separates speakers by pitch when the device has only one voice", () => {
    const map = assignSpeakerVoices(["A", "B"], [voice("Some English Voice")]);
    const a = map.get("A")!;
    const b = map.get("B")!;
    expect(a.voice!.name).toBe(b.voice!.name);
    expect(a.pitch).not.toBe(b.pitch);
    expect(b.label).toMatch(/nada dibedakan/);
  });

  it("gives two same-gender speakers distinct pitch when only one voice of that gender exists", () => {
    const map = assignSpeakerVoices(["Rina", "Siti"], WINDOWS);
    const r = map.get("Rina")!;
    const s = map.get("Siti")!;
    expect(voiceGender(s.voice!)).toBe("female"); // reuses the female voice rather than a male one
    expect(r.voice!.name === s.voice!.name ? r.pitch !== s.pitch : true).toBe(true);
  });

  it("ignores non-English voices", () => {
    const map = assignSpeakerVoices(["A"], [voice("Microsoft Andika - Indonesian", "id-ID"), voice("Microsoft Zira", "en-US")]);
    expect(map.get("A")!.voice!.lang).toBe("en-US");
  });
});

describe("conversation balance", () => {
  it("gives an unknown speaker the opposite voice of a known one", () => {
    const map = assignSpeakerVoices(["Rafi", "Clara"], WINDOWS); // Rafi known male now; check balance with a truly unknown name too
    expect(map.get("Clara")!.gender).toBe("female");
    const m2 = assignSpeakerVoices(["Zorblax", "Ayu"], WINDOWS);
    expect(m2.get("Ayu")!.gender).toBe("female");
    expect(m2.get("Zorblax")!.gender).toBe("male");
  });

  it("recognises names used in Linguora dialogues", () => {
    for (const n of ["Marco", "Reza", "Tomi", "Ken", "Rafi", "Adi"]) expect(speakerGender(n)).toBe("male");
    expect(speakerGender("Priya")).toBe("female");
  });
});
