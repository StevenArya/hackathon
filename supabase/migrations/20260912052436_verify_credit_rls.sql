-- Run as a trusted SQL operator in ONE call. All fixtures/role changes roll back.
-- Sequence values consumed by tests are intentionally never reused.
begin;
savepoint verification_fixtures;
set local statement_timeout = '30s';
create temporary table rls_test_context as select
  gen_random_uuid() a_user, gen_random_uuid() b_user, gen_random_uuid() admin_user, gen_random_uuid() unlinked_user;
grant select on rls_test_context to authenticated, anon;
create function pg_temp.assert_true(ok boolean, description text)
returns void language plpgsql as $$ begin
  if ok is distinct from true then raise exception 'FAIL: %', description; end if;
end; $$;
create function pg_temp.expect_denied(statement text)
returns void language plpgsql as $$ begin
  begin execute statement;
  exception when insufficient_privilege then return; end;
  raise exception 'FAIL: expected permission denied for %', statement;
end; $$;

-- Auth supplies the UUID. Hostile signup metadata must never control role/link.
insert into auth.users (id,email,aud,role,raw_user_meta_data)
select a_user,a_user::text||'@rls-test.invalid','authenticated','authenticated',
jsonb_build_object('full_name','RLS test A','role','admin','customer_id',(select id from public.customers limit 1)) from rls_test_context
union all select b_user,b_user::text||'@rls-test.invalid','authenticated','authenticated','{"full_name":"RLS test B"}'::jsonb from rls_test_context
union all select admin_user,admin_user::text||'@rls-test.invalid','authenticated','authenticated','{}'::jsonb from rls_test_context
union all select unlinked_user,unlinked_user::text||'@rls-test.invalid','authenticated','authenticated','{}'::jsonb from rls_test_context;
select pg_temp.assert_true((select count(*)=4 from public.profiles p,rls_test_context t where p.id in (t.a_user,t.b_user,t.admin_user,t.unlinked_user) and p.role='customer' and p.customer_id is not null),'signup creates linked customer profiles, ignores supplied admin role');
select pg_temp.assert_true((select count(distinct c.customer_code)=4 and bool_and(c.customer_code ~ '^CUST-[0-9]{4,}$') from public.customers c join public.profiles p on p.customer_id=c.id cross join rls_test_context t where p.id in (t.a_user,t.b_user,t.admin_user,t.unlinked_user)),'unique database-generated codes');
-- Trusted SQL operator promotion only; rolled back after assertions.
update public.profiles set role='admin' where id=(select admin_user from rls_test_context);
update public.profiles set customer_id=null where id=(select unlinked_user from rls_test_context);
create temporary table rls_test_links as select t.*,pa.customer_id a_customer,pb.customer_id b_customer,gen_random_uuid() a_invoice,gen_random_uuid() b_invoice from rls_test_context t join public.profiles pa on pa.id=t.a_user join public.profiles pb on pb.id=t.b_user;
grant select on rls_test_links to authenticated,anon;
insert into public.invoices (id,customer_id,invoice_number,amount,due_date)
select a_invoice,a_customer,'RLS-TEST-'||a_invoice::text,100,current_date from rls_test_links
union all select b_invoice,b_customer,'RLS-TEST-'||b_invoice::text,200,current_date from rls_test_links;
insert into public.payments (invoice_id,amount) select a_invoice,10 from rls_test_links union all select b_invoice,20 from rls_test_links;
create temporary table rls_test_totals as select (select count(*) from public.customers) customers,(select count(*) from public.invoices) invoices,(select count(*) from public.payments) payments;
grant select on rls_test_totals to authenticated;

