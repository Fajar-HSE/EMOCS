"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

export type MonthPoint = { month: string; event: number; revenueJt: number }

export function SixMonthChart({ data }: { data: MonthPoint[] }) {
  return (
    <div className="h-44 w-full pt-2">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barCategoryGap="30%">
          <CartesianGrid stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
          <YAxis
            yAxisId="left"
            orientation="left"
            tick={{ fontSize: 9, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
            width={28}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 9, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
            width={32}
          />
          <Tooltip
            formatter={(value, name) => [
              name === "event" ? `${value} event` : `Rp ${Number(value).toLocaleString("id-ID")} jt`,
              name === "event" ? "Jumlah Event" : "Revenue (Juta)",
            ]}
          />
          <Bar yAxisId="left" dataKey="event" fill="#2563eb" radius={[3, 3, 0, 0]} maxBarSize={14} />
          <Bar yAxisId="right" dataKey="revenueJt" fill="#ec4899" radius={[3, 3, 0, 0]} maxBarSize={14} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
