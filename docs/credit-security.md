# Credit database security

Applied to the existing Supabase project `zkluzjtinbusxyfvgxhi` on 12 September 2026. No UI redesign, data deletion, or service-role key is involved.

## Applied migrations

- `20260912052058_secure_credit_rls.sql`: enables and forces RLS on customers, invoices, payments, and profiles; replaces grants/policies; installs private authorization helpers and signup/customer-code triggers.
- `20260912052436_verify_credit_rls.sql`: runs permission/provisioning assertions with temporary Auth/customer/invoice/payment records, then rolls back the test transaction. The successful verification is recorded in migration history. Sequence allocations are intentionally not rolled back.

These are additive migrations for the existing schema. The four older migrations already exist remotely but were not present in this checkout. Before setting up a new database or using `supabase db push/reset`, sync that existing migration history; these two files alone are not an empty-database bootstrap. Do not reapply the security migration to the live project.

## Access rules

| Table | Customer | Admin |
| --- | --- | --- |
| profiles | SELECT own `id = auth.uid()` | SELECT own profile |
| customers | SELECT linked `profiles.customer_id` | SELECT, INSERT, UPDATE all |
| invoices | SELECT linked customer's invoices | SELECT, INSERT, UPDATE all |
| payments | SELECT payments of own invoices | SELECT all |

Anonymous users have no table privileges. No application role can delete, truncate, write payments, or write profiles. This also prevents changing `role`, `id`, and `customer_id`, including by upsert. Admin role changes require a trusted database operator, not the ordinary application API.

Policies:
- `profiles_read_self`
- `customers_read_authorized`, `customers_insert_admin`, `customers_update_admin`
- `invoices_read_authorized`, `invoices_insert_admin`, `invoices_update_admin`
- `payments_read_authorized`

`private.is_admin()` and `private.current_customer_id()` are parameterless SECURITY DEFINER lookups owned by postgres, with a fixed empty search path. Both check only the calling `auth.uid()` against the stored profile. They do not trust JWT metadata, frontend IDs, emails, or customer codes. The profile SELECT policy uses `auth.uid()` directly, so it does not recursively query profiles. Updating a stored role takes effect on the next database statement, without waiting for JWT renewal.

`private` is not exposed through the Data API (verified by HTTP). Only authenticated callers can execute the two identity helpers. Trigger functions and the sequence cannot be invoked by application roles. Old public trigger functions remain for compatibility, but direct execution grants were revoked and search paths fixed. Existing FK/unique indexes already cover the policy lookups.

## Signup provisioning

Supabase Auth generates `auth.users.id`. Its AFTER INSERT trigger atomically:
1. Inserts a new customer (name uses display-only full_name metadata, then email, then a fallback).
2. Generates `customer_code` inside PostgreSQL.
3. Inserts a profile with the Auth UUID, literal `role = 'customer'`, and that new customer's ID.

The profile needs the new customer's ID for its foreign key, so the physical insert order is customer then profile within the same transaction. The ownership model remains Auth user → profile → customer → invoices → payments.

A supplied role, customer_id, or customer_code in signup metadata is ignored. Failure of either insert rolls back the signup. The trigger uses the Auth-owned NEW.id because a signup may not yet have an authenticated session; all subsequent authorization uses auth.uid().

The sequence was initialized above the existing numeric customer-code suffixes while holding a write lock. Existing `CUST-001`, `CUST-002`, and `CUST-003` were preserved. New codes have at least four digits (`CUST-0004`, etc.), grow beyond 9999 without truncation, and are immutable. Every customer INSERT generates its code, even if an admin supplies one. PostgreSQL nextval is concurrency-safe; gaps after failures/tests are expected. Never reset this sequence backward and never generate codes from row count.

Existing customer records are NOT automatically claimed by new signups based on a name, email, code, or frontend ID. Linking an account to an existing customer must be a trusted operator workflow, with the existing unique profile/customer link enforced. Do not delete old customer records as part of linking: existing foreign keys cascade invoice/payment deletion.

## Application integration

The server creates an `@supabase/ssr` client per request using the existing public URL/key and session cookies. `getUser()` validates identity with Supabase Auth before dashboard reads. The SDK carries the user's JWT to PostgREST; RLS controls rows. There is no privileged fallback and no shared user-data cache.

`proxy.ts` refreshes/verifies session cookies for the existing `/` route and marks responses private/no-store. The page remains dynamic. When adding auth routes, extend the proxy matcher and implement the normal Supabase cookie/callback flow. No sign-in UI is added here.

The dashboard's customer/invoice projections, pagination, and ordering passed SQL tests under an admin identity. A customer gets only their own records. Signed-out visitors receive the existing error presentation with a sign-in-required message and no private data. A real browser sign-in flow remains to be implemented and tested next.

## Verification

- All four tables: RLS enabled and forced.
- Real anonymous HTTP requests: HTTP 401 / PostgreSQL 42501 for all four tables.
- Private-schema RPC request: HTTP 406 / PGRST106 (schema not exposed).
- PostgreSQL transaction tests: two-customer isolation, ID tampering, role/link write denial, malicious signup metadata, generated codes, missing/unlinked identity, restricted writes/deletes/truncate/sequence access, admin CRUD permissions, exact dashboard projections, and immediate admin demotion.
- Existing customer/invoice/payment/profile data hashes match before/after. No test Auth users or profiles remain.
- Supabase security advisor: no findings.
- Performance advisor: one informational [unused pre-existing due-date index](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index); retained for upcoming due-date queries.

Repeat anonymous tests:
```powershell
node --env-file=.env.local scripts/verify-anonymous-access.mjs
```

Repeat transactional tests from Supabase SQL Editor as a trusted operator by running the entire `supabase/tests/credit_rls.sql` file in one call. Or after CLI login/linking:
```powershell
supabase db query --linked --file supabase/tests/credit_rls.sql
```
The connector's execute_sql tool is read-only and cannot create test fixtures; this is why the initial tests were run as a recorded verification migration. All test data is rolled back, but test code allocations leave harmless sequence gaps.

## Manual Supabase configuration

RLS and provisioning are already installed; no SQL needs copying to enable them. No accounts existed at implementation time.

1. Create the intended first administrator through Supabase Authentication (or the future signup flow). It initially receives a normal customer profile, like every signup.
2. Verify that person's Auth UUID, then run this ONLY in Supabase SQL Editor as the trusted project operator:
```sql
update public.profiles
set role = 'admin'
where id = '<verified-auth-user-uuid>'::uuid
returning id, role;
```
3. Keep `private` out of exposed schemas. It is already unexposed; no change is needed.
4. Before shipping auth UI, configure the Site URL and allowed callback URLs, email confirmation, and production email delivery. Use the publishable key for the app; never add a service-role/secret key to NEXT_PUBLIC variables.

Next: implement login/signup/logout and callback/session handling, route users by their stored profile role, provide customer and admin navigation, and add end-to-end tests with real signed-in sessions. Any later profile-editing or payment-writing feature needs deliberately scoped policies/grants first.

