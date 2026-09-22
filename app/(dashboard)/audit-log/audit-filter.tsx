"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function AuditFilter({ tableOptions }: { tableOptions: { key: string; label: string }[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const table = searchParams.get("table") ?? "ALL"
  const q = searchParams.get("q") ?? ""

  function push(next: { table?: string; q?: string }) {
    const params = new URLSearchParams()
    if (next.table && next.table !== "ALL") params.set("table", next.table)
    if (next.q) params.set("q", next.q)
    const qs = params.toString()
    router.push(qs ? `/audit-log?${qs}` : "/audit-log")
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <Select
        value={table}
        onValueChange={(v) => push({ table: v as string, q })}
        items={[{ value: "ALL", label: "Semua tabel" }, ...tableOptions.map((t) => ({ value: t.key, label: t.label }))]}
      >
        <SelectTrigger className="w-full sm:w-56">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Semua tabel</SelectItem>
          {tableOptions.map((t) => (
            <SelectItem key={t.key} value={t.key}>
              {t.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="relative w-full sm:max-w-xs">
        <Search className="text-muted-foreground absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2" />
        <Input
          className="pl-8"
          placeholder="Cari aktor atau aksi..."
          defaultValue={q}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              push({ table, q: (e.target as HTMLInputElement).value })
            }
          }}
        />
      </div>
    </div>
  )
}