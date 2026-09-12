-- Existing credit schema only: no tables, columns, customer IDs, or balances are removed.
-- Run atomically. A lock prevents inserts racing the initial sequence high-water mark.
begin;
set local lock_timeout = '10s';
lock table public.customers, public.profiles, public.invoices, public.payments in share row exclusive mode;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

-- These no-argument helpers can inspect ONLY the calling Auth user's profile.
-- They intentionally bypass profile RLS to avoid recursion; no frontend IDs or
-- user_metadata/app_metadata role claims participate in authorization.
create or replace function private.is_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
  );
$$;
alter function private.is_admin() owner to postgres;
revoke all on function private.is_admin() from public, anon, authenticated, service_role;
grant execute on function private.is_admin() to authenticated;

create or replace function private.current_customer_id()
returns uuid
language sql stable security definer
set search_path = ''
as $$
  select p.customer_id from public.profiles p
  where (select auth.uid()) is not null
    and p.id = (select auth.uid()) and p.role = 'customer';
$$;
alter function private.current_customer_id() owner to postgres;
revoke all on function private.current_customer_id() from public, anon, authenticated, service_role;
grant execute on function private.current_customer_id() to authenticated;

alter table public.customers enable row level security;
alter table public.invoices enable row level security;
alter table public.payments enable row level security;
alter table public.profiles enable row level security;
alter table public.customers force row level security;
alter table public.invoices force row level security;
alter table public.payments force row level security;
alter table public.profiles force row level security;

-- Remove permissive policies if this script is applied to an existing deployment.
do $$
declare p record;
begin
  for p in select schemaname, tablename, policyname from pg_policies
    where schemaname = 'public' and tablename in ('customers','invoices','payments','profiles')
  loop
    execute format('drop policy %I on %I.%I', p.policyname, p.schemaname, p.tablename);
  end loop;
end;
$$;

-- Table grants and RLS are both required. In particular, revoke TRUNCATE,
-- DELETE, TRIGGER and profile writes; RLS alone cannot protect TRUNCATE.
revoke all on public.customers, public.invoices, public.payments, public.profiles
  from public, anon, authenticated;
grant select, insert, update on public.customers, public.invoices to authenticated;
grant select on public.payments, public.profiles to authenticated;

create policy profiles_read_self on public.profiles
for select to authenticated
using (id = (select auth.uid()));
-- No profile INSERT/UPDATE/DELETE policy or grant, including for app admins.
-- Role and customer links may only be changed by a trusted database operator.

create policy customers_read_authorized on public.customers
for select to authenticated
using ((select private.is_admin()) or id = (select private.current_customer_id()));
create policy customers_insert_admin on public.customers
for insert to authenticated
with check ((select private.is_admin()));
create policy customers_update_admin on public.customers
for update to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy invoices_read_authorized on public.invoices
for select to authenticated
using ((select private.is_admin()) or customer_id = (select private.current_customer_id()));
create policy invoices_insert_admin on public.invoices
for insert to authenticated
with check ((select private.is_admin()));
create policy invoices_update_admin on public.invoices
for update to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy payments_read_authorized on public.payments
for select to authenticated
using (
  (select private.is_admin()) or invoice_id in (
    select i.id from public.invoices i
    where i.customer_id = (select private.current_customer_id())
  )
);
-- No payment writes or deletes were requested for either application role.

-- Existing unique/FK indexes already cover profiles.id/customer_id,
-- invoices.customer_id and payments.invoice_id; keep and reuse those indexes.
alter table public.profiles alter column role set default 'customer';

create sequence private.customer_code_seq as bigint minvalue 1 no cycle;
alter sequence private.customer_code_seq owner to postgres;
-- MAX is used ONCE under a write lock, never per signup. Existing codes remain
-- unchanged. PostgreSQL nextval provides concurrency safety for every new code.
select pg_catalog.setval('private.customer_code_seq'::regclass,
  greatest(coalesce((select max(substring(customer_code from '^CUST-([0-9]+)$')::bigint)
    from public.customers where customer_code ~ '^CUST-[0-9]+$'), 0) + 1, 1), false);
revoke all on sequence private.customer_code_seq from public, anon, authenticated, service_role;

create or replace function private.assign_customer_code()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare code_number text;
begin
  -- A trigger, not an exposed RPC. Refuse reuse on another table.
  if TG_TABLE_SCHEMA <> 'public' or TG_TABLE_NAME <> 'customers' then
    raise exception 'Invalid customer-code trigger target';
  end if;
  if TG_OP = 'INSERT' then
    code_number := pg_catalog.nextval('private.customer_code_seq'::regclass)::text;
    -- Do not truncate once the sequence grows beyond four digits.
    new.customer_code := 'CUST-' || pg_catalog.lpad(code_number, greatest(4, length(code_number)), '0');
  elsif new.customer_code is distinct from old.customer_code then
    raise exception 'Customer codes are immutable' using errcode = '23514';
  end if;
  return new;
end;
$$;
alter function private.assign_customer_code() owner to postgres;
revoke all on function private.assign_customer_code() from public, anon, authenticated, service_role;
create trigger customers_assign_code before insert or update of customer_code
on public.customers for each row execute function private.assign_customer_code();

create or replace function private.provision_auth_customer()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare linked_customer uuid; display_name text;
begin
  if TG_TABLE_SCHEMA <> 'auth' or TG_TABLE_NAME <> 'users' or TG_OP <> 'INSERT' then
    raise exception 'Invalid signup trigger target';
  end if;
  -- Auth owns NEW.id. Signup can run before there is a session/auth.uid(), so
  -- use the inserted Auth identity, NEVER a UUID, role, or link from metadata.
  display_name := coalesce(nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(new.email, ''), 'New customer');
  insert into public.customers (name) values (display_name)
    returning id into linked_customer;
  insert into public.profiles (id, full_name, email, role, customer_id)
    values (new.id, display_name, new.email, 'customer', linked_customer);
  return new;
end;
$$;
alter function private.provision_auth_customer() owner to postgres;
revoke all on function private.provision_auth_customer() from public, anon, authenticated, service_role;
-- Replace the old profile-only trigger. Both inserts roll back if signup fails.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function private.provision_auth_customer();

-- Retain the old functions for schema compatibility but close their RPC grants.
revoke all on function public.handle_new_user(), public.handle_new_auth_user(), public.set_updated_at()
  from public, anon, authenticated, service_role;
alter function public.handle_new_user() set search_path = '';
alter function public.handle_new_auth_user() set search_path = '';
alter function public.set_updated_at() set search_path = '';

notify pgrst, 'reload schema';
commit;
