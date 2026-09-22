"use server"

import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth/session"

export type BiBenchmarkRow = {
  cost_category_id: string
  category_name: string
  category_code: string
  sample_count: number
  avg_amount: number
  min_amount: number
  max_amount: number
  total_amount: number
}

export type BiEstimatorResult = {
  has_enough_data: boolean
  message: string
  sample_count: number
  estimated_total_cost: number | null
  categories: {
    cost_category_id: string
    category_name: string
    category_code: string
    sample_count: number
    avg_amount: number
    min_amount: number
    max_amount: number
  }[]
}

export type BiCustomerProfitabilityRow = {
  customer_id: string
  customer_name: string
  total_events: number
  total_revenue: number
  total_cost: number
  gross_profit: number
  margin_pct: number | null
}

export type BiTrainingProfitabilityRow = {
  training_id: string
  training_name: string
  training_code: string
  total_events: number
  total_revenue: number
  total_cost: number
  gross_profit: number
  margin_pct: number | null
}

export type BiForecastingRow = {
  month_period: string
  total_events: number
  total_revenue: number
  total_cost: number
  gross_profit: number
  margin_pct: number | null
}

export async function getCostBenchmark(
  trainingId?: string,
  eventType?: string,
  deliveryMode?: string
): Promise<{ ok: boolean; data?: BiBenchmarkRow[]; message?: string }> {
  await requireAuth()
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("get_cost_benchmark", {
    p_training_id: trainingId || undefined,
    p_event_type: eventType || undefined,
    p_delivery_mode: deliveryMode || undefined,
  })

  if (error) {
    return { ok: false, message: error.message }
  }
  return { ok: true, data: (data as BiBenchmarkRow[]) || [] }
}

export async function getCostEstimator(
  trainingId?: string,
  eventType?: string,
  deliveryMode?: string,
  participantCount: number = 10
): Promise<{ ok: boolean; data?: BiEstimatorResult; message?: string }> {
  await requireAuth()
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("get_cost_estimator", {
    p_training_id: trainingId || undefined,
    p_event_type: eventType || undefined,
    p_delivery_mode: deliveryMode || undefined,
    p_participant_count: participantCount,
  })

  if (error) {
    return { ok: false, message: error.message }
  }
  return { ok: true, data: (data as unknown as BiEstimatorResult) || undefined }
}

export async function getCustomerProfitability(): Promise<{
  ok: boolean
  data?: BiCustomerProfitabilityRow[]
  message?: string
}> {
  await requireAuth()
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("get_customer_profitability")

  if (error) {
    return { ok: false, message: error.message }
  }
  return { ok: true, data: (data as BiCustomerProfitabilityRow[]) || [] }
}

export async function getTrainingProfitability(): Promise<{
  ok: boolean
  data?: BiTrainingProfitabilityRow[]
  message?: string
}> {
  await requireAuth()
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("get_training_profitability")

  if (error) {
    return { ok: false, message: error.message }
  }
  return { ok: true, data: (data as BiTrainingProfitabilityRow[]) || [] }
}

export async function getFinancialForecasting(): Promise<{
  ok: boolean
  data?: BiForecastingRow[]
  message?: string
}> {
  await requireAuth()
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("get_financial_forecasting")

  if (error) {
    return { ok: false, message: error.message }
  }
  return { ok: true, data: (data as BiForecastingRow[]) || [] }
}
