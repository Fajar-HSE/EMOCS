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

  // Fetch training master data for filter
  const { data: trainings } = await supabase
    .from("trainings")
    .select("id, name, code")
    .is("deleted_at", null)
    .order("name")

  // Initial estimator call (unfiltered)
  const estimatorRes = await getCostEstimator()
  const customerProfRes = await getCustomerProfitability()
  const trainingProfRes = await getTrainingProfitability()
  const forecastRes = await getFinancialForecasting()

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
