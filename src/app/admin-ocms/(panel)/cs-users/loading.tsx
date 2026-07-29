import Skeleton from "@/components/admin/ui/Skeleton";

export default function CsUsersLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 max-md:flex-wrap">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-9 w-40 rounded-lg max-md:h-11 max-md:w-full" />
      </div>
      <div
        className="rounded-xl overflow-hidden"
        style={{
          backgroundColor: "#171717",
          border: "1px solid rgba(208,135,0,0.2)",
        }}
      >
        {/* Search bar, which DataTable always renders. */}
        <div
          className="px-4 py-3 md:hidden"
          style={{ borderBottom: "1px solid rgba(208,135,0,0.1)" }}
        >
          <Skeleton className="h-11 w-full rounded-lg" />
        </div>

        {/* Card shape (below md) — matches DataTable's card mode. */}
        <div className="px-4 py-4 space-y-2 md:hidden">
          {Array.from({ length: 4 }).map((_, i) => (
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
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between px-4 py-3.5"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
            >
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
