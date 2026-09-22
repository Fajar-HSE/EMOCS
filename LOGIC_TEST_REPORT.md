# EMOCS Logic Test — Phase 4 baseline

> **STATUS (0039 applied): RESOLVED — 3/3 isolated SQL defects fixed & verified live on Supabase
> Cloud, type-check/lint/build green (tsc exit 0, eslint 0 error, `npm run build` exit 0).**
> The three failures below were root-caused and repaired by the additive forward migration
> `supabase/migrations/0039_phase4_bi_fix.sql` (already pushed to Cloud). Live-verified against the
> estimator over a SUBMITTED-only event: `has_enough_data=false` and `estimated_total_cost=null`
> (no misleading total); customer profitability excludes unrecognized revenue; zero-revenue margin is
> `NULL` (rendered "—"). This local 20-pass baseline is retained below purely as historical record.

> ## Baseline (before forward-fix 0039) — 20 PASS, 3 FAIL

Two isolated local SQL defects were repaired: enum casts now use `public.event_type` / `public.delivery_mode`, and GRANT signatures match the parameterized functions. The same 23-check harness was rerun: **20 PASS, 3 FAIL (exit 1)**. No cloud migration was attempted. These are local-file fixes only; deploying them requires a forward migration reconciled against remote definitions.

Remaining failing assertions:
1. Insufficient-data estimator returns total 3,000,000 instead of NULL, despite correctly setting `has_enough_data=false`. The UI hides the total, but the RPC still supplies it. NULL suppression is the test's conservative interpretation of the PRD quality rule.
2. SUBMITTED event with no recognized revenue contributes sales value 10,000,000 to actual profitability.
3. Zero revenue returns margin 0 instead of undefined/NULL.

Of the 20 passing checks, 12 check function definitions/GRANTs and 8 check calculation behavior. This is not a full EMOCS acceptance suite. Lint remains at 10 errors and 7 warnings from the earlier execution.

## Baseline before the isolated SQL fixes

Executed against the current local `0033_phase4_bi_analytics.sql`, without modifying application code or any cloud database.

## Execution

- `npm run type-check`: PASS (exit 0).
- `npm run lint`: FAIL — 10 errors (`no-explicit-any` in `actions/bi-actions.ts`), 7 warnings.
- SQL logic harness: **14 PASS, 9 FAIL**, exit 1.
- Engine: PGlite (embedded PostgreSQL), installed outside the application.
- Command: `node C:/Users/DELL/AppData/Local/Temp/emocs-logic-test/logic-test.mjs`.
- Detailed results: `C:/Users/DELL/AppData/Local/Temp/emocs-logic-test/logic-test-results.json`.

The 14 passing checks include 6 function-definition checks and 4 GRANT checks; they are NOT 14 end-to-end business scenarios.

## Confirmed failures

1. **Invalid enum cast**: `p_event_type::events.event_type` and the delivery equivalent reference a nonexistent schema named `events`. Actual execution raises `schema "events" does not exist`. This blocks benchmark, estimator, training profitability, and monthly aggregation in the current local file. `%TYPE` declarations are not the same as SQL cast targets.
2. **GRANT signature mismatch**: training profitability and forecasting declarations have parameters, but GRANT statements still refer to zero-argument signatures. Both fail on a clean schema. Existing cloud zero-argument functions could instead mask this drift; cloud state was not inspected in this run.
3. **Unrecognized revenue treated as actual**: a synthetic SUBMITTED event with NULL recognized revenue and sales value 10,000,000 is counted as revenue 10,000,000. Expected actual recognized revenue: zero. Pipeline/forecast amounts should be explicitly separated from actual profitability.
4. **Undefined margin reported as zero**: revenue zero and cost 3,000,000 returns margin 0 rather than an undefined/null result, obscuring the denominator-zero condition.
5. **Estimator insufficient-data checks blocked** by the enum-cast runtime error. No claim is made that its numerical behavior passed.

## Verified calculations

On one synthetic CLOSED INHOUSE event:
- Revenue 10,000,000; PAID cost 3,000,000; profit 7,000,000; margin 70%: PASS.
- SUBMITTED expense excluded from actual cost: PASS.
- CANCELLED event excluded from customer profitability: PASS.
- Soft-deleted expense excluded from actual cost: PASS.

## Additional review observations (not runtime-proven by this harness)

- Participant-count estimator parameter is declared but unused.
- Minimum 3 historical samples is an implementation assumption, not a threshold specified in the quoted PRD section.
- SECURITY DEFINER BI functions require review of company/team scope; a role check alone does not demonstrate row-level isolation.
- Monthly historical aggregation is not itself a forecasting model.
- The applied migration was edited in place earlier. Any deployment repair must reconcile actual remote definitions and use a forward migration, not assume a repeated push reapplies 0033.

## Limits and next steps

This uses minimal synthetic table fixtures and a privileged role-helper stub solely to exercise SQL calculations. It does not verify Supabase JWT hooks, authorization, RLS, MFA, full migration replay, event workflow, approvals, browser E2E, or current cloud definitions. No secrets were loaded and no cloud writes were performed.

Next: repair isolated SQL defects with regression tests, resolve business rules for actual-vs-forecast and undefined margins, then run the full sandbox integration suite. Cloud migration requires explicit authorization and valid management access. Do not weaken access controls to make tests pass.
