-- 0033_phase4_bi_analytics.sql
-- Phase 4: Business Intelligence & Analytics (Cost Benchmark, Estimator, Profitability Analysis, Forecasting)

-- 1. Helper function: Check if viewer can see BI / Analytics
CREATE OR REPLACE FUNCTION public.can_view_bi_analytics()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN true;
  END IF;
  RETURN public.has_any_role('ADMIN', 'MANAGEMENT', 'FINANCE', 'OPERATIONS_MANAGER', 'SALES_MANAGER');
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_view_bi_analytics() TO authenticated;

-- 2. Cost Benchmark Function
CREATE OR REPLACE FUNCTION public.get_cost_benchmark(
  p_training_id uuid DEFAULT NULL,
  p_event_type text DEFAULT NULL,
  p_delivery_mode text DEFAULT NULL
)
RETURNS TABLE (
  cost_category_id uuid,
  category_name text,
  category_code text,
  sample_count bigint,
  avg_amount numeric,
  min_amount numeric,
  max_amount numeric,
  total_amount numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_type events.event_type%TYPE;
  v_delivery_mode events.delivery_mode%TYPE;
BEGIN
  IF NOT public.can_view_bi_analytics() THEN
    RAISE EXCEPTION 'UNAUTHORIZED_BI_ACCESS';
  END IF;

  v_event_type := p_event_type::public.event_type;
  v_delivery_mode := p_delivery_mode::public.delivery_mode;

  RETURN QUERY
  WITH valid_events AS (
    SELECT e.id
    FROM events e
    WHERE e.deleted_at IS NULL
      AND e.status IN ('COMPLETED', 'POST_EVENT', 'FINANCIAL_CLOSING', 'CLOSED')
      AND (p_training_id IS NULL OR e.training_id = p_training_id)
      AND (p_event_type IS NULL OR e.event_type = v_event_type)
      AND (p_delivery_mode IS NULL OR e.delivery_mode = v_delivery_mode)
  ),
  approved_expenses AS (
    SELECT
      ex.cost_category_id,
      ex.event_id,
      SUM(ex.amount) AS event_cat_total
    FROM expenses ex
    JOIN valid_events ve ON ex.event_id = ve.id
    WHERE ex.deleted_at IS NULL
      AND ex.status IN ('APPROVED', 'PAID')
    GROUP BY ex.cost_category_id, ex.event_id
  )
  SELECT
    cc.id AS cost_category_id,
    cc.name AS category_name,
    cc.code AS category_code,
    COUNT(ae.event_id) AS sample_count,
    COALESCE(ROUND(AVG(ae.event_cat_total), 2), 0) AS avg_amount,
    COALESCE(MIN(ae.event_cat_total), 0) AS min_amount,
    COALESCE(MAX(ae.event_cat_total), 0) AS max_amount,
    COALESCE(SUM(ae.event_cat_total), 0) AS total_amount
  FROM cost_categories cc
  LEFT JOIN approved_expenses ae ON cc.id = ae.cost_category_id
  WHERE cc.is_active = true
  GROUP BY cc.id, cc.name, cc.code
  ORDER BY cc.sort_order, cc.name;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_cost_benchmark(uuid, text, text) TO authenticated;

-- 3. Cost Estimator Function (PRD §20 rule: requires sample >= 3)
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
  v_sample_count bigint;
  v_has_enough boolean;
  v_msg text;
  v_categories jsonb;
  v_est_total numeric := 0;
  v_event_type events.event_type%TYPE;
  v_delivery_mode events.delivery_mode%TYPE;
BEGIN
  IF NOT public.can_view_bi_analytics() THEN
    RAISE EXCEPTION 'UNAUTHORIZED_BI_ACCESS';
  END IF;

  v_event_type := p_event_type::public.event_type;
  v_delivery_mode := p_delivery_mode::public.delivery_mode;

  -- Count historical completed events matching criteria
  SELECT COUNT(e.id) INTO v_sample_count
  FROM events e
  WHERE e.deleted_at IS NULL
    AND e.status IN ('COMPLETED', 'POST_EVENT', 'FINANCIAL_CLOSING', 'CLOSED')
    AND (p_training_id IS NULL OR e.training_id = p_training_id)
    AND (p_event_type IS NULL OR e.event_type = v_event_type)
    AND (p_delivery_mode IS NULL OR e.delivery_mode = v_delivery_mode);

  v_has_enough := (v_sample_count >= 3);

  IF NOT v_has_enough THEN
    v_est_total := 0;
    v_categories := '[]'::jsonb;
    v_msg := 'Data belum cukup untuk memberikan estimasi yang dapat dipercaya (minimal 3 event historis pembanding).';
  ELSE
    v_msg := 'Estimasi biaya berhasil dihitung berdasarkan ' || v_sample_count || ' event historis.';
  END IF;

  -- Build breakdown per category
  WITH benchmark AS (
    SELECT * FROM public.get_cost_benchmark(p_training_id, p_event_type, p_delivery_mode)
  )
  SELECT
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
    COALESCE(SUM(b.avg_amount), 0)
  INTO v_categories, v_est_total
  FROM benchmark b
  WHERE b.sample_count > 0;

  RETURN jsonb_build_object(
    'has_enough_data', v_has_enough,
    'message', v_msg,
    'sample_count', v_sample_count,
    'estimated_total_cost', COALESCE(v_est_total, 0),
    'categories', COALESCE(v_categories, '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_cost_estimator(uuid, text, text, integer) TO authenticated;

-- 4. Customer Profitability Analysis
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
DECLARE
  v_event_type events.event_type%TYPE;
  v_delivery_mode events.delivery_mode%TYPE;
BEGIN
  IF NOT public.can_view_bi_analytics() THEN
    RAISE EXCEPTION 'UNAUTHORIZED_BI_ACCESS';
  END IF;

  RETURN QUERY
  WITH event_costs AS (
    SELECT
      e.id AS event_id,
      e.customer_id,
      CASE WHEN e.status = 'COMPLETED' THEN COALESCE(e.revenue_recognized_amount, e.sales_value)
           ELSE 0 END AS revenue,
      COALESCE(SUM(ex.amount), 0) AS cost
    FROM events e
    LEFT JOIN expenses ex ON ex.event_id = e.id AND ex.deleted_at IS NULL AND ex.status IN ('APPROVED', 'PAID')
    WHERE e.deleted_at IS NULL
      AND e.status NOT IN ('DRAFT', 'CANCELLED')
    GROUP BY e.id, e.customer_id, e.revenue_recognized_amount, e.sales_value
  )
  SELECT
    c.id AS customer_id,
    c.name AS customer_name,
    COUNT(ec.event_id) AS total_events,
    COALESCE(SUM(ec.revenue), 0) AS total_revenue,
    COALESCE(SUM(ec.cost), 0) AS total_cost,
    COALESCE(SUM(ec.revenue - ec.cost), 0) AS gross_profit,
    CASE
      WHEN SUM(ec.revenue) > 0 THEN ROUND((SUM(ec.revenue - ec.cost) / SUM(ec.revenue)) * 100, 2)
      ELSE NULL
    END AS margin_pct
  FROM customers c
  JOIN event_costs ec ON c.id = ec.customer_id
  WHERE c.deleted_at IS NULL
  GROUP BY c.id, c.name
  ORDER BY total_revenue DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_customer_profitability() TO authenticated;

-- 5. Training Program Profitability Analysis
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
  v_event_type events.event_type%TYPE;
  v_delivery_mode events.delivery_mode%TYPE;
BEGIN
  IF NOT public.can_view_bi_analytics() THEN
    RAISE EXCEPTION 'UNAUTHORIZED_BI_ACCESS';
  END IF;

  v_event_type := p_event_type::public.event_type;
  v_delivery_mode := p_delivery_mode::public.delivery_mode;

  RETURN QUERY
  WITH event_costs AS (
    SELECT
      e.id AS event_id,
      e.training_id,
      COALESCE(e.revenue_recognized_amount, e.sales_value) AS revenue,
      COALESCE(SUM(ex.amount), 0) AS cost
    FROM events e
    LEFT JOIN expenses ex ON ex.event_id = e.id AND ex.deleted_at IS NULL AND ex.status IN ('APPROVED', 'PAID')
    WHERE e.deleted_at IS NULL
      AND e.status NOT IN ('DRAFT', 'CANCELLED')
      AND (p_training_id IS NULL OR e.training_id = p_training_id)
      AND (p_event_type IS NULL OR e.event_type = v_event_type)
      AND (p_delivery_mode IS NULL OR e.delivery_mode = v_delivery_mode)
    GROUP BY e.id, e.training_id, e.revenue_recognized_amount, e.sales_value
  )
  SELECT
    t.id AS training_id,
    t.name AS training_name,
    t.code AS training_code,
    COUNT(ec.event_id) AS total_events,
    COALESCE(SUM(ec.revenue), 0) AS total_revenue,
    COALESCE(SUM(ec.cost), 0) AS total_cost,
    COALESCE(SUM(ec.revenue - ec.cost), 0) AS gross_profit,
    CASE
      WHEN SUM(ec.revenue) > 0 THEN ROUND((SUM(ec.revenue - ec.cost) / SUM(ec.revenue)) * 100, 2)
      ELSE NULL
    END AS margin_pct
  FROM trainings t
  JOIN event_costs ec ON t.id = ec.training_id
  WHERE t.deleted_at IS NULL
  GROUP BY t.id, t.name, t.code
  ORDER BY total_revenue DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_training_profitability(uuid, text, text) TO authenticated;

-- 6. Monthly Trend & Financial Forecasting
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
  v_event_type events.event_type%TYPE;
  v_delivery_mode events.delivery_mode%TYPE;
BEGIN
  IF NOT public.can_view_bi_analytics() THEN
    RAISE EXCEPTION 'UNAUTHORIZED_BI_ACCESS';
  END IF;

  v_event_type := p_event_type::public.event_type;
  v_delivery_mode := p_delivery_mode::public.delivery_mode;

  RETURN QUERY
  WITH event_monthly AS (
    SELECT
      to_char(e.start_date, 'YYYY-MM') AS m_period,
      e.id AS event_id,
      CASE WHEN e.status = 'COMPLETED' THEN COALESCE(e.revenue_recognized_amount, e.sales_value) ELSE 0 END AS revenue,
      COALESCE(SUM(ex.amount), 0) AS cost
    FROM events e
    LEFT JOIN expenses ex ON ex.event_id = e.id AND ex.deleted_at IS NULL AND ex.status IN ('APPROVED', 'PAID')
    WHERE e.deleted_at IS NULL
      AND e.status NOT IN ('DRAFT', 'CANCELLED')
      AND e.start_date IS NOT NULL
      AND (p_event_type IS NULL OR e.event_type = v_event_type)
      AND (p_delivery_mode IS NULL OR e.delivery_mode = v_delivery_mode)
    GROUP BY to_char(e.start_date, 'YYYY-MM'), e.id, e.revenue_recognized_amount, e.sales_value
  )
  SELECT
    em.m_period AS month_period,
    COUNT(em.event_id) AS total_events,
    COALESCE(SUM(em.revenue), 0) AS total_revenue,
    COALESCE(SUM(em.cost), 0) AS total_cost,
    COALESCE(SUM(em.revenue - em.cost), 0) AS gross_profit,
    CASE
      WHEN SUM(em.revenue) > 0 THEN ROUND((SUM(em.revenue - em.cost) / SUM(em.revenue)) * 100, 2)
      ELSE NULL
    END AS margin_pct
  FROM event_monthly em
  GROUP BY em.m_period
  ORDER BY em.m_period DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_financial_forecasting(text, text) TO authenticated;
