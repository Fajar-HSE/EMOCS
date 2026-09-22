-- Phase 2: real email delivery for notifications (user instruction: email
-- only for now, WhatsApp deferred to a later phase).
--
-- create_notification() already runs inside every trusted DB function/
-- trigger that emits a notification (transition_event_status, assign_pic,
-- notify_task_assigned, notify_critical_issue, check_overdue_tasks). Rather
-- than teaching each of those call sites about email, we extend this single
-- choke point to also enqueue a PENDING row in notification_deliveries
-- (channel = 'EMAIL'). The actual send happens from the Next.js server
-- (lib/services/notification-dispatch.ts) via the Resend API, called right
-- after the Server Action that triggered the notification — see
-- actions/event-actions.ts and actions/task-actions.ts. This keeps the
-- outbound HTTP call out of Postgres (no pg_net/Vault needed) while keeping
-- the *decision* of "does this event deserve a notification" inside the
-- trusted DB layer, unchanged.
--
-- A recipient with notification_prefs->>'email' = 'false' is skipped at
-- enqueue time so disabled users never even get a PENDING row.

create or replace function create_notification(
  p_recipient_user_id uuid,
  p_type text,
  p_title text,
  p_body text,
  p_entity_type text,
  p_entity_id uuid,
  p_link_url text,
  p_priority notification_priority default 'MEDIUM'
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_notification_id uuid;
  v_email_enabled boolean;
begin
  if p_recipient_user_id is null then
    return;
  end if;

  insert into notifications (recipient_user_id, type, title, body, entity_type, entity_id, link_url, priority)
  values (p_recipient_user_id, p_type, p_title, p_body, p_entity_type, p_entity_id, p_link_url, p_priority)
  returning id into v_notification_id;

  select coalesce((notification_prefs->>'email')::boolean, true)
    into v_email_enabled
    from profiles
    where id = p_recipient_user_id;

  if coalesce(v_email_enabled, true) then
    insert into notification_deliveries (notification_id, channel, status)
    values (v_notification_id, 'EMAIL', 'PENDING');
  end if;
end;
$$;
