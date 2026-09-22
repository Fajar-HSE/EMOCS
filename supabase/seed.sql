-- Bootstrap data. Safe to re-run (idempotent via WHERE NOT EXISTS / ON CONFLICT).

insert into companies (name)
select 'Indonesian Sertification Center (ICC)'
where not exists (select 1 from companies);

-- Bootstrap the first ADMIN so someone can actually log in after go-live
-- (handle_new_user() only creates a profile for emails present here).
insert into invited_emails (email, full_name, roles)
values ('fajar.hseskillup@gmail.com', 'Admin EMOCS', array['ADMIN'])
on conflict (email) do nothing;
