import Skeleton from "@/components/admin/ui/Skeleton";

export default function PlayersLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-20 w-full rounded-xl max-md:h-64" />
      <div
        className="rounded-xl overflow-hidden"
        style={{
          backgroundColor: "#171717",
          border: "1px solid rgba(208,135,0,0.2)",
        }}
      >
        {/* Card shape (below md) — matches the loaded list so nothing shifts. */}
        <div
          className="flex items-center gap-2 px-4 py-2 md:hidden"
          style={{ borderBottom: "1px solid rgba(208,135,0,0.15)" }}
        >
          <Skeleton className="h-3 w-8" />
          <Skeleton className="h-11 flex-1 rounded-lg" />
        </div>
        <div className="p-4 space-y-2 md:hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-lg px-4 py-3"
              style={{
                backgroundColor: "#0a0a0a",
                border: "1px solid rgba(208,135,0,0.15)",
              }}
            >
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="mt-3 h-3 w-full" />
              <Skeleton className="mt-2 h-3 w-2/3" />
            </div>
          ))}
        </div>

        <div className="max-md:hidden">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between px-4 py-3.5"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
            >
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
