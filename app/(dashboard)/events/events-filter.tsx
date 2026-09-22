"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { SearchIcon } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { STATUS_OPTIONS } from "./status-options"

/**
 * Filter daftar event: pencarian (debounce), status (Select), dan toggle
 * "Milik Saya". Semua sinkron ke URL (?q=&status=&mine=) agar dapat di-
 * bookmark/dibagikan dan di-resume oleh server.
 */
export function EventsFilter({ canFilterMine }: { canFilterMine: boolean }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const currentQ = searchParams.get("q") ?? ""
  const currentStatus = searchParams.get("status") ?? "ACTIVE"
  const onlyMine = searchParams.get("mine") === "1"

  const [q, setQ] = useState(currentQ)
  const lastSeenQ = useRef(currentQ)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (lastSeenQ.current !== currentQ) {
      lastSeenQ.current = currentQ
      setQ(currentQ)
    }
  }, [currentQ])

  function push(next: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(next)) {
      if (value === null || value === "") params.delete(key)
      else params.set(key, value)
    }
    params.delete("page") // reset halaman saat filter berubah
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  function handleSearchChange(value: string) {
    setQ(value)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => push({ q: value.trim() || null }), 400)
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative w-full max-w-xs">
        <SearchIcon className="absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Cari nama event..."
          className="pl-8"
        />
      </div>

      <Select
        value={currentStatus}
        onValueChange={(value) => push({ status: value === "ACTIVE" ? null : value })}
        items={STATUS_OPTIONS}
      >
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {canFilterMine ? (
        <Button
          type="button"
          variant={onlyMine ? "default" : "outline"}
          onClick={() => push({ mine: onlyMine ? null : "1" })}
        >
          Milik Saya
        </Button>
      ) : null}
    </div>
  )
}