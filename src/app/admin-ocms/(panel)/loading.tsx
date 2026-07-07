import Skeleton from "@/components/admin/ui/Skeleton";

/** Catch-all panel loading skeleton (Pattern B). Shown instantly via Suspense
 *  on navigation to any panel route without its own loading.tsx. */
export default function PanelLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-40 w-full rounded-xl" />
    </div>
  );
}
