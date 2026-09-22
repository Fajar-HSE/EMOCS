-- Fails the suite if any table in the public schema does not have RLS
-- enabled — the mandatory mitigation from PRD §28 ("membuat tabel baru dan
-- lupa mengaktifkan RLS"). Run with `supabase test db` (requires the local
-- dev stack / Docker).

begin;
select plan(1);

select is(
  (
    select count(*)::int
    from pg_tables t
    join pg_class c on c.relname = t.tablename and c.relnamespace = 'public'::regnamespace
    where t.schemaname = 'public'
      and not c.relrowsecurity
  ),
  0,
  'every table in the public schema must have row level security enabled'
);

select * from finish();
rollback;
