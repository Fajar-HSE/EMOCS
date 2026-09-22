import type { LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "cn"

/**
 * Empty state standar (DESIGN.md §9.4): satu kalimat kondisi + satu CTA jelas.
 * Dipakai di semua layar daftar.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <Card className={cn("items-center text-center", className)} data-slot="empty-state">
      <CardContent className="flex flex-col items-center gap-3 px-6 py-12">
        {Icon ? (
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Icon className="h-6 w-6" />
          </span>
        ) : null}
        <div className="space-y-1.5">
          <p className="font-medium">{title}</p>
          {description ? (
            <p className="text-sm text-muted-foreground text-balance">{description}</p>
          ) : null}
        </div>
        {action ?? null}
      </CardContent>
    </Card>
  )
}
