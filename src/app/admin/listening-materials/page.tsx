import type { Metadata } from "next";
import { MediaUpload } from "@/components/admin/media-upload";
import { ResourcePage, type ResourceSearchParams } from "@/components/admin/resource-page";
import { requirePermission } from "@/lib/auth";

export const metadata: Metadata = { title: "Admin · Listening" };

export default async function ListeningAdminPage({ searchParams }: { searchParams: Promise<ResourceSearchParams> }) {
  const sp = await searchParams;
  const viewer = await requirePermission("content.read", "/admin/listening-materials");
  return (
    <div className="space-y-6">
      <ResourcePage resourceKey="listening" sp={sp} />
      {viewer.permissions.has("content.write") && (
        <MediaUpload
          accept="audio/mpeg,audio/mp4,audio/ogg,audio/wav,audio/webm"
          folder="listening"
          title="Unggah audio berlisensi"
          description="Unggah file audio yang kamu miliki haknya (maks. 10 MB), lalu tempel URL-nya ke kolom URL audio dan ubah sumber audio menjadi “File audio”."
        />
      )}
    </div>
  );
}
