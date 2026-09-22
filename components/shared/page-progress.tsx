import { Progress } from "@/components/ui/progress"
import { cn } from "cn"
import { formatProgress } from "@/lib/utils/format"

/**
 * Progress event: bar + angka (DESIGN.md §5.2). Traffic-light sederhana —
 * progress < 30% memakai amber sebagai sinyal perlu perhatian.
 */
export function PageProgress({
  value,
  className,
  showLabel = true,
}: {
  value: number | null | undefined
  className?: string
  showLabel?: boolean
}) {
  const v = formatProgress(value)
  const warn = v < 30

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <Progress
        value={v}
        aria-label="Progress event"
        className={cn("flex-1", warn && "[&_[data-slot=progress-indicator]]:bg-amber-500")}
      />
      {showLabel ? (
        <span className="w-9 text-right font-medium tabular-nums text-xs text-muted-foreground">
          {v}%
        </span>
      ) : null}
    </div>
  )
}
