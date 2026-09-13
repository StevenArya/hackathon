"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/src/lib/supabase/client";
import PaymentProofUpload from "@/app/components/payment-proof-upload";

type Profile = {
  id: string;
  full_name: string | null;
  role: "admin" | "customer";
  customer_id: string | null;
};

type Customer = {
  id: string;
  customer_code: string;
  name: string;
  status: "good" | "level_1" | "level_2" | "danger";
};

type Invoice = {
  id: string;
  invoice_number: string;
  amount: number;
  due_date: string | null;
  payment_type: "cash" | "credit" | "loan" | null;
  status: "unpaid" | "paid" | "overdue";
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function paymentStyle(paymentType: Invoice["payment_type"]) {
  switch (paymentType) {
    case "cash":
      return "bg-green-100 text-green-700";

    case "credit":
      return "bg-orange-100 text-orange-700";

    case "loan":
      return "bg-purple-100 text-purple-700";

    default:
      return "bg-yellow-50 text-stone-600";
  }
}

function riskStyle(status: Customer["status"]) {
  switch (status) {
    case "good":
      return "bg-green-100 text-green-700";

    case "level_1":
      return "bg-yellow-100 text-yellow-700";

    case "level_2":
      return "bg-orange-100 text-orange-700";

    case "danger":
      return "bg-red-100 text-red-700";
  }
}

export default function CustomerDashboard() {
  const router = useRouter();
  const supabase = createClient();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [visibleCount, setVisibleCount] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, role, customer_id")
        .eq("id", user.id)
        .single();

      if (profileError || !profileData) {
        setError("Unable to load your profile.");
        setLoading(false);
        return;
      }

      if (profileData.role === "admin") {
        router.replace("/admin/dashboard");
        return;
      }

      setProfile(profileData);

      if (!profileData.customer_id) {
        setError("Your account is not linked to a customer.");
        setLoading(false);
        return;
      }

      const { data: customerData, error: customerError } = await supabase
        .from("customers")
        .select("id, customer_code, name, status")
        .eq("id", profileData.customer_id)
        .single();

      if (customerError || !customerData) {
        setError("Unable to load customer information.");
        setLoading(false);
        return;
      }

      setCustomer(customerData);

      const { data: invoiceData, error: invoiceError } = await supabase
        .from("invoices")
        .select(
          "id, invoice_number, amount, due_date, payment_type, status"
        )
        .eq("customer_id", profileData.customer_id)
        .order("due_date", { ascending: true });

      if (invoiceError) {
        setError("Unable to load invoices.");
        setLoading(false);
        return;
      }

      setInvoices(invoiceData ?? []);
      setLoading(false);
    }

    loadDashboard();
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-yellow-50">
        <p className="text-stone-600">Loading...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-yellow-50 px-4">
        <div className="hover-card rounded-2xl border border-pink-100 bg-white p-8 shadow-sm">
          <p className="text-red-600">{error}</p>

          <button
            onClick={handleLogout}
            className="mt-5 rounded-xl bg-pink-200 px-4 py-2 text-stone-800"
          >
            Sign out
          </button>
        </div>
      </main>
    );
  }

  if (!customer) {
    return null;
  }

  const outstanding = invoices
    .filter((invoice) => invoice.status !== "paid")
    .reduce((total, invoice) => total + Number(invoice.amount), 0);

  const unpaidInvoices = invoices.filter(
    (invoice) => invoice.status !== "paid"
  ).length;

  return (
    <main className="min-h-screen bg-yellow-50">
      <header className="sticky top-0 z-20 border-b border-pink-100 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm font-bold text-pink-400">
              Customer Portal
            </p>

            <h1 className=" text-xl text-stone-800" style={{ fontFamily: "var(--font-heading), sans-serif", fontWeight: 400, lineHeight: 1.2 }}>
              {customer.name}
            </h1>
          </div>

          <button
            onClick={handleLogout}
            className="rounded-xl border border-pink-200 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-8 hover-card card p-6 shadow-sm ">
          <p className="text-sm ms-2 mt-5  text-stone-600">Welcome back</p>

          <h2 className=" text-3xl ms-2 mb-2  font-bold text-pink-300 uppercase" style={{ fontFamily: "var(--font-heading), sans-serif", fontWeight: 400, lineHeight: 1.2 }}>
            {profile?.full_name || customer.name}
          </h2>
        </div>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="hover-card rounded-2xl border border-pink-100 bg-white p-6 shadow-sm">
            <p className="text-sm text-stone-600">
              Customer ID
            </p>

            <p className="mt-2 text-xl font-bold text-stone-800">
              {customer.customer_code}
            </p>
          </div>

          <div className="hover-card rounded-2xl border border-pink-100 bg-white p-6 shadow-sm">
            <p className="text-sm text-stone-600">
              Outstanding
            </p>

            <p className="mt-2 text-xl font-bold text-stone-800">
              {formatCurrency(outstanding)}
            </p>
          </div>

          <div className="hover-card rounded-2xl border border-pink-100 bg-white p-6 shadow-sm">
            <p className="text-sm text-stone-600">
              Account status
            </p>

            <div className="mt-3">
              <span
                className={`rounded-full px-3 py-1 text-sm font-semibold ${riskStyle(
                  customer.status
                )}`}
              >
                {customer.status.replace("_", " ")}
              </span>
            </div>
          </div>
        </section>

        <section className="hover-card mt-4 rounded-2xl border border-pink-100 bg-white p-6 shadow-sm">
          <p className="text-sm font-bold text-pink-600">
            Unpaid invoices
          </p>

          <p className="mt-1 text-2xl font-bold text-stone-800">
            {unpaidInvoices}
          </p>
        </section>

        <section className="hover-card mt-8 rounded-2xl border border-pink-100 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h3 className="text-xl font-bold text-stone-800">
              Your invoices
            </h3>

            <p className="text-sm text-stone-600">
              View your current invoices, payment methods, and submit proof of payment.
            </p>
          </div>

          {invoices.length === 0 ? (
            <p className="text-sm text-stone-600">
              You currently have no invoices.
            </p>
          ) : (
            <div className="space-y-3">
              {invoices.slice(0, visibleCount).map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex flex-col justify-between gap-4 rounded-xl border border-pink-100 p-4 md:flex-row md:items-center"
                >
                  <div>
                    <p className="font-semibold text-stone-800">
                      {invoice.invoice_number}
                    </p>

                    <p className="mt-1 text-sm text-stone-600">
                      Due:{" "}
                      {invoice.due_date
                        ? new Date(
                            `${invoice.due_date}T00:00:00`
                          ).toLocaleDateString()
                        : "No due date"}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <p className="font-semibold text-stone-800">
                      {formatCurrency(Number(invoice.amount))}
                    </p>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${paymentStyle(
                        invoice.payment_type
                      )}`}
                    >
                      {invoice.payment_type || "Unknown"}
                    </span>

                    <span
                      className={`rounded-full px-3 py-1 text-sm font-semibold capitalize ${
                        invoice.status === "paid"
                          ? "bg-green-100 text-green-700"
                          : invoice.status === "overdue"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-50 text-stone-700"
                      }`}
                    >
                      {invoice.status}
                    </span>

                    <PaymentProofUpload invoice={invoice} />
                  </div>
                </div>
              ))}
              {invoices.length > visibleCount && <div className="flex justify-center pt-4"><button type="button" className="secondary-button" onClick={() => setVisibleCount(count => count + 10)}>Show more</button></div>}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
