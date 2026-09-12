import Dashboard from "@/app/components/dashboard";
import {
  AuthenticationRequiredError,
  getCreditData,
} from "@/src/lib/supabase";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const result = await getCreditData()
    .then((data) => ({
      ...data,
      error: undefined as string | undefined,
    }))
    .catch((error: unknown) => ({
      customers: [],
      invoices: [],
      error:
        error instanceof AuthenticationRequiredError
          ? error.message
          : "We couldn’t load your credit data. Check your Supabase connection and table access, then try again.",
    }));

  return <Dashboard {...result} today={today} />;
}