import { z } from "zod";
import { levelCodeSchema } from "../../src/lib/content/schema";

const slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/);

export const syllabusSchema = z.object({
  tracks: z
    .array(
      z.object({
        slug,
        name: z.string(),
        description: z.string(),
        goals: z.array(z.string()).min(2),
        icon: z.string(),
      }),
    )
    .min(4),
  levels: z
    .array(
      z.object({
        code: levelCodeSchema,
        name: z.string(),
        nameId: z.string(),
        description: z.string(),
        objectives: z.array(z.string()).min(3),
        /** Language policy for explanations at this level. */
        explanationLanguage: z.string(),
        units: z
          .array(
            z.object({
              number: z.number().int(),
              slug,
              title: z.string(),
              grammar: z.array(z.string()).min(1),
              vocabulary: z.string(),
              skills: z.string(),
            }),
          )
          .length(10),
      }),
    )
    .length(6),
});
export type Syllabus = z.infer<typeof syllabusSchema>;
