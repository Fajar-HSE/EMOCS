-- Fix: fn_audit() used NEW.id/OLD.id directly, which fails to even compile
-- the statement ("record NEW has no field id") for tables whose primary key
-- isn't literally named id — e.g. invited_emails (PK = email). Use a
-- defensive jsonb lookup instead so the trigger stays generic across tables.

create or replace function fn_audit() returns trigger
language plpgsql security definer as $$
declare changed text[];
begin
  if TG_OP = 'UPDATE' then
    select array_agg(key) into changed
    from jsonb_each(to_jsonb(NEW))
    where to_jsonb(NEW) -> key is distinct from to_jsonb(OLD) -> key;
    if changed is null then return NEW; end if;
  end if;

  insert into audit_logs(table_name, record_id, action, actor_user_id,
                         old_values, new_values, changed_fields)
  values (TG_TABLE_NAME,
          coalesce((to_jsonb(NEW)->>'id')::uuid, (to_jsonb(OLD)->>'id')::uuid),
          TG_OP,
          auth.uid(),
          case when TG_OP = 'INSERT' then null else to_jsonb(OLD) end,
          case when TG_OP = 'DELETE' then null else to_jsonb(NEW) end,
          changed);
  return coalesce(NEW, OLD);
end $$;
