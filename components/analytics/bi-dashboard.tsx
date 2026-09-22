"use client"

import { useState, useTransition } from "react"
import {
  BiEstimatorResult,
  BiCustomerProfitabilityRow,
  BiTrainingProfitabilityRow,
  BiForecastingRow,
  getCostEstimator,
} from "@/actions/bi-actions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, Calculator, TrendingUp, Users, BookOpen, CheckCircle2 } from "lucide-react"

function formatRupiah(num: number): string {
  return "Rp " + Math.round(num).toLocaleString("id-ID")
}

type BiDashboardProps = {
  trainings: { id: string; name: string; code: string }[]
  initialEstimator: BiEstimatorResult | null
  customerProfitability: BiCustomerProfitabilityRow[]
  trainingProfitability: BiTrainingProfitabilityRow[]
  forecasting: BiForecastingRow[]
}

export function BiDashboard({
  trainings,
  initialEstimator,
  customerProfitability,
  trainingProfitability,
  forecasting,
}: BiDashboardProps) {
  const [activeTab, setActiveTab] = useState<"estimator" | "profitability" | "forecasting">("estimator")

  // Filter state for Estimator
  const [selectedTraining, setSelectedTraining] = useState<string>("")
  const [selectedEventType, setSelectedEventType] = useState<string>("")
  const [selectedDeliveryMode, setSelectedDeliveryMode] = useState<string>("")
  const [participantCount, setParticipantCount] = useState<number>(10)

  const [estimatorResult, setEstimatorResult] = useState<BiEstimatorResult | null>(initialEstimator)
  const [isPending, startTransition] = useTransition()

  const handleCalculate = () => {
    startTransition(async () => {
      const res = await getCostEstimator(
        selectedTraining || undefined,
        selectedEventType || undefined,
        selectedDeliveryMode || undefined,
        participantCount
      )
      if (res.ok && res.data) {
        setEstimatorResult(res.data)
      }
    })
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Top Header & Tabs */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Business Intelligence & Analytics</h1>
          <p className="text-sm text-slate-500">
            Phase 4: Cost Estimator, Benchmark, Analysis Profitabilitas & Financial Forecasting
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab("estimator")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition ${
              activeTab === "estimator"
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            <Calculator className="h-4 w-4" />
            <span>Cost Estimator</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("profitability")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition ${
              activeTab === "profitability"
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            <span>Profitability</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("forecasting")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition ${
              activeTab === "forecasting"
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            <BookOpen className="h-4 w-4" />
            <span>Forecasting & Tren</span>
          </button>
        </div>
      </div>

      {/* TAB 1: COST ESTIMATOR & BENCHMARK */}
      {activeTab === "estimator" && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Form Panel */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg">Parameter Estimasi</CardTitle>
              <CardDescription>
                Pilih kriteria event untuk menghitung estimasi biaya berdasarkan data historis.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Program Training
                </label>
                <select
                  value={selectedTraining}
                  onChange={(e) => setSelectedTraining(e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  <option value="">-- Semua Program --</option>
                  {trainings.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.code} — {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tipe Event
                </label>
                <select
                  value={selectedEventType}
                  onChange={(e) => setSelectedEventType(e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  <option value="">-- Semua Tipe --</option>
                  <option value="INHOUSE">Inhouse Training</option>
                  <option value="PUBLIC">Public Training</option>
                  <option value="PRIVATE">Private Training</option>
                  <option value="CUSTOM">Custom Training</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Mode Delivery
                </label>
                <select
                  value={selectedDeliveryMode}
                  onChange={(e) => setSelectedDeliveryMode(e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  <option value="">-- Semua Mode --</option>
                  <option value="OFFLINE">Offline</option>
                  <option value="ONLINE">Online</option>
                  <option value="HYBRID">Hybrid</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Estimasi Peserta
                </label>
                <input
                  type="number"
                  min={1}
                  value={participantCount}
                  onChange={(e) => setParticipantCount(Number(e.target.value))}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>

              <button
                type="button"
                onClick={handleCalculate}
                disabled={isPending}
                className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-blue-700 disabled:opacity-50"
              >
                {isPending ? "Menghitung..." : "Hitung Estimasi Biaya"}
              </button>
            </CardContent>
          </Card>

          {/* Right Results Panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* PRD §20 Data Quality Alert Card */}
            {estimatorResult && (
              <Card
                className={`border-l-4 ${
                  estimatorResult.has_enough_data
                    ? "border-l-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20"
                    : "border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20"
                }`}
              >
                <CardContent className="flex items-start gap-4 pt-6">
                  {estimatorResult.has_enough_data ? (
                    <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="h-6 w-6 text-amber-600 dark:text-amber-400 shrink-0" />
                  )}
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">
                      {estimatorResult.has_enough_data
                        ? "Estimasi Dapat Dipercaya"
                        : "Data Belum Cukup (PRD §20)"}
                    </h3>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      {estimatorResult.message}
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <Badge variant={estimatorResult.has_enough_data ? "default" : "secondary"}>
                        Sampel: {estimatorResult.sample_count} event historis
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Total Estimated Cost Banner */}
            {estimatorResult && estimatorResult.has_enough_data && (
              <Card className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg">
                <CardContent className="p-6">
                  <p className="text-xs font-semibold uppercase tracking-wider text-blue-100">
                    Estimasi Total HPP / Biaya Operational Event
                  </p>
                  <p className="mt-2 text-3xl font-extrabold tracking-tight">
                    {estimatorResult.estimated_total_cost == null
                      ? "—"
                      : formatRupiah(estimatorResult.estimated_total_cost)}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Benchmark Category Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Rincian Estimasi per Kategori Biaya</CardTitle>
                <CardDescription>
                  Berdasarkan rata-rata (AVG), minimum (MIN), dan maksimum (MAX) aktual event terdahulu.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!estimatorResult?.categories || estimatorResult.categories.length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-500">
                    Belum ada data historis expense untuk kombinasi filter ini.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Kode</TableHead>
                        <TableHead>Kategori Biaya</TableHead>
                        <TableHead className="text-right">Rata-rata (AVG)</TableHead>
                        <TableHead className="text-right">Min</TableHead>
                        <TableHead className="text-right">Max</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {estimatorResult.categories.map((c) => (
                        <TableRow key={c.cost_category_id}>
                          <TableCell className="font-mono text-xs">{c.category_code}</TableCell>
                          <TableCell className="font-medium">{c.category_name}</TableCell>
                          <TableCell className="text-right font-bold text-blue-600 dark:text-blue-400">
                            {formatRupiah(c.avg_amount)}
                          </TableCell>
                          <TableCell className="text-right text-slate-500">
                            {formatRupiah(c.min_amount)}
                          </TableCell>
                          <TableCell className="text-right text-slate-500">
                            {formatRupiah(c.max_amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: PROFITABILITY ANALYSIS */}
      {activeTab === "profitability" && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Customer Profitability */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-500" />
                <CardTitle className="text-base">Customer Profitability</CardTitle>
              </div>
              <CardDescription>Analisis pendapatan dan marjin profit per Customer.</CardDescription>
            </CardHeader>
            <CardContent>
              {customerProfitability.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">Belum ada data customer.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead className="text-center">Event</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Profit</TableHead>
                      <TableHead className="text-right">Margin</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customerProfitability.map((cp) => (
                      <TableRow key={cp.customer_id}>
                        <TableCell className="font-medium">{cp.customer_name}</TableCell>
                        <TableCell className="text-center">{cp.total_events}</TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {formatRupiah(cp.total_revenue)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-bold text-emerald-600">
                          {formatRupiah(cp.gross_profit)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant={
                              cp.margin_pct == null
                                ? "secondary"
                                : cp.margin_pct >= 40
                                ? "default"
                                : cp.margin_pct >= 15
                                ? "secondary"
                                : "destructive"
                            }
                          >
                            {cp.margin_pct == null ? "—" : `${cp.margin_pct}%`}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Training Profitability */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-indigo-500" />
                <CardTitle className="text-base">Training Program Profitability</CardTitle>
              </div>
              <CardDescription>Analisis kontribusi marjin per Program Training.</CardDescription>
            </CardHeader>
            <CardContent>
              {trainingProfitability.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">Belum ada data training.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Program</TableHead>
                      <TableHead className="text-center">Event</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Profit</TableHead>
                      <TableHead className="text-right">Margin</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trainingProfitability.map((tp) => (
                      <TableRow key={tp.training_id}>
                        <TableCell className="font-medium">
                          <span className="font-mono text-xs text-slate-400 mr-1.5">[{tp.training_code}]</span>
                          {tp.training_name}
                        </TableCell>
                        <TableCell className="text-center">{tp.total_events}</TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {formatRupiah(tp.total_revenue)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-bold text-emerald-600">
                          {formatRupiah(tp.gross_profit)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant={
                              tp.margin_pct == null
                                ? "secondary"
                                : tp.margin_pct >= 40
                                ? "default"
                                : tp.margin_pct >= 15
                                ? "secondary"
                                : "destructive"
                            }
                          >
                            {tp.margin_pct == null ? "—" : `${tp.margin_pct}%`}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 3: FORECASTING & TRENDS */}
      {activeTab === "forecasting" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tren Bulanan & Financial Forecasting</CardTitle>
            <CardDescription>Rekapitulasi bulanan Revenue, Biaya Ops, Gross Profit, dan Marjin.</CardDescription>
          </CardHeader>
          <CardContent>
            {forecasting.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">Belum ada data transaksi bulanan.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Periode Bulan</TableHead>
                    <TableHead className="text-center">Total Event</TableHead>
                    <TableHead className="text-right">Total Revenue</TableHead>
                    <TableHead className="text-right">Total Biaya Ops (Cost)</TableHead>
                    <TableHead className="text-right">Gross Profit</TableHead>
                    <TableHead className="text-right">Gross Margin %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {forecasting.map((fc) => (
                    <TableRow key={fc.month_period}>
                      <TableCell className="font-bold text-slate-900 dark:text-white">
                        {fc.month_period}
                      </TableCell>
                      <TableCell className="text-center">{fc.total_events}</TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {formatRupiah(fc.total_revenue)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-rose-600 dark:text-rose-400">
                        {formatRupiah(fc.total_cost)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        {formatRupiah(fc.gross_profit)}
                      </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant={fc.margin_pct == null ? "secondary" : fc.margin_pct >= 40 ? "default" : "secondary"}
                          >
                            {fc.margin_pct == null ? "—" : `${fc.margin_pct}%`}
                          </Badge>
                        </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
