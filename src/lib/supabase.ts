import "server-only";
import type { Customer, Invoice } from "./credit";
import { createSessionClient } from "./supabase/server";

export class AuthenticationRequiredError extends Error {
  constructor() {
    super("Sign in is required to access credit data. Authentication UI is the next implementation step.");
    this.name = "AuthenticationRequiredError";
  }
}

type SessionClient = Awaited<ReturnType<typeof createSessionClient>>;
async function readTable<T>(client: SessionClient, table: "customers" | "invoices", columns: string): Promise<T[]> {
  const rows: T[] = [];
  let offset = 0;
  while (true) {
    // The SDK sends the user's verified session JWT. RLS derives access from
    // auth.uid(); no customer ID, role, or service-role credential is supplied.
    const { data, error, count } = await client.from(table)
      .select(columns, { count: "exact" })
      .order("id", { ascending: true })
      .range(offset, offset + 999)
      .abortSignal(AbortSignal.timeout(15000));
    if (error) throw new Error(`Unable to read ${table} (${error.code}).`);
    const batch = (data ?? []) as unknown as T[];
    rows.push(...batch);
    offset += batch.length;
    if (!batch.length || (count !== null && offset >= count)) break;
  }
  return rows;
}

export async function getCreditData() {
  const client = await createSessionClient();
  // getUser validates with Auth. Never authorize using a decoded cookie alone.
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) throw new AuthenticationRequiredError();
  const { data: profile, error: profileError } = await client.from("profiles")
    .select("id,role,customer_id").eq("id", user.id).single();
  if (profileError || !profile) throw new Error("The signed-in user has no accessible profile.");
  const [customers, invoices] = await Promise.all([
    readTable<Customer>(client, "customers", "id,customer_code,name,bank_ref_number,status"),
    readTable<Invoice>(client, "invoices", "id,customer_id,invoice_number,amount,issue_date,due_date,status"),
  ]);
  return { customers, invoices };
}
