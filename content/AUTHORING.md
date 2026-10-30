# Linguora Content Authoring Guide

All curriculum content lives in this folder as JSON and is loaded into the database by
`npm run db:seed`. The schema is defined in `src/lib/content/schema.ts` (Zod) — read it; it is
the source of truth. Validate with:

```bash
npx tsx scripts/validate-content.ts A1      # validate one level
npx tsx scripts/validate-content.ts         # validate everything + write manifest.json
```

## Files

| File | Content |
| --- | --- |
| `syllabus.json` | Levels, tracks and the 10 planned units per level (titles, grammar focus, slugs). Do not change unit slugs. |
| `curriculum/<level>/unit-NN.json` | One unit (`authoredUnitSchema`): 5 lessons + ≥5 unit-test questions. File name `unit-01.json` … `unit-10.json`. |
| `skills/<level>.json` | Skill-lab content (`skillsFileSchema`): grammar reference topics, reading passages, listening scripts, speaking prompts, writing prompts, vocabulary entries, level-exam questions, placement questions. |

## Pedagogy rules

1. **Follow the syllabus order.** A lesson may only use grammar taught in the same or an earlier
   unit/level. Never use a structure in an exercise before it has been taught (e.g. no present
   perfect in A1 unit 3 exercises). Vocabulary should be mostly within the level.
2. **Language policy** (see `explanationLanguage` in the syllabus):
   - A1: explanations ~90% Bahasa Indonesia; examples in English with Indonesian translation.
   - A2: ~75% Indonesian.
   - B1: ~50/50 Indonesian–English.
   - B2: mostly English with Indonesian notes.
   - C1–C2: English; vocabulary `meaning` still in Indonesian.
   - Question `explanation` follows the same policy.
3. **Accuracy first.** Every English sentence must be grammatically correct (except deliberate
   errors in `error_identification`, `sentence_correction`, and `mistakes[].wrong`). Every answer
   key must be unambiguous: for choice questions exactly one option is correct; for text answers
   list **all** reasonable accepted variants (contractions and full forms, e.g. `"I'm"` and
   `"I am"`).
4. **No placeholders**, no "Lorem ipsum", no "TODO", no repeated questions with tiny changes.
5. **CEFR is a reference**, not an official certification — never claim otherwise.
6. Real names/brands: use generic, fictional people and places (e.g. "Rina", "Mr. Adams",
   "Green Valley Café"). No real statistics presented as facts unless well established.

## Lesson structure (5 lessons per unit)

Each lesson contains the 12 required parts:

| Spec part | JSON field |
| --- | --- |
| 1. Learning objectives | `objectives` |
| 2. Concept explanation | `sections.explanation` (markdown, use `###` sub-headings, tables allowed) |
| 3. Usage examples | `sections.examples` (≥3, each with Indonesian `id` translation) |
| 4. Vocabulary list | `sections.vocabulary` (≥4; `meaning` in Indonesian; `ipa` like `/ˈhæpi/`) |
| 5. Grammar patterns | `sections.grammar` |
| 6. Common mistakes | `sections.mistakes` (≥2) |
| 7. Guided practice | questions with `stage: "guided"` (≥1, shown with hints + instant feedback) |
| 8. Independent practice | questions with `stage: "independent"` (≥1) |
| 9. Mini assessment | questions with `stage: "quiz"` (≥3) |
| 10. Summary | `sections.summary` |
| 11. Review cards | `sections.reviewCards` (≥3, used for spaced repetition) |
| 12. Completion criteria | `completionCriteria` (text, e.g. "Baca semua bagian dan raih skor minimal 70% pada mini quiz.") |

Recommended: **6 questions per lesson** (1 guided, 1–2 independent, 3–4 quiz), mixing at least
3 different question types per lesson. Across a unit use a wide variety of the 20 types.

## Question ids and slugs

- Lesson slug: `<level>-u<NN>-l<N>-<short-topic>`, e.g. `a1-u01-l1-greetings`.
- Question id: `<level>-u<NN>-l<N>-q<N>`, e.g. `a1-u01-l1-q1`; unit test: `a1-u01-t-q1`;
  exam: `a1-exam-q1`; placement: `a1-place-q1`; grammar exercise: `a1-gr-<topic>-q1`;
  reading: `a1-rd-<n>-q1`; listening: `a1-ls-<n>-q1`.
- All ids lowercase kebab-case and globally unique.

## Question type cheat-sheet

Every question has: `id, type, category, topic, difficulty (1–5), stage, prompt, explanation`
(+ optional `instructions, context, misconception, objectives, tags, points`).

