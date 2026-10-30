import type { Metadata } from "next";
import { ResourcePage, type ResourceSearchParams } from "@/components/admin/resource-page";

export const metadata: Metadata = { title: "Admin · Unit" };

export default async function Page({ searchParams }: { searchParams: Promise<ResourceSearchParams> }) {
  return <ResourcePage resourceKey="units" sp={await searchParams} />;
}
