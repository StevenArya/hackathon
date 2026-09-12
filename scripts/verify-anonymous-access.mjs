// Read-only verification using the app's public key, never a service-role key.
// Run: node --env-file=.env.local scripts/verify-anonymous-access.mjs
import assert from 'node:assert/strict';
const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
assert(base && key, 'Supabase environment variables are required');
for (const table of ['customers', 'invoices', 'payments', 'profiles']) {
  const response = await fetch(`${base}/rest/v1/${table}?select=*&limit=1`, {
    headers: { apikey: key }, signal: AbortSignal.timeout(15000),
  });
  const body = await response.json();
  assert([401, 403].includes(response.status) && body.code === '42501', `${table}: expected permission denied, got HTTP ${response.status}`);
  console.log(`PASS anonymous ${table}: HTTP ${response.status}, permission denied`);
}
const privateResponse = await fetch(`${base}/rest/v1/rpc/is_admin`, {
  method: 'POST', headers: { apikey: key, 'Content-Type': 'application/json', 'Content-Profile': 'private' }, body: '{}',
  signal: AbortSignal.timeout(15000),
});
const privateBody = await privateResponse.json();
assert(privateResponse.status === 406 && privateBody.code === 'PGRST106', 'Private helper schema must not be exposed through the Data API');
console.log('PASS private authorization helpers are not exposed through the Data API');
