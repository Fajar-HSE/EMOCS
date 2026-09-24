import { Skeleton } from "@/components/ui/skeleton"

export default function MasterLoading() {
  return (
    <div className="flex flex-col gap-4 p-6">
      <Skeleton className="h-7 w-36" />
      <div className="flex gap-4 border-b pb-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-5 w-20" />
        ))}
      </div>
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    </div>
  )
}
