import Dashboard from "@/app/components/dashboard";
import { getCreditData } from "@/src/lib/supabase";
export const dynamic = "force-dynamic";
export default async function Home() {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  try {
    const data = await getCreditData();
    return <Dashboard {...data} today={today} />;
  } catch {
    return <Dashboard customers={[]} invoices={[]} today={today} error="We couldn’t load your credit data. Check your Supabase connection and table access, then try again." />;
  }
}
