delete from notifications where entity_id in (
  select id from events where event_code like 'EVT-2026-%' or event_name in ('(Draft belum diberi nama)', 'AC-05 duplicate test event')
);
delete from event_status_history where event_id in (
  select id from events where event_code like 'EVT-2026-%' or event_name in ('(Draft belum diberi nama)', 'AC-05 duplicate test event')
);
delete from event_tasks where event_id in (
  select id from events where event_code like 'EVT-2026-%' or event_name in ('(Draft belum diberi nama)', 'AC-05 duplicate test event')
);
delete from events where event_code like 'EVT-2026-%' or event_name in ('(Draft belum diberi nama)', 'AC-05 duplicate test event');
delete from customer_contacts where full_name = 'Budi Santoso';
delete from customers where name = 'PT Uji Coba Sejahtera';
delete from trainings where code = 'TEST-01';
delete from cities where name = 'Jakarta';
