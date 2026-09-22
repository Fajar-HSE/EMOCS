-- Stage 1: extensions + enum types shared across Phase 1 tables.
-- PRD refs: §24.2 (conventions), §12.2.3-12.2.4 (event fields), §10 (state machine)

create extension if not exists pgcrypto;

create type event_status as enum (
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'REVISION_REQUESTED',
  'APPROVED',
  'REJECTED',
  'PIC_ASSIGNED',
  'PREPARATION',
  'READY',
  'RUNNING',
  'COMPLETED',
  'POST_EVENT',
  'FINANCIAL_CLOSING',
  'CLOSED',
  'CANCELLED',
  'POSTPONED'
);

create type event_type as enum ('INHOUSE', 'PUBLIC', 'ONLINE', 'HYBRID', 'ASSESSMENT');
create type delivery_mode as enum ('OFFLINE', 'ONLINE', 'HYBRID');
create type location_type as enum ('CLIENT_SITE', 'HOTEL', 'OFFICE', 'ONLINE', 'OTHER');
create type po_status as enum ('NO_PO', 'PO_PENDING', 'PO_RECEIVED', 'VERBAL_COMMITMENT');
create type payment_term as enum ('DP', 'FULL_BEFORE', 'NET_14', 'NET_30', 'OTHER');
create type event_priority as enum ('LOW', 'NORMAL', 'HIGH', 'URGENT');
create type task_status as enum ('TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE', 'CANCELLED');
create type task_priority as enum ('LOW', 'NORMAL', 'HIGH', 'CRITICAL');
create type cancellation_category as enum (
  'CUSTOMER_CANCELLED',
  'INTERNAL_CANCELLED',
  'FORCE_MAJEURE',
  'DUPLICATE',
  'OTHER'
);
create type notification_priority as enum ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
create type notification_channel as enum ('IN_APP', 'EMAIL', 'WHATSAPP');
create type notification_delivery_status as enum ('PENDING', 'SENT', 'FAILED');
