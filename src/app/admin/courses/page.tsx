import type { Metadata } from "next";
import { ResourcePage, type ResourceSearchParams } from "@/components/admin/resource-page";
import { ViewTabs } from "@/components/admin/view-tabs";

export const metadata: Metadata = { title: "Admin · Course & Track" };

export default async function CoursesAdminPage({ searchParams }: { searchParams: Promise<ResourceSearchParams & { view?: string }> }) {
  const sp = await searchParams;
  const view = sp.view === "tracks" ? "tracks" : "courses";
  return (
    <div className="space-y-4">
      {!sp.edit && (
        <ViewTabs
          basePath="/admin/courses"
          current={view}
          views={[
            { key: "courses", label: "Course" },
            { key: "tracks", label: "Learning track" },
          ]}
        />
      )}
      <ResourcePage resourceKey={view} sp={sp} basePath="/admin/courses" />
    </div>
  );
}
