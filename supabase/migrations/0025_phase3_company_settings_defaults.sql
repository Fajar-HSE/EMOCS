-- Phase 3 Stage A follow-up: seed the actual default values into
-- companies.settings (0024 only added the column with an empty default).
-- Both are flagged assumptions in PROJECT_STATUS.md, editable by
-- Finance/Admin later without a migration.
update companies
set settings = settings || jsonb_build_object(
  'expense_receipt_required_above', 100000,
  'budget_required_above', 0
)
where deleted_at is null;
