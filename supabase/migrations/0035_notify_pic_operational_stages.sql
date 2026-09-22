-- Gap ditemukan saat audit: PIC Operations yang ditugaskan ke sebuah event
-- (events.pic_user_id) tidak pernah dapat notifikasi apa pun saat event yang
-- mereka pegang maju PREPARATION → READY → RUNNING → COMPLETED → POST_EVENT
-- — hanya sales_user_id yang dapat, dan untuk sebagian besar transisi itu
-- lewat fallback generik "→ STATUS" tanpa konteks. PIC baru dapat notifikasi
-- sekali saat PIC_ASSIGNED (lewat assign_pic(), lihat 0012_notifications.sql)
-- lalu tidak pernah lagi meski merekalah yang menjalankan event sehari-hari.
--
-- Tambah cabang eksplisit untuk 4 status operasional (PREPARATION, READY,
-- RUNNING, POST_EVENT) yang mengirim ke pic_user_id + backup_pic_user_id
-- (pola sama seperti cabang CANCELLED/POSTPONED yang sudah ada), dan perluas
-- cabang COMPLETED yang sudah ada supaya juga mengirim ke PIC. Cabang lain
-- (SUBMITTED/APPROVED/REJECTED/REVISION_REQUESTED/CANCELLED/POSTPONED) dan
-- fallback generik untuk UNDER_REVIEW/PIC_ASSIGNED/FINANCIAL_CLOSING/CLOSED
-- (bukan tanggung jawab PIC) tidak diubah. Tidak ada perubahan skema/RLS.
--
-- Definisi diekstrak persis dari 0034_event_submitted_notify_admin_management.sql.

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

  elsif p_to_status = 'PREPARATION' then
    perform create_notification(p_event.pic_user_id, 'EVENT_PREPARATION',
      v_label || ' memasuki tahap persiapan',
      'Lengkapi checklist dan task persiapan sebelum event dimulai.',
      'event', p_event.id, v_link, 'MEDIUM');
    if p_event.backup_pic_user_id is not null then
      perform create_notification(p_event.backup_pic_user_id, 'EVENT_PREPARATION',
        v_label || ' memasuki tahap persiapan',
        'Lengkapi checklist dan task persiapan sebelum event dimulai.',
        'event', p_event.id, v_link, 'MEDIUM');
    end if;

  elsif p_to_status = 'READY' then
    perform create_notification(p_event.pic_user_id, 'EVENT_READY',
      v_label || ' siap dijalankan', p_event.event_name, 'event', p_event.id, v_link, 'MEDIUM');
    if p_event.backup_pic_user_id is not null then
      perform create_notification(p_event.backup_pic_user_id, 'EVENT_READY',
        v_label || ' siap dijalankan', p_event.event_name, 'event', p_event.id, v_link, 'MEDIUM');
    end if;

  elsif p_to_status = 'RUNNING' then
    perform create_notification(p_event.pic_user_id, 'EVENT_RUNNING',
      v_label || ' sedang berlangsung', p_event.event_name, 'event', p_event.id, v_link, 'MEDIUM');
    if p_event.backup_pic_user_id is not null then
      perform create_notification(p_event.backup_pic_user_id, 'EVENT_RUNNING',
        v_label || ' sedang berlangsung', p_event.event_name, 'event', p_event.id, v_link, 'MEDIUM');
    end if;

  elsif p_to_status = 'COMPLETED' then
    perform create_notification(p_event.sales_user_id, 'EVENT_COMPLETED',
      v_label || ' selesai', p_event.event_name, 'event', p_event.id, v_link, 'MEDIUM');
    perform create_notification(p_event.pic_user_id, 'EVENT_COMPLETED',
      v_label || ' selesai', p_event.event_name, 'event', p_event.id, v_link, 'MEDIUM');

  elsif p_to_status = 'POST_EVENT' then
    perform create_notification(p_event.pic_user_id, 'EVENT_POST_EVENT',
      v_label || ' memasuki tahap pasca-event',
      'Lengkapi dokumen dan laporan pasca-event.', 'event', p_event.id, v_link, 'MEDIUM');
    if p_event.backup_pic_user_id is not null then
      perform create_notification(p_event.backup_pic_user_id, 'EVENT_POST_EVENT',
        v_label || ' memasuki tahap pasca-event',
        'Lengkapi dokumen dan laporan pasca-event.', 'event', p_event.id, v_link, 'MEDIUM');
    end if;

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
