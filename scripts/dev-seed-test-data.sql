insert into customers (company_id, name)
select id, 'PT Uji Coba Sejahtera' from companies limit 1
on conflict do nothing;

insert into trainings (company_id, code, name, standard_duration_days)
select id, 'TEST-01', 'Pelatihan Uji Coba', 2 from companies limit 1
on conflict do nothing;

insert into events (
  company_id, sales_user_id, event_name, event_code, customer_id,
  training_id, event_type, delivery_mode, start_date, end_date,
  participant_count, po_status, priority, status, submitted_at
)
select
  a.company_id, a.id, 'AC-11 illegal transition test', generate_event_code(),
  c.id, t.id, 'INHOUSE', 'ONLINE', current_date + 10, current_date + 11,
  15, 'NO_PO', 'NORMAL', 'SUBMITTED', now()
from profiles a, customers c, trainings t
where a.email = 'fajar.hseskillup@gmail.com'
  and c.name = 'PT Uji Coba Sejahtera' and t.code = 'TEST-01'
returning id, event_code;
