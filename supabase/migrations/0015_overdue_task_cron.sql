-- Stage 8: daily overdue-task marking + notification (BR-TSK-04, N11).
-- "Task lewat tenggat ditandai otomatis setiap hari pukul 06:00 WIB."
-- Overdue-ness itself is already computed on the fly wherever tasks are
-- displayed (due_date < today, PRD leaves the flag as a read model, not a
-- stored column) — what this job adds is the once-per-task notification to
-- the assignee + Ops Managers, de-duplicated via overdue_notified_at so a
-- task doesn't spam the same people every single day it stays overdue.

create extension if not exists pg_cron;

alter table event_tasks add column overdue_notified_at timestamptz;

create or replace function check_overdue_tasks()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_task record;
  v_ops_manager record;
  v_link text;
begin
  for v_task in
    select t.id, t.title, t.assignee_user_id, t.event_id, e.event_code, e.event_name
    from event_tasks t
    join events e on e.id = t.event_id
    where t.due_date < (now() at time zone 'Asia/Jakarta')::date
      and t.status not in ('DONE', 'CANCELLED')
      and t.overdue_notified_at is null
      and t.deleted_at is null
  loop
    v_link := '/events/' || v_task.event_id;

    perform create_notification(v_task.assignee_user_id, 'TASK_OVERDUE',
      'Task telat: ' || v_task.title, coalesce(v_task.event_code, v_task.event_name),
      'event_task', v_task.id, v_link, 'HIGH');

    for v_ops_manager in
      select p.id from profiles p
      join user_roles ur on ur.user_id = p.id
      join roles r on r.id = ur.role_id
      where r.name = 'OPERATIONS_MANAGER' and p.is_active
    loop
      perform create_notification(v_ops_manager.id, 'TASK_OVERDUE',
        'Task telat: ' || v_task.title, coalesce(v_task.event_code, v_task.event_name),
        'event_task', v_task.id, v_link, 'HIGH');
    end loop;

    update event_tasks set overdue_notified_at = now() where id = v_task.id;
  end loop;
end;
$$;

-- 06:00 WIB = 23:00 UTC (previous day).
select cron.schedule('daily-overdue-task-check', '0 23 * * *', $$select check_overdue_tasks()$$);
