import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth/session"
import {
  getCostEstimator,
  getCustomerProfitability,
  getTrainingProfitability,
  getFinancialForecasting,
} from "@/actions/bi-actions"
import { BiDashboard } from "@/components/analytics/bi-dashboard"

export default async function AnalyticsPage() {
  await requireAuth()

  const supabase = await createClient()

  // 5 independent reads in ONE round-trip batch — sequential awaits here
  // used to cost ~5x RTT on every visit to this menu.
  const [trainingsRes, estimatorRes, customerProfRes, trainingProfRes, forecastRes] =
    await Promise.all([
      supabase
        .from("trainings")
        .select("id, name, code")
        .is("deleted_at", null)
        .order("name"),
      // Initial estimator call (unfiltered)
      getCostEstimator(),
      getCustomerProfitability(),
      getTrainingProfitability(),
      getFinancialForecasting(),
    ])

  const { data: trainings } = trainingsRes

  return (
    <BiDashboard
      trainings={trainings || []}
      initialEstimator={estimatorRes.ok ? estimatorRes.data || null : null}
      customerProfitability={customerProfRes.ok ? customerProfRes.data || [] : []}
      trainingProfitability={trainingProfRes.ok ? trainingProfRes.data || [] : []}
      forecasting={forecastRes.ok ? forecastRes.data || [] : []}
    />
  )
}
