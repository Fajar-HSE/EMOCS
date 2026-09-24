import { Skeleton } from "@/components/ui/skeleton"

export default function AuditLogLoading() {
  return (
    <div className="flex flex-col gap-4 p-6">
      <Skeleton className="h-7 w-44" />
      <Skeleton className="h-9 w-full max-w-xs" />
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    </div>
  )
}
