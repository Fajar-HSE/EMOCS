"use client"

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"

export type DonutSlice = { key: string; label: string; value: number; color: string }

export function StatusDonut({ data, total }: { data: DonutSlice[]; total: number }) {
  return (
    <div className="flex items-center gap-4">
      <div className="relative h-36 w-36 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="label" innerRadius="72%" outerRadius="100%" strokeWidth={2} stroke="#ffffff">
              {data.map((s) => (
                <Cell key={s.key} fill={s.color} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => [value, "Event"]} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl leading-none font-bold text-slate-800">{total}</span>
          <span className="mt-0.5 text-[10px] text-slate-400">Total Event</span>
        </div>
      </div>
      <div className="flex-1 space-y-2 text-xs">
        {data.map((s) => (
          <div key={s.key} className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="text-[11px] text-slate-600">{s.label}</span>
            </span>
            <span className="flex items-center gap-3">
              <span className="font-medium text-slate-700">{s.value}</span>
              <span className="w-7 text-right text-slate-400">
                {total > 0 ? `${Math.round((s.value / total) * 100)}%` : "0%"}
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
