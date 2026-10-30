import { Skeleton } from "@/components/ui/skeleton";

export default function AppLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Memuat">
      <Skeleton className="h-9 w-64" />
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-36 rounded-xl md:col-span-2" />
        <Skeleton className="h-36 rounded-xl" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}