| type | extra fields | notes |
| --- | --- | --- |
| `single_choice`, `contextual_vocabulary`, `reading_comprehension`, `listening_comprehension` | `options[]`, `answer` (index) | 3–4 options; plausible distractors |
| `dialogue_completion` | `dialogue[{speaker,text|null}]`, `options[]`, `answer` | exactly one line with `text: null` |
| `multiple_select` | `options[]`, `answers[]` (indexes) | not all options correct |
| `fill_blank` | `text` with `___` gaps, `answers[][]` (accepted variants per gap) | |
| `dropdown` | `text` with `___`, `choices[][]`, `answers[]` (index per gap) | |
| `drag_drop` | `text` with `___`, `bank[]`, `answers[]` (words from bank) | bank must contain distractors |
| `word_order` | `words[]` in **correct** order, optional `acceptedAnswers[]` | seed shuffles |
| `sentence_reconstruction` | `fragments[]` in **correct** order | longer chunks than word_order |
| `matching` | `pairs[{left,right}]` (3–6) | right side is shuffled |
| `error_identification` | `segments[]`, `errorIndex`, `correction` | exactly one wrong segment |
| `sentence_correction` | `sentence` (wrong), `answers[]` (corrected) | |
| `sentence_transformation` | `sentence`, `cue`, `answers[]` | |
| `translation` | `source`, `direction` (`id-en`/`en-id`), `answers[]` | list several valid translations |
| `short_answer` | `answers[]` | short (1–4 words) |
| `essay` | `minWords`, `maxWords`, `rubric` | manual/rubric graded; never in exam/placement |
| `dictation` | `text` | practice only (read via TTS) |
| `speaking_response` | `targetPhrases[]`, `sampleAnswer` | practice only |

`category` ∈ grammar, vocabulary, reading, listening, speaking, writing, pronunciation,
conversation, academic, business, mixed.

## Example lesson (abbreviated to one of each part)

```json
{
  "slug": "a1-u01-l1-greetings",
  "title": "Greetings and Goodbyes",
  "summary": "Menyapa dan berpamitan dalam situasi formal dan informal.",
  "estimatedMinutes": 15,
  "objectives": ["Menggunakan sapaan formal dan informal", "Menjawab pertanyaan How are you?"],
  "completionCriteria": "Baca semua bagian materi dan raih skor minimal 70% pada mini quiz.",
  "sections": {
    "explanation": "### Sapaan dalam bahasa Inggris\nDalam bahasa Inggris, kita memilih sapaan berdasarkan **waktu** dan **situasi** ...",
    "examples": [
      { "en": "Good morning, Mr. Adams.", "id": "Selamat pagi, Pak Adams.", "note": "Formal, sebelum pukul 12 siang." }
    ],
    "vocabulary": [
      { "word": "hello", "pos": "interjection", "ipa": "/həˈləʊ/", "meaning": "halo", "example": "Hello, I'm Rina." }
    ],
    "grammar": [{ "pattern": "Good + morning/afternoon/evening", "example": "Good evening, everyone.", "note": "Good night hanya untuk berpamitan." }],
    "mistakes": [{ "wrong": "Good night! Nice to meet you.", "right": "Good evening! Nice to meet you.", "why": "Good night dipakai saat berpisah/tidur, bukan untuk menyapa." }],
    "summary": "Gunakan **Hello/Hi** untuk situasi santai dan **Good morning/afternoon/evening** untuk situasi formal ...",
    "reviewCards": [{ "front": "Good night", "back": "Ucapan saat berpisah di malam hari / sebelum tidur" }]
  },
  "questions": [
    {
      "id": "a1-u01-l1-q1", "type": "single_choice", "category": "conversation", "topic": "greetings",
      "difficulty": 1, "stage": "guided",
      "prompt": "It is 8 a.m. You meet your teacher. What do you say?",
      "options": ["Good night!", "Good morning!", "Good evening!"], "answer": 1,
      "explanation": "Pukul 8 pagi → Good morning.", "misconception": "Good night bukan sapaan."
    },
    {
      "id": "a1-u01-l1-q2", "type": "fill_blank", "category": "grammar", "topic": "greetings",
      "difficulty": 1, "stage": "quiz",
      "prompt": "Complete the reply.", "text": "A: How are you? B: I'm ___, thank you.",
      "answers": [["fine", "good", "well"]],
      "explanation": "Jawaban umum untuk How are you? adalah I'm fine/good/well, thank you."
    }
  ]
}
```
