import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function StatCard({
  label,
  value,
  href,
}: {
  label: string
  value: number | string
  href: string
}) {
  return (
    <Link href={href}>
      <Card className="transition-colors hover:bg-muted/50">
        <CardHeader className="pb-1">
          <CardTitle className="text-muted-foreground text-xs font-normal">{label}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold">{value}</p>
        </CardContent>
      </Card>
    </Link>
  )
}
