"use client";

import { useState } from "react";
import { Copy, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

const MAX = 10 * 1024 * 1024;

/** Uploads a file to the public `media` bucket (storage policies require content.write). */
export function MediaUpload({ accept, folder, title, description }: { accept: string; folder: string; title: string; description: string }) {
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const upload = async (file: File) => {
    if (!accept.split(",").includes(file.type)) return void toast.error("Tipe berkas tidak diizinkan.");
    if (file.size > MAX) return void toast.error("Ukuran maksimal 10 MB.");
    setBusy(true);
    const safe = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-").slice(-80);
    const path = `${folder}/${Date.now()}-${safe}`;
    const supabase = createClient();
    const { error } = await supabase.storage.from("media").upload(path, file, { contentType: file.type });
    setBusy(false);
    if (error) return void toast.error(`Unggah gagal: ${error.message}`);
    setUrl(supabase.storage.from("media").getPublicUrl(path).data.publicUrl);
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-muted">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />} Pilih berkas
          <input type="file" accept={accept} className="sr-only" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        </label>
        {url && (
          <div className="flex gap-2">
            <Input readOnly value={url} aria-label="URL berkas" />
            <Button type="button" variant="outline" onClick={() => (navigator.clipboard.writeText(url), toast.success("URL disalin"))}>
              <Copy /> Salin
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
