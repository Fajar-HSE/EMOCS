import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { groupMeta, groupOf, STATUS_GROUPS } from "./status-groups"

export type CalendarEvent = {
  id: string
  start_date: string | null
  end_date: string | null
  status: string
}

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
]

function shiftMonth(year: number, month1: number, delta: number) {
  const d = new Date(Date.UTC(year, month1 - 1 + delta, 1))
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1 }
}

export function EventCalendar({
  year,
  month,
  events,
}: {
  year: number
  month: number
  events: CalendarEvent[]
}) {
  const first = new Date(Date.UTC(year, month - 1, 1))
  // Senin = 0 ... Minggu = 6
  const leadBlanks = (first.getUTCDay() + 6) % 7
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const todayStr = new Date().toISOString().slice(0, 10)

  const dotsByDay = new Map<number, string[]>()
  for (const e of events) {
    if (!e.start_date) continue
    const s = Math.max(1, e.start_date.slice(0, 7) === `${year}-${String(month).padStart(2, "0")}` ? Number(e.start_date.slice(8, 10)) : 1)
    const eEnd = e.end_date ?? e.start_date
    const last = eEnd.slice(0, 7) === `${year}-${String(month).padStart(2, "0")}` ? Number(eEnd.slice(8, 10)) : daysInMonth
    const firstDay = e.start_date.slice(0, 7) < `${year}-${String(month).padStart(2, "0")}` ? 1 : s
    for (let d = firstDay; d <= Math.min(last, daysInMonth); d++) {
      const arr = dotsByDay.get(d) ?? []
      if (arr.length < 3 && !arr.includes(e.status)) arr.push(e.status)
      dotsByDay.set(d, arr)
    }
  }

  const prev = shiftMonth(year, month, -1)
  const next = shiftMonth(year, month, 1)
  const calParam = (y: number, m: number) => `?cal=${y}-${String(m).padStart(2, "0")}`

  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-xs font-semibold text-slate-800">
        <span>
          {MONTH_NAMES[month - 1]} {year}
        </span>
        <span className="flex items-center gap-1.5 text-slate-400">
          <Link href={calParam(prev.y, prev.m)} aria-label="Bulan sebelumnya" className="rounded p-1 transition hover:bg-slate-100 hover:text-slate-700">
            <ChevronLeft className="h-3.5 w-3.5" />
          </Link>
          <Link href={calParam(next.y, next.m)} aria-label="Bulan berikutnya" className="rounded p-1 transition hover:bg-slate-100 hover:text-slate-700">
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </span>
      </div>
      <div className="mb-2 grid grid-cols-7 text-center text-[10px] font-medium text-slate-400">
        {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-2 text-center text-xs font-medium text-slate-700">
        {Array.from({ length: leadBlanks }).map((_, i) => (
          <span key={`b${i}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1
          const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
          const dots = dotsByDay.get(day) ?? []
          const isToday = dateStr === todayStr
          return (
            <span key={day} className="relative flex flex-col items-center justify-center py-1">
              <span
                className={
                  isToday
                    ? "flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 font-semibold text-white shadow-sm"
                    : ""
                }
              >
                {day}
              </span>
              {dots.length > 0 && (
                <span className="absolute bottom-0 flex gap-0.5">
                  {dots.map((st) => (
                    <span
                      key={st}
                      className="h-1 w-1 rounded-full"
                      style={{ backgroundColor: groupMeta(groupOf(st)).color }}
                    />
                  ))}
                </span>
              )}
            </span>
          )
        })}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-y-1.5 border-t border-slate-100 pt-3 text-[10px] text-slate-500">
        {Object.values(STATUS_GROUPS).map((g) => (
          <span key={g.label} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: g.color }} />
            {g.label}
          </span>
        ))}
        <span className="col-span-2 flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "#059669" }} />
          Selesai
        </span>
      </div>
    </div>
  )
}
