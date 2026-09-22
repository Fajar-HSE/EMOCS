"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { createTeam } from "@/actions/admin-actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function TeamsSection({
  teams,
}: {
  teams: (Pick<{ id: string; name: string }, "id" | "name"> & { member_count: number })[]
}) {
  const router = useRouter()
  const [name, setName] = useState("")

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const result = await createTeam({ name })
    if (!result.ok) {
      toast.error(result.message ?? "Gagal membuat tim")
      return
    }
    toast.success("Tim sales baru tersimpan")
    setName("")
    router.refresh()
  }

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold">Tim Sales</h2>
      {teams.length === 0 && <p className="text-muted-foreground mb-3 text-sm">Belum ada tim sales.</p>}
      {teams.length > 0 && (
        <ul className="mb-3 flex flex-col gap-1">
          {teams.map((t) => (
            <li key={t.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
              <span>{t.name}</span>
              <span className="text-muted-foreground text-xs">{t.member_count} anggota</span>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={onSubmit} className="flex max-w-md gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama tim baru, mis. Sales SKK" />
        <Button type="submit" disabled={name.trim().length < 2}>
          Tambah
        </Button>
      </form>
    </div>
  )
}