set local role anon;
select pg_temp.expect_denied('select * from public.customers');
select pg_temp.expect_denied('select * from public.invoices');
select pg_temp.expect_denied('select * from public.payments');
select pg_temp.expect_denied('select * from public.profiles');
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',a_user,'role','authenticated','user_metadata',jsonb_build_object('role','admin'),'app_metadata',jsonb_build_object('role','admin'))::text,true) from rls_test_context;
set local role authenticated;
select pg_temp.assert_true(auth.uid()=(select a_user from rls_test_context),'auth.uid identity');
select pg_temp.assert_true(not private.is_admin(),'metadata cannot authorize admin');
select pg_temp.assert_true((select count(*)=1 from public.profiles),'own profile only');
select pg_temp.assert_true((select count(*)=1 from public.customers),'own customer only');
select pg_temp.assert_true((select count(*)=1 from public.invoices),'own invoice only');
select pg_temp.assert_true((select count(*)=1 from public.payments),'own payment only');
select pg_temp.assert_true((select count(*)=0 from public.customers where id=(select b_customer from rls_test_links)),'tampered customer ID');
select pg_temp.assert_true((select count(*)=0 from public.invoices where customer_id=(select b_customer from rls_test_links)),'tampered invoice filter');
select pg_temp.assert_true((select count(*)=0 from public.payments where invoice_id=(select b_invoice from rls_test_links)),'tampered payment filter');
select pg_temp.assert_true((select count(*)=0 from public.profiles where id=(select b_user from rls_test_context)),'tampered profile ID');
select pg_temp.expect_denied('update public.profiles set role=''admin'' where id=auth.uid()');
select pg_temp.expect_denied('update public.profiles set customer_id=(select b_customer from rls_test_links) where id=auth.uid()');
select pg_temp.expect_denied('insert into public.profiles (id,role) values (auth.uid(),''admin'')');
select pg_temp.expect_denied('insert into public.customers (name) values (''Unauthorized'')');
select pg_temp.expect_denied('insert into public.invoices (customer_id,invoice_number,amount) select a_customer,''Unauthorized'',1 from rls_test_links');
select pg_temp.expect_denied('insert into public.payments (invoice_id,amount) select a_invoice,1 from rls_test_links');
select pg_temp.expect_denied('delete from public.customers where id=(select a_customer from rls_test_links)');
select pg_temp.expect_denied('truncate public.profiles');
select pg_temp.expect_denied('select nextval(''private.customer_code_seq'')');
with changed as (update public.customers set name='Unauthorized' where id=(select a_customer from rls_test_links) returning id) select pg_temp.assert_true((select count(*)=0 from changed),'no customer updates');
with changed as (update public.invoices set amount=0 where id in (select a_invoice from rls_test_links union all select b_invoice from rls_test_links) returning id) select pg_temp.assert_true((select count(*)=0 from changed),'no invoice updates');
reset role;

select set_config('request.jwt.claims',jsonb_build_object('sub',b_user,'role','authenticated')::text,true) from rls_test_context;
set local role authenticated;
select pg_temp.assert_true((select count(*)=1 and bool_and(id=(select b_customer from rls_test_links)) from public.customers),'customer B isolation');
select pg_temp.assert_true((select count(*)=1 and bool_and(id=(select b_invoice from rls_test_links)) from public.invoices),'customer B invoices');
select pg_temp.assert_true((select count(*)=1 and bool_and(invoice_id=(select b_invoice from rls_test_links)) from public.payments),'customer B payments');
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',unlinked_user,'role','authenticated')::text,true) from rls_test_context;
set local role authenticated;
select pg_temp.assert_true((select count(*)=0 from public.customers) and (select count(*)=0 from public.invoices) and (select count(*)=0 from public.payments),'unlinked user fails closed');
reset role;
select set_config('request.jwt.claims','{"role":"authenticated"}',true);
set local role authenticated;
select pg_temp.assert_true((select count(*)=0 from public.profiles) and (select count(*)=0 from public.customers) and not private.is_admin(),'missing auth.uid fails closed');
reset role;

select set_config('request.jwt.claims',jsonb_build_object('sub',admin_user,'role','authenticated')::text,true) from rls_test_context;
set local role authenticated;
select pg_temp.assert_true(private.is_admin(),'stored admin role authorizes');
select pg_temp.assert_true((select count(*) from public.customers)=(select customers from rls_test_totals),'admin reads all customers');
select pg_temp.assert_true((select count(*) from public.invoices)=(select invoices from rls_test_totals),'admin reads all invoices');
select pg_temp.assert_true((select count(*) from public.payments)=(select payments from rls_test_totals),'admin reads all payments');
-- Exact existing dashboard projections and pagination.
select id,customer_code,name,bank_ref_number,status from public.customers order by id limit 1000 offset 0;
select id,customer_id,invoice_number,amount,issue_date,due_date,status from public.invoices order by id limit 1000 offset 0;
insert into public.customers (name,customer_code) values ('RLS admin created','IGNORED-FRONTEND-CODE');
select pg_temp.assert_true((select customer_code ~ '^CUST-[0-9]{4,}$' from public.customers where name='RLS admin created'),'frontend cannot select code');
with changed as (update public.customers set name='RLS admin updated' where id=(select b_customer from rls_test_links) returning id) select pg_temp.assert_true((select count(*)=1 from changed),'admin updates customers');
insert into public.invoices (customer_id,invoice_number,amount) select a_customer,'RLS-ADMIN-'||gen_random_uuid()::text,300 from rls_test_links;
with changed as (update public.invoices set amount=250 where id=(select b_invoice from rls_test_links) returning id) select pg_temp.assert_true((select count(*)=1 from changed),'admin updates invoices');
select pg_temp.expect_denied('update public.profiles set role=''admin'' where id=(select a_user from rls_test_context)');
select pg_temp.expect_denied('delete from public.invoices where id=(select a_invoice from rls_test_links)');
select pg_temp.expect_denied('update public.payments set amount=1 where invoice_id=(select a_invoice from rls_test_links)');
reset role;
update public.profiles set role='customer' where id=(select admin_user from rls_test_context);
set local role authenticated;
select pg_temp.assert_true(not private.is_admin(),'admin revocation immediate');
reset role;
select 'PASS: anonymous denial, two-customer isolation, ID tampering, signup provisioning, metadata spoofing, privilege escalation, least-privilege writes, admin queries, immediate revocation' as result;
rollback;
