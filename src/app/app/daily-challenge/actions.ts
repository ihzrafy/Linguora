"use server";

import { z } from "zod";
import { assertViewer } from "@/lib/auth";
import { rateLimit, runAction } from "@/lib/actions";
import { claimChallenge } from "@/lib/learning/challenges";

export async function claimChallengeAction(challengeId: string) {
  return runAction(async () => {
    const viewer = await assertViewer();
    await rateLimit(`claim:${viewer.id}`, 20, 60);
    return claimChallenge(viewer, z.uuid().parse(challengeId));
  });
}
