"use client"

import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { updateUserTeam } from "@/actions/admin-actions"

export function UserTeamSelect({
  userId,
  currentTeamId,
  teams,
}: {
  userId: string
  currentTeamId: string | null
  teams: { id: string; name: string }[]
}) {
  const router = useRouter()

  async function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const teamId = e.target.value === "" ? null : e.target.value
    const result = await updateUserTeam(userId, teamId)
    if (!result.ok) {
      toast.error(result.message ?? "Gagal mengubah tim")
      e.target.value = currentTeamId ?? ""
      return
    }
    toast.success("Tim sales diperbarui")
    router.refresh()
  }

  return (
    <select
      className="border-input bg-background h-9 rounded-md border px-2 text-sm"
      value={currentTeamId ?? ""}
      onChange={onChange}
    >
      <option value="">—</option>
      {teams.map((t) => (
        <option key={t.id} value={t.id}>
          {t.name}
        </option>
      ))}
    </select>
  )
}