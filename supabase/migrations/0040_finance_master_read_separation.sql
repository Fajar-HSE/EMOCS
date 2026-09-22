-- 0040_finance_master_read_separation.sql
-- Read separation for financial master tables.
--
-- Problem: SELECT on cost_categories / approval_thresholds was open to every
-- authenticated user, so Sales could read approval tiers and the cost taxonomy
-- (via the master tab bar or direct URL) even though the nav hid those menus.
--
-- Runtime approval routing is UNAFFECTED: submit/decide_budget, expense
-- decisions, financial closing, revenue, and BI analytics all run SECURITY
-- DEFINER (0026/0027/0028/0029/0033), so they bypass RLS regardless.
--
-- Direct-read paths verified before locking:
--   cost_categories: /financials (FINANCE group only), event-detail dropdown
--     (budget/expense creators: OPERATIONS family), master page.
--   approval_thresholds: financial-actions.ts (FINANCE/ADMIN only) + master page.
-- Writes are untouched (already role-gated in 0024).

drop policy if exists cost_categories_select on cost_categories;
create policy cost_categories_select on cost_categories for select to authenticated
  using (deleted_at is null and public.has_any_role('OPERATIONS','OPERATIONS_MANAGER','FINANCE','MANAGEMENT','ADMIN'));

drop policy if exists approval_thresholds_select on approval_thresholds;
create policy approval_thresholds_select on approval_thresholds for select to authenticated
  using (public.has_any_role('OPERATIONS_MANAGER','FINANCE','MANAGEMENT','ADMIN'));
