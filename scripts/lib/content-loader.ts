import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import {
  authoredUnitSchema,
  skillsFileSchema,
  type AuthoredQuestion,
  type AuthoredUnit,
  type LevelCode,
  type SkillsFile,
  LEVEL_CODES,
} from "../../src/lib/content/schema";
import { syllabusSchema, type Syllabus } from "./syllabus-schema";

export const CONTENT_DIR = path.resolve(__dirname, "../../content");

export type LoadIssue = { file: string; message: string };

export type LoadedLevel = {
  level: LevelCode;
  units: AuthoredUnit[];
  skills: SkillsFile | null;
};

export type LoadResult = {
  syllabus: Syllabus;
  levels: LoadedLevel[];
  issues: LoadIssue[];
};

function readJson(file: string): unknown {
  return JSON.parse(readFileSync(file, "utf8"));
}

export function loadSyllabus(): Syllabus {
  return syllabusSchema.parse(readJson(path.join(CONTENT_DIR, "syllabus.json")));
}

export function loadContent(only?: LevelCode[]): LoadResult {
  const issues: LoadIssue[] = [];
  const syllabus = loadSyllabus();
  const levels: LoadedLevel[] = [];

  for (const level of LEVEL_CODES) {
    if (only && !only.includes(level)) continue;
    const unitDir = path.join(CONTENT_DIR, "curriculum", level.toLowerCase());
    const units: AuthoredUnit[] = [];
    if (existsSync(unitDir)) {
      for (const name of readdirSync(unitDir).filter((f) => f.endsWith(".json")).sort()) {
        const file = path.join(unitDir, name);
        try {
          const parsed = authoredUnitSchema.safeParse(readJson(file));
          if (parsed.success) units.push(parsed.data);
          else
            parsed.error.issues.forEach((i) =>
              issues.push({ file, message: `${i.path.join(".")}: ${i.message}` }),
            );
        } catch (error) {
          issues.push({ file, message: `invalid JSON: ${(error as Error).message}` });
        }
      }
    }

    let skills: SkillsFile | null = null;
    const skillsFile = path.join(CONTENT_DIR, "skills", `${level.toLowerCase()}.json`);
    if (existsSync(skillsFile)) {
      try {
        const parsed = skillsFileSchema.safeParse(readJson(skillsFile));
        if (parsed.success) skills = parsed.data;
        else
          parsed.error.issues.forEach((i) =>
            issues.push({ file: skillsFile, message: `${i.path.join(".")}: ${i.message}` }),
          );
      } catch (error) {
        issues.push({ file: skillsFile, message: `invalid JSON: ${(error as Error).message}` });
      }
    }
    units.sort((a, b) => a.number - b.number);
    levels.push({ level, units, skills });
  }

  return { syllabus, levels, issues };
}

/** Every authored question in a level, tagged with where it lives. */
export function collectQuestions(level: LoadedLevel) {
  const out: { question: AuthoredQuestion; unit?: AuthoredUnit; lessonSlug?: string; origin: string }[] = [];
  for (const unit of level.units) {
    for (const lesson of unit.lessons)
      for (const question of lesson.questions)
        out.push({ question, unit, lessonSlug: lesson.slug, origin: `lesson:${lesson.slug}` });
    for (const question of unit.unitTestQuestions) out.push({ question, unit, origin: `unit:${unit.slug}` });
  }
  if (level.skills) {
    for (const topic of level.skills.grammarTopics)
      for (const question of topic.exercises) out.push({ question, origin: `grammar:${topic.slug}` });
    for (const passage of level.skills.reading)
      for (const question of passage.questions) out.push({ question, origin: `reading:${passage.slug}` });
    for (const material of level.skills.listening)
      for (const question of material.questions) out.push({ question, origin: `listening:${material.slug}` });
    for (const question of level.skills.examQuestions) out.push({ question, origin: "exam" });
    for (const question of level.skills.placementQuestions) out.push({ question, origin: "placement" });
  }
  return out;
}

/** Normalised fingerprint used to detect duplicate questions. */
export function questionFingerprint(q: AuthoredQuestion): string {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const body: string[] = [q.type, norm(q.prompt), norm(q.context ?? "")];
  if ("options" in q) body.push(q.options.map(norm).join("|"));
  if ("text" in q) body.push(norm(q.text));
  if ("sentence" in q) body.push(norm(q.sentence));
  if ("source" in q) body.push(norm(q.source));
  if ("words" in q) body.push(norm(q.words.join(" ")));
  if ("fragments" in q) body.push(norm(q.fragments.join(" ")));
  if ("segments" in q) body.push(norm(q.segments.join(" ")));
  if ("pairs" in q) body.push(q.pairs.map((p) => norm(p.left + " " + p.right)).join("|"));
  if ("dialogue" in q) body.push(q.dialogue.map((l) => norm(l.text ?? "")).join("|"));
  return body.join("#");
}
