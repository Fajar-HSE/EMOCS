-- Stage 4: a DRAFT event (PRD §12.2.3 wizard, §26.5 "skema Draft memakai
-- .partial()") can be incomplete — customer/training/type aren't chosen
-- until later steps. Completeness is enforced by Zod + submitEvent() at
-- DRAFT -> SUBMITTED time (BR-EVT-04), not by the table schema. Relax the
-- columns that were NOT NULL from Stage 1 (written before the wizard's
-- incremental-save flow was implemented).

alter table events alter column customer_id drop not null;
alter table events alter column training_id drop not null;
alter table events alter column event_type drop not null;
alter table events alter column delivery_mode drop not null;

-- BR-EVT-04 (submit-time completeness) is Zod's job, but these fields are
-- meaningless without a value once an event leaves DRAFT — cheap enough to
-- also guarantee at the DB layer.
alter table events add constraint chk_events_required_from_submitted check (
  status = 'DRAFT' or (
    customer_id is not null
    and training_id is not null
    and event_type is not null
    and delivery_mode is not null
  )
);
