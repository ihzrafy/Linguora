/**
 * Validates authored content and writes the content manifest.
 *
 *   npx tsx scripts/validate-content.ts            # all levels, writes content/manifest.json
 *   npx tsx scripts/validate-content.ts A1 B2      # selected levels only (no manifest write)
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { LEVEL_CODES, type LevelCode, type AuthoredQuestion } from "../src/lib/content/schema";
import { CONTENT_DIR, collectQuestions, loadContent, questionFingerprint } from "./lib/content-loader";

const args = process.argv.slice(2).map((a) => a.toUpperCase());
const only = args.length ? (args.filter((a) => (LEVEL_CODES as readonly string[]).includes(a)) as LevelCode[]) : undefined;

const { syllabus, levels, issues } = loadContent(only);
const problems = [...issues.map((i) => `${path.relative(CONTENT_DIR, i.file)} → ${i.message}`)];
const warnings: string[] = [];

const ids = new Map<string, string>();
const fingerprints = new Map<string, string>();
const lessonSlugs = new Set<string>();
const passageSlugs = new Set<string>();

type Counter = Record<string, number>;
const bump = (c: Counter, k: string) => (c[k] = (c[k] ?? 0) + 1);

const manifest = {
  generatedAt: new Date().toISOString(),
  totals: { units: 0, lessons: 0, questions: 0, vocabulary: 0, grammarTopics: 0, reading: 0, listening: 0, speaking: 0, writing: 0 },
  targets: { levels: 6, units: 60, lessons: 300, questions: 600, questionsPerLevel: 100 },
  levels: [] as unknown[],
  gaps: [] as string[],
};

for (const level of levels) {
  const plan = syllabus.levels.find((l) => l.code === level.level)!;
  const byType: Counter = {};
  const byCategory: Counter = {};
  const byStage: Counter = {};
  const byTopic: Counter = {};

  // Units must follow the syllabus.
  for (const unit of level.units) {
    const planned = plan.units.find((u) => u.number === unit.number);
    if (!planned) problems.push(`${level.level}: unit ${unit.number} is not in the syllabus`);
    else if (planned.slug !== unit.slug) problems.push(`${level.level}: unit ${unit.number} slug must be "${planned.slug}"`);
    for (const lesson of unit.lessons) {
      if (lessonSlugs.has(lesson.slug)) problems.push(`duplicate lesson slug ${lesson.slug}`);
      lessonSlugs.add(lesson.slug);
      if (!lesson.slug.startsWith(unit.slug.split("-").slice(0, 2).join("-")))
        warnings.push(`${lesson.slug}: lesson slug should start with "${unit.slug.split("-").slice(0, 2).join("-")}"`);
    }
  }
  const missingUnits = plan.units.filter((u) => !level.units.some((x) => x.number === u.number));
  if (missingUnits.length) manifest.gaps.push(`${level.level}: missing units ${missingUnits.map((u) => u.number).join(", ")}`);
  if (!level.skills) manifest.gaps.push(`${level.level}: missing skills file (content/skills/${level.level.toLowerCase()}.json)`);

  if (level.skills) {
    for (const p of [...level.skills.reading, ...level.skills.listening]) {
      if (passageSlugs.has(p.slug)) problems.push(`duplicate passage/listening slug ${p.slug}`);
      passageSlugs.add(p.slug);
    }
    for (const q of level.skills.examQuestions) if (q.stage !== "exam") problems.push(`${q.id}: examQuestions must use stage "exam"`);
    for (const q of level.skills.placementQuestions)
      if (q.stage !== "placement") problems.push(`${q.id}: placementQuestions must use stage "placement"`);
    for (const t of level.skills.grammarTopics)
      for (const rel of t.relatedLessons)
        if (!level.units.some((u) => u.lessons.some((l) => l.slug === rel)))
          warnings.push(`${t.slug}: related lesson "${rel}" not found in ${level.level}`);
  }

  const questions = collectQuestions(level);
  for (const { question, origin } of questions) {
    const q = question as AuthoredQuestion;
    const prefix = level.level.toLowerCase() + "-";
    if (!q.id.startsWith(prefix)) problems.push(`${q.id}: question id must start with "${prefix}"`);
    if (ids.has(q.id)) problems.push(`duplicate question id ${q.id} (${origin} and ${ids.get(q.id)})`);
    ids.set(q.id, origin);
    const fp = questionFingerprint(q);
    if (fingerprints.has(fp)) problems.push(`duplicate question content ${q.id} ≈ ${fingerprints.get(fp)}`);
    fingerprints.set(fp, q.id);
    if (q.passageSlug && !level.skills?.reading.some((r) => r.slug === q.passageSlug))
      problems.push(`${q.id}: unknown passageSlug ${q.passageSlug}`);
    if (q.listeningSlug && !level.skills?.listening.some((r) => r.slug === q.listeningSlug))
      problems.push(`${q.id}: unknown listeningSlug ${q.listeningSlug}`);
    if (q.stage === "exam" || q.stage === "placement") {
      if (q.type === "essay" || q.type === "speaking_response" || q.type === "dictation")
        problems.push(`${q.id}: ${q.type} cannot be auto-graded and is not allowed in exams/placement`);
    }
    bump(byType, q.type);
    bump(byCategory, q.category);
    bump(byStage, q.stage);
    bump(byTopic, q.topic);
  }

  const lessonCount = level.units.reduce((n, u) => n + u.lessons.length, 0);
  if (questions.length < 100) manifest.gaps.push(`${level.level}: only ${questions.length}/100 questions`);
  if (lessonCount < 50) manifest.gaps.push(`${level.level}: only ${lessonCount}/50 lessons authored`);

  manifest.totals.units += level.units.length;
  manifest.totals.lessons += lessonCount;
  manifest.totals.questions += questions.length;
  manifest.totals.vocabulary += level.skills?.vocabulary.length ?? 0;
  manifest.totals.grammarTopics += level.skills?.grammarTopics.length ?? 0;
  manifest.totals.reading += level.skills?.reading.length ?? 0;
  manifest.totals.listening += level.skills?.listening.length ?? 0;
  manifest.totals.speaking += level.skills?.speaking.length ?? 0;
  manifest.totals.writing += level.skills?.writing.length ?? 0;

  manifest.levels.push({
    level: level.level,
    units: level.units.length,
    lessons: lessonCount,
    questions: questions.length,
    byType,
    byCategory,
    byStage,
    topics: Object.keys(byTopic).length,
    skills: level.skills
      ? {
          vocabulary: level.skills.vocabulary.length,
          grammarTopics: level.skills.grammarTopics.length,
          reading: level.skills.reading.length,
          listening: level.skills.listening.length,
          speaking: level.skills.speaking.length,
          writing: level.skills.writing.length,
          examQuestions: level.skills.examQuestions.length,
          placementQuestions: level.skills.placementQuestions.length,
        }
      : null,
    validation: problems.length ? "has-errors" : "valid",
  });

  console.log(
    `${level.level}: ${level.units.length} units, ${lessonCount} lessons, ${questions.length} questions` +
      (level.skills ? `, ${level.skills.vocabulary.length} vocab, ${level.skills.grammarTopics.length} grammar topics` : ", no skills file"),
  );
}

for (const w of warnings) console.warn(`warning: ${w}`);
if (problems.length) {
  console.error(`\n${problems.length} problem(s):`);
  for (const p of problems.slice(0, 200)) console.error(`  ✗ ${p}`);
  process.exit(1);
}

if (!only) {
  writeFileSync(path.join(CONTENT_DIR, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  console.log(`\nManifest written. Totals: ${JSON.stringify(manifest.totals)}`);
  if (manifest.gaps.length) console.log(`Gaps:\n  - ${manifest.gaps.join("\n  - ")}`);
}
console.log("\n✓ content valid");
