import Skeleton from "@/components/admin/ui/Skeleton";

export default function PlayerDetailLoading() {
  return (
    <div className="space-y-6 max-w-3xl">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-32 w-full rounded-xl" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}
