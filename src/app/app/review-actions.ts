"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertViewer } from "@/lib/auth";
import { rateLimit, runAction } from "@/lib/actions";
import { gradeReview } from "@/lib/learning/srs-server";

export async function gradeReviewAction(scheduleId: string, grade: "again" | "hard" | "good" | "easy") {
  return runAction(async () => {
    const viewer = await assertViewer();
    await rateLimit(`review:${viewer.id}`, 120, 60);
    const result = await gradeReview(viewer, z.uuid().parse(scheduleId), z.enum(["again", "hard", "good", "easy"]).parse(grade));
    revalidatePath("/app/review");
    return result;
  });
}
