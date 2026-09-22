-- 0039_phase4_bi_fix.sql
-- Phase 4 BI: perbaikan 3 cacat yang ditemukan LOGIC_TEST_REPORT.md (BR-FIN-11,
-- PRD §19/§20, BR-FIN-7/10/16). Perilaku yang dikoreksi:
--   1) get_cost_estimator: ketika data historis < 3 sampel (has_enough_data=false),
--      breakdown rincian TIDAK BOLEH menimpa total dengan SUM benchmark dan total
--      harus bernilai NULL (bukan 0) — bukan estimasi yang dapat dipercaya.
--   2) Pengakuan pendapatan (revenue) di get_training_profitability kini dijaga
--      status yang sama dengan get_customer_profitability & get_financial_forecasting:
--      hanya event yang telah mencapai COMPLETED (atau status lanjutan yang sudah
--      membekukan revenue_recognized_amount) yang menyumbang revenue. Event SUBMITTED/
--      APPROVED/APPROVED_TO_CLOSED dsb tidak lagi menaikkan revenue aktual.
--   3) Margin (margin_pct) pada ketiga fungsi mengembalikan NULL (bukan 0) ketika
--      revenue = 0 (harus tidak didefinisikan, bukan 0%).
-- Fungsi dibuat additive (CREATE OR REPLACE) — TIDAK mengubah skema, GRANT, atau
-- fungsi lain. Aman didorong ke Cloud.

