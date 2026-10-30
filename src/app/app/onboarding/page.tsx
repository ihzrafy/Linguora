import type { Metadata } from "next";
import { requireViewer } from "@/lib/auth";
import { OnboardingWizard } from "./onboarding-wizard";

export const metadata: Metadata = { title: "Onboarding" };

export default async function OnboardingPage() {
  const viewer = await requireViewer("/app/onboarding");
  return <OnboardingWizard name={viewer.profile.display_name.split(" ")[0]} />;
}
