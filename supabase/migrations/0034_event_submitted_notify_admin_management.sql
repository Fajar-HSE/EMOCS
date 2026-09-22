-- EVENT_SUBMITTED fan-out diperluas: selain OPERATIONS_MANAGER, ADMIN dan
-- MANAGEMENT juga menerima notifikasi request baru (mereka pihak yang
-- berwenang me-review/menindaklanjuti). DISTINCT mencegah duplikat bila satu
-- user memegang dua role sekaligus. Requester (sales owner) menerima tanda
-- terima agar tahu request-nya masuk antrean review.
--
-- Tidak ada perubahan state machine / RLS — hanya isi dispatch notifikasi.

create or replace function notify_event_status_change(
  p_event events,
  p_from_status event_status,
  p_to_status event_status,
  p_reason text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recipient record;
  v_link text := '/events/' || p_event.id;
  v_label text := coalesce(p_event.event_code, p_event.event_name);
begin
  if p_to_status = 'SUBMITTED' then
    for v_recipient in
      select distinct p.id from profiles p
      join user_roles ur on ur.user_id = p.id
      join roles r on r.id = ur.role_id
      where r.name in ('OPERATIONS_MANAGER', 'ADMIN', 'MANAGEMENT') and p.is_active
    loop
      perform create_notification(v_recipient.id, 'EVENT_SUBMITTED',
        'Request baru: ' || v_label, p_event.event_name, 'event', p_event.id, v_link, 'MEDIUM');
    end loop;

    perform create_notification(p_event.sales_user_id, 'EVENT_SUBMITTED_RECEIPT',
      v_label || ' telah diterima', 'Request Anda menunggu review tim Operasional.',
      'event', p_event.id, v_link, 'MEDIUM');

  elsif p_to_status = 'APPROVED' then
    perform create_notification(p_event.sales_user_id, 'EVENT_APPROVED',
      v_label || ' disetujui', p_event.event_name, 'event', p_event.id, v_link, 'MEDIUM');

  elsif p_to_status = 'REJECTED' then
    perform create_notification(p_event.sales_user_id, 'EVENT_REJECTED',
      v_label || ' ditolak', p_reason, 'event', p_event.id, v_link, 'HIGH');

  elsif p_to_status = 'REVISION_REQUESTED' then
    perform create_notification(p_event.sales_user_id, 'EVENT_REVISION_REQUESTED',
      v_label || ' perlu revisi', p_reason, 'event', p_event.id, v_link, 'HIGH');

  elsif p_to_status = 'COMPLETED' then
    perform create_notification(p_event.sales_user_id, 'EVENT_COMPLETED',
      v_label || ' selesai', p_event.event_name, 'event', p_event.id, v_link, 'MEDIUM');

  elsif p_to_status in ('CANCELLED', 'POSTPONED') then
    perform create_notification(p_event.sales_user_id, 'EVENT_' || p_to_status,
      v_label || ' ' || (case when p_to_status = 'CANCELLED' then 'dibatalkan' else 'ditunda' end),
      p_reason, 'event', p_event.id, v_link, 'HIGH');
    perform create_notification(p_event.pic_user_id, 'EVENT_' || p_to_status,
      v_label || ' ' || (case when p_to_status = 'CANCELLED' then 'dibatalkan' else 'ditunda' end),
      p_reason, 'event', p_event.id, v_link, 'HIGH');

  else
    -- N13 generic fallback: any other status change notifies the owner.
    perform create_notification(p_event.sales_user_id, 'EVENT_STATUS_CHANGED',
      v_label || ' → ' || p_to_status, null, 'event', p_event.id, v_link, 'MEDIUM');
  end if;
end;
$$;
