import type { Metadata } from "next";
import { ResourcePage, type ResourceSearchParams } from "@/components/admin/resource-page";
import { ViewTabs } from "@/components/admin/view-tabs";

export const metadata: Metadata = { title: "Admin · Achievements" };

export default async function AchievementsAdminPage({ searchParams }: { searchParams: Promise<ResourceSearchParams & { view?: string }> }) {
  const sp = await searchParams;
  const view = sp.view === "challenges" ? "challenges" : "achievements";
  return (
    <div className="space-y-4">
      {!sp.edit && (
        <ViewTabs
          basePath="/admin/achievements"
          current={view}
          views={[
            { key: "achievements", label: "Achievements" },
            { key: "challenges", label: "Quests & challenges" },
          ]}
        />
      )}
      <ResourcePage resourceKey={view} sp={sp} basePath="/admin/achievements" />
    </div>
  );
}
