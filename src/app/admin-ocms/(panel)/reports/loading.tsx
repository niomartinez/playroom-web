import Skeleton from "@/components/admin/ui/Skeleton";

export default function ReportsLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-40" />
      {/* The controls stack below md, so the placeholder grows with them. */}
      <Skeleton className="h-20 w-full rounded-xl max-md:h-80" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-72 w-full rounded-xl max-md:h-96" />
    </div>
  );
}