-- =====================================================================
-- 1. get_cost_estimator — estimator tidak boleh "memakai" nilai benchmark
--    ketika data tidak cukup. Total estimasi dibiarkan NULL pada has_enough_data=false.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.get_cost_estimator(
  p_training_id uuid DEFAULT NULL,
  p_event_type text DEFAULT NULL,
  p_delivery_mode text DEFAULT NULL,
  p_participant_count integer DEFAULT 10
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_type public.event_type;
  v_delivery_mode public.delivery_mode;
  v_sample_count bigint := 0;
  v_has_enough boolean := false;
  v_msg text;
  v_categories jsonb := '[]'::jsonb;
  v_est_total numeric;
  v_empty jsonb := '[]'::jsonb;
BEGIN
  IF NOT public.can_view_bi_analytics() THEN
    RAISE EXCEPTION 'UNAUTHORIZED_BI_ACCESS';
  END IF;

  IF p_event_type IS NOT NULL THEN
    v_event_type := p_event_type::public.event_type;
  END IF;
  IF p_delivery_mode IS NOT NULL THEN
    v_delivery_mode := p_delivery_mode::public.delivery_mode;
  END IF;

  -- Total sampel event historis pembanding
  SELECT COUNT(e.id)
  INTO v_sample_count
  FROM events e
  WHERE e.deleted_at IS NULL
    AND e.status IN ('COMPLETED', 'POST_EVENT', 'FINANCIAL_CLOSING', 'CLOSED')
    AND (p_training_id IS NULL OR e.training_id = p_training_id)
    AND (p_event_type IS NULL OR e.event_type = v_event_type)
    AND (p_delivery_mode IS NULL OR e.delivery_mode = v_delivery_mode);

  v_has_enough := (v_sample_count >= 3);

  IF v_has_enough THEN
    v_msg := 'Estimasi biaya dihitung dari ' || v_sample_count || ' event historis pembanding.';

    -- Rincian per kategori + total estimasi — HANYA saat data cukup.
    WITH benchmark AS (
      SELECT * FROM public.get_cost_benchmark(p_training_id, p_event_type, p_delivery_mode)
    )
    SELECT
      COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'cost_category_id', b.cost_category_id,
            'category_name', b.category_name,
            'category_code', b.category_code,
            'sample_count', b.sample_count,
            'avg_amount', b.avg_amount,
            'min_amount', b.min_amount,
            'max_amount', b.max_amount
          )
        ),
        v_empty
      ),
      SUM(b.avg_amount)
    INTO v_categories, v_est_total
    FROM benchmark b
    WHERE b.sample_count > 0;

    -- Total fallback: bila tidak ada kategori dengan sampel > 0, sumbenchmark = NULL
    v_est_total := COALESCE(v_est_total, 0);
  ELSE
    -- Tidak cukup data → pertahankan v_categories '[]' & v_est_total NULL.
    -- PENTING: breakdown TIDAK dihitung, agar tidak menimpa total dengan SUM benchmark.
    v_msg := 'Data historis belum cukup (minimal 3 event pembanding) untuk estimasi yang dapat dipercaya.';
    v_categories := '[]'::jsonb;
  END IF;

  RETURN jsonb_build_object(
    'has_enough_data', v_has_enough,
    'message', v_msg,
    'sample_count', v_sample_count,
    'estimated_total_cost', v_est_total,
    'categories', v_categories
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_cost_estimator(uuid, text, text, integer) TO authenticated;

-- =====================================================================
-- 2. get_training_profitability — revenue hanya dari event yang SUDAH
--    merealisasikan revenue (COMPLETED / POST_EVENT / FINANCIAL_CLOSING / CLOSED),
--    sama dengan get_customer_profitability & get_financial_forecasting.
--    Margin = NULL saat revenue 0 (bukan 0%).
-- =====================================================================
CREATE OR REPLACE FUNCTION public.get_training_profitability(
  p_training_id uuid DEFAULT NULL,
  p_event_type text DEFAULT NULL,
  p_delivery_mode text DEFAULT NULL
)
RETURNS TABLE (
  training_id uuid,
  training_name text,
  training_code text,
  total_events bigint,
  total_revenue numeric,
  total_cost numeric,
  gross_profit numeric,
  margin_pct numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_type public.event_type;
  v_delivery_mode public.delivery_mode;
BEGIN
  IF NOT public.can_view_bi_analytics() THEN
    RAISE EXCEPTION 'UNAUTHORIZED_BI_ACCESS';
  END IF;

  IF p_event_type IS NOT NULL THEN
    v_event_type := p_event_type::public.event_type;
  END IF;
  IF p_delivery_mode IS NOT NULL THEN
    v_delivery_mode := p_delivery_mode::public.delivery_mode;
  END IF;

  RETURN QUERY
  WITH event_costs AS (
    SELECT
      e.id AS event_id,
      e.training_id,
      CASE
        WHEN e.status IN ('COMPLETED', 'POST_EVENT', 'FINANCIAL_CLOSING', 'CLOSED')
          THEN COALESCE(e.revenue_recognized_amount, e.sales_value)
        ELSE 0
      END AS revenue,
      COALESCE(e.revenue_recognized_amount, e.sales_value) AS revenue_raw,
      CASE
        WHEN e.status IN ('COMPLETED', 'POST_EVENT', 'FINANCIAL_CLOSING', 'CLOSED') THEN 1
        ELSE 0
      END AS is_recognized,
      COALESCE(SUM(ex.amount), 0) AS cost
    FROM events e
    LEFT JOIN expenses ex
      ON ex.event_id = e.id AND ex.deleted_at IS NULL AND ex.status IN ('APPROVED', 'PAID')
    WHERE e.deleted_at IS NULL
      AND e.status NOT IN ('DRAFT', 'CANCELLED')
      AND (p_training_id IS NULL OR e.training_id = p_training_id)
      AND (p_event_type IS NULL OR e.event_type = v_event_type)
      AND (p_delivery_mode IS NULL OR e.delivery_mode = v_delivery_mode)
    GROUP BY e.id, e.training_id, e.status, e.revenue_recognized_amount, e.sales_value
  )
  SELECT
    t.id AS training_id,
    t.name AS training_name,
    t.code AS training_code,
    COUNT(ec.event_id)::bigint AS total_events,
    COALESCE(SUM(ec.revenue), 0) AS total_revenue,
    COALESCE(SUM(ec.cost), 0) AS total_cost,
    COALESCE(SUM(ec.revenue) - SUM(ec.cost), 0) AS gross_profit,
    CASE
      WHEN SUM(ec.revenue) > 0 THEN ROUND((SUM(ec.revenue) - SUM(ec.cost)) * 100.0 / SUM(ec.revenue), 2)
      ELSE NULL
    END AS margin_pct
  FROM trainings t
  LEFT JOIN event_costs ec ON t.id = ec.training_id
  WHERE t.deleted_at IS NULL
  GROUP BY t.id, t.name, t.code
  HAVING COUNT(ec.event_id) > 0
  ORDER BY total_revenue DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_training_profitability(uuid, text, text) TO authenticated;

-- =====================================================================
-- 3. get_customer_profitability — revenue recognition di samakan dengan
--    training/forecasting (COMPLETED dan status lanjutan), margin NULL utk revenue 0.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.get_customer_profitability()
RETURNS TABLE (
  customer_id uuid,
  customer_name text,
  total_events bigint,
  total_revenue numeric,
  total_cost numeric,
  gross_profit numeric,
  margin_pct numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.can_view_bi_analytics() THEN
    RAISE EXCEPTION 'UNAUTHORIZED_BI_ACCESS';
  END IF;

  RETURN QUERY
  WITH customer_events AS (
    SELECT
      e.customer_id,
      CASE
        WHEN e.status IN ('COMPLETED', 'POST_EVENT', 'FINANCIAL_CLOSING', 'CLOSED')
          THEN COALESCE(e.revenue_recognized_amount, e.sales_value)
        ELSE 0
      END AS revenue,
      COALESCE(SUM(ex.amount), 0) AS cost
    FROM events e
    LEFT JOIN expenses ex
      ON ex.event_id = e.id AND ex.deleted_at IS NULL AND ex.status IN ('APPROVED', 'PAID')
    WHERE e.deleted_at IS NULL
      AND e.status NOT IN ('DRAFT', 'CANCELLED')
    GROUP BY e.customer_id, e.id, e.status, e.revenue_recognized_amount, e.sales_value
  )
  SELECT
    c.id AS customer_id,
    c.name AS customer_name,
    COUNT(ce.customer_id)::bigint AS total_events,
    COALESCE(SUM(ce.revenue), 0) AS total_revenue,
    COALESCE(SUM(ce.cost), 0) AS total_cost,
    COALESCE(SUM(ce.revenue) - SUM(ce.cost), 0) AS gross_profit,
    CASE
      WHEN SUM(ce.revenue) > 0 THEN ROUND((SUM(ce.revenue) - SUM(ce.cost)) * 100.0 / SUM(ce.revenue), 2)
      ELSE NULL
    END AS margin_pct
  FROM customers c
  JOIN customer_events ce ON c.id = ce.customer_id
  WHERE c.deleted_at IS NULL
  GROUP BY c.id, c.name
  ORDER BY total_revenue DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_customer_profitability() TO authenticated;

-- =====================================================================
-- 4. get_financial_forecasting — revenue recognition disamakan (COMPLETED +
--    status lanjutan), margin NULL utk revenue 0.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.get_financial_forecasting(
  p_event_type text DEFAULT NULL,
  p_delivery_mode text DEFAULT NULL
)
RETURNS TABLE (
  month_period text,
  total_events bigint,
  total_revenue numeric,
  total_cost numeric,
  gross_profit numeric,
  margin_pct numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_type public.event_type;
  v_delivery_mode public.delivery_mode;
BEGIN
  IF NOT public.can_view_bi_analytics() THEN
    RAISE EXCEPTION 'UNAUTHORIZED_BI_ACCESS';
  END IF;

  IF p_event_type IS NOT NULL THEN
    v_event_type := p_event_type::public.event_type;
  END IF;
  IF p_delivery_mode IS NOT NULL THEN
    v_delivery_mode := p_delivery_mode::public.delivery_mode;
  END IF;

  RETURN QUERY
  WITH event_monthly AS (
    SELECT
      to_char(e.start_date, 'YYYY-MM') AS m_period,
      e.id AS event_id,
      CASE
        WHEN e.status IN ('COMPLETED', 'POST_EVENT', 'FINANCIAL_CLOSING', 'CLOSED')
          THEN COALESCE(e.revenue_recognized_amount, e.sales_value)
        ELSE 0
      END AS revenue,
      COALESCE(SUM(ex.amount), 0) AS cost
    FROM events e
    LEFT JOIN expenses ex
      ON ex.event_id = e.id AND ex.deleted_at IS NULL AND ex.status IN ('APPROVED', 'PAID')
    WHERE e.deleted_at IS NULL
      AND e.status NOT IN ('DRAFT', 'CANCELLED')
      AND e.start_date IS NOT NULL
      AND (p_event_type IS NULL OR e.event_type = v_event_type)
      AND (p_delivery_mode IS NULL OR e.delivery_mode = v_delivery_mode)
    GROUP BY to_char(e.start_date, 'YYYY-MM'), e.id, e.status, e.revenue_recognized_amount, e.sales_value
  )
  SELECT
    em.m_period AS month_period,
    COUNT(em.event_id)::bigint AS total_events,
    COALESCE(SUM(em.revenue), 0) AS total_revenue,
    COALESCE(SUM(em.cost), 0) AS total_cost,
    COALESCE(SUM(em.revenue) - SUM(em.cost), 0) AS gross_profit,
    CASE
      WHEN SUM(em.revenue) > 0 THEN ROUND((SUM(em.revenue) - SUM(em.cost)) * 100.0 / SUM(em.revenue), 2)
      ELSE NULL
    END AS margin_pct
  FROM event_monthly em
  GROUP BY em.m_period
  ORDER BY em.m_period DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_financial_forecasting(text, text) TO authenticated;
