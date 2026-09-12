"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";

import {
  currency,
  isOverdue,
  statusLabel,
  sum,
  summarize,
  type Customer,
  type Invoice,
} from "@/src/lib/credit";

import { Sidebar, MetricCard, type Section } from "./sidebar";
import { Icon } from "./ui-icon";
import { ReceivablesChart } from "./receivables-chart";
import { ActivityFeed } from "./activity-feed";
import { AIInsightCard } from "./ai-insight-card";
import AddCustomerModal from "./add-customer-modal";
import AddInvoiceModal from "./add-invoice-modal";
import AIChat from "./ai-chat";
import InvoiceScannerModal from "./invoice-scanner-modal";

type DashboardProps = {
  customers: Customer[];
  invoices: Invoice[];
  today: string;
  error?: string;
};

export default function Dashboard({
  customers,
  invoices,
  today,
  error,
}: DashboardProps) {
  const [active, setActive] = useState<Section>("Dashboard");
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  const [addInvoiceOpen, setAddInvoiceOpen] = useState(false);
  const [invoiceScannerOpen, setInvoiceScannerOpen] = useState(false);
  const [notifications, setNotifications] = useState(false);

  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(10);
  const [pending, startTransition] = useTransition();

  const router = useRouter();

  const data = summarize(customers, invoices, today);

  const ask = () => {
    setActive("AI Assistant");
  };

  const titles: Record<Section, string> = {
    Dashboard: "Credit Overview",
    Customers: "Customers",
    Invoices: "Invoices",
    Documents: "Documents",
    "AI Assistant": "AI Assistant",
    Settings: "Settings",
  };

  const subtitles: Record<Section, string> = {
    Dashboard:
      "A clear picture of your receivables. A smarter way forward.",
    Customers:
      "Know your customers. Stay ahead of credit risk.",
    Invoices:
      "Every invoice, every balance, in one place.",
    Documents:
      "A home for your credit documentation.",
    "AI Assistant":
      "Make your next decision with a clearer view of your credit.",
    Settings:
      "Your workspace and data connection.",
  };

  const filteredCustomers = customers.filter((customer) =>
    `${customer.name} ${customer.customer_code}`
      .toLowerCase()
      .includes(query.toLowerCase())
  );

  const filteredInvoices = invoices.filter((invoice) => {
    const customerName =
      customers.find(
        (customer) => customer.id === invoice.customer_id
      )?.name ?? "";

    return `${invoice.invoice_number} ${customerName}`
      .toLowerCase()
      .includes(query.toLowerCase());
  });

  return (
    <div className="min-h-screen">
      <Sidebar
        active={active}
        connected={!error}
        onNavigate={(section) => {
          setActive(section); setVisibleCount(10);
          setQuery("");
        }}
      />

      <div className="main-shell">
        {/* Topbar */}
        <div className="topbar">
          <div className="flex items-center gap-3 text-sm text-stone-500">
            <span className="text-[1.05em] font-semibold">Workspace</span>

            <Icon
              name="chevron"
              className="!h-3 !w-3"
            />

            <span className="text-stone-600 text-[1.05em] font-semibold">
              {active}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden text-base text-stone-500 sm:block font-semibold">
              Credit management
            </span>

            <span className="ml-3 flex h-10 w-10 items-center justify-center rounded-full bg-yellow-50 text-base  text-stone-600 font-semibold">
              CI
            </span>
          </div>
        </div>

        <main className="content">
          {/* Page Header */}
          <header className="mb-7 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="mb-2 flex items-center gap-2 text-[10px] font-medium tracking-[.14em] text-stone-500">
                <span className="h-3 w-3 rounded-full bg-pink-300" />
                WELCOME TO InVora.
              </div>

              <h1 className="text-[27px] font-semibold tracking-tight sm:text-[30px]">
                {titles[active]}
              </h1>

              <p className="mt-1.5 text-xs text-stone-600">
                {subtitles[active]}
              </p>
            </div>

            <div className="relative flex items-center gap-3">
              {/* Notifications */}
              <button
                className="icon-button relative"
                aria-label="Notifications"
                aria-expanded={notifications}
                onClick={() =>
                  setNotifications(!notifications)
                }
              >
                <Icon name="bell" />

                {data.overdue.length > 0 && (
                  <span className="absolute right-2 top-1.5 h-1.5 w-1.5 rounded-full border border-white bg-pink-300" />
                )}
              </button>

              {/* AI Assistant */}
              <button
                className="primary-button"
                onClick={ask}
              >
                <Icon
                  name="sparkles"
                  className="!h-4 !w-4"
                />

                AI Assistant
              </button>

              {/* Notification Panel */}
              {notifications && createPortal(
                <dialog
                  ref={node => { if (node && !node.open) node.showModal(); }}
                  onCancel={() => setNotifications(false)}
                  className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-sm overflow-y-auto rounded-2xl border border-pink-200 bg-white p-6 text-stone-700 shadow-xl shadow-pink-200/50 backdrop:bg-black/30"
                  aria-label="Notifications"
                >
                  <div className="flex justify-between">
                    <h2 className="text-sm font-semibold">
                      Notifications
                    </h2>

                    <button
                      className="icon-button" aria-label="Close notifications"
                      onClick={() =>
                        setNotifications(false)
                      }
                    >
                      <Icon
                        name="close"
                        className="!h-4 !w-4"
                      />
                    </button>
                  </div>

                  <p className="mt-3 text-xs leading-6 text-stone-600">
                    {error
                      ? "Your data connection needs attention."
                      : `${data.overdue.length} overdue invoices and ${data.dueSoon.length} invoices due in the next 7 days.`}
                  </p>

                  <button
                    className="secondary-button mt-4 min-h-11 text-sm text-pink-800"
                    onClick={() => {
                      setActive("Invoices");
                      setNotifications(false);
                    }}
                  >
                    Review invoices →
                  </button>
                </dialog>, document.body
              )}
            </div>
          </header>

          {/* Connection Error */}
          {error && (
            <div
              role="alert"
              className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800"
            >
              <p>{error}</p>

              <button
                className="secondary-button"
                disabled={pending}
                onClick={() =>
                  startTransition(() =>
                    router.refresh()
                  )
                }
              >
                {pending
                  ? "Connecting…"
                  : "Try again"}
              </button>
            </div>
          )}

          {/* Dashboard */}
          {active === "Dashboard" && (
            <>
              <div className="mb-4 flex items-center justify-between">
                

                <span className="text-sm text-stone-500 font-semibold">
                  As of{" "}
                  {new Date(
                    `${today}T00:00:00Z`
                  ).toLocaleDateString(
                    "en-GB",
                    {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      timeZone: "UTC",
                    }
                  )}{" "}
                  · IDR
                </span>
              </div>

              <section className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  title="Total Outstanding"
                  value={currency(data.total)}
                  detail={`${data.outstanding.length} unpaid invoices`}
                  icon="wallet"
                  unavailable={!!error}
                />

                <MetricCard
                  title="Overdue Amount"
                  value={currency(
                    data.totalOverdue
                  )}
                  detail={`${data.overdue.length} invoices need follow-up`}
                  icon="alert"
                  tone="red"
                  unavailable={!!error}
                />

                <MetricCard
                  title="Due Soon"
                  value={currency(
                    sum(data.dueSoon)
                  )}
                  detail={`${data.dueSoon.length} invoices · next 7 days`}
                  icon="clock"
                  tone="amber"
                  unavailable={!!error}
                />

                <MetricCard
                  title="Total Customers"
                  value={String(
                    customers.length
                  )}
                  detail={`${data.attention.length} requiring attention`}
                  icon="users"
                  tone="violet"
                  unavailable={!!error}
                />
              </section>

              <ReceivablesChart
                invoices={invoices}
                today={today}
                unavailable={!!error}
              />

              <div className="mt-5 grid gap-5 lg:grid-cols-[1.25fr_1fr]">
                <section className="card overflow-hidden">
                  <div className="flex items-center justify-between border-b border-pink-100 px-6 py-5">
                    <div>
                      <h2 className="section-title">
                        Activity Feed
                      </h2>

                      <p className="mt-1 text-[11px] text-stone-500">
                        Current invoice and
                        customer signals
                      </p>
                    </div>
                  </div>

                  <ActivityFeed
                    customers={customers}
                    invoices={invoices}
                    today={today}

                    unavailable={!!error}
                  />

                  <p className="border-t border-pink-100 px-6 py-3 text-[10px] text-stone-500">
                    Based on current records;
                    payment and risk change
                    times are not available.
                  </p>
                </section>

                <AIInsightCard
                  customers={customers}
                  invoices={invoices}
                  today={today}
                  onAsk={ask}
                  unavailable={!!error}
                />
              </div>
            </>
          )}

          {/* Customers / Invoices */}
          {(active === "Customers" ||
            active === "Invoices") && (
            <section className="card overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-pink-100 p-5">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="section-title">
                    {active === "Customers"
                      ? "Customer Risk Overview"
                      : "Invoice Register"}
                  </h2>

                  {/* Add Customer Button */}
                  {active === "Customers" && (
                    <button
                      onClick={() => setAddCustomerOpen(true)}
                      className="primary-button"
                    >
                      <span className="text-base leading-none font-semibold"></span>
                      Add Customer
                    </button>
                  )}

                  {/* Invoice Actions */}
                  {active === "Invoices" && (
                    <>
                      <button
                        onClick={() => setInvoiceScannerOpen(true)}
                        className="secondary-button"
                      >
                        <span className="text-base leading-none font-semibold"> </span>
                        Scan Invoice
                      </button>

                      <button
                        onClick={() => setAddInvoiceOpen(true)}
                        className="primary-button"
                      >
                        <span className="text-base leading-none font-semibold"> </span>
                        Add Invoice
                      </button>
                    </>
                  )}
                </div>

                {/* Search */}
                <label className="flex items-center gap-2 rounded-md border border-pink-100 px-3 py-2 text-stone-500">
                  <Icon
                    name="search"
                    className="!h-4 !w-4"
                  />

                  <input
                    aria-label={`Search ${active.toLowerCase()}`}
                    value={query}
                    onChange={(event) => { setQuery(event.target.value); setVisibleCount(10); }}
                    placeholder={`Search ${active.toLowerCase()}…`}
                    className="w-44 text-xs text-stone-700 outline-none"
                  />
                </label>
              </div>

              <div className="overflow-x-auto">
                <table>
                  <thead>
                    <tr>
                      {(active === "Customers"
                        ? [
                            "Customer",
                            "Customer ID",
                            "Bank Reference",
                            "Outstanding",
                            "Risk status",
                          ]
                        : [
                            "Invoice",
                            "Customer",
                            "Due date",
                            "Amount",
                            "Status",
                          ]
                      ).map((heading) => (
                        <th key={heading}>
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {active ===
                    "Customers"
                      ? filteredCustomers.slice(0, visibleCount).map(
                          (
                            customer
                          ) => (
                            <tr
                              key={
                                customer.id
                              }
                            >
                              <td className="font-medium">
                                {
                                  customer.name
                                }
                              </td>

                              <td>
                                {
                                  customer.customer_code
                                }
                              </td>

                              <td>
                                {customer.bank_ref_number ??
                                  "—"}
                              </td>

                              <td>
                                {currency(
                                  sum(
                                    data.outstanding.filter(
                                      (
                                        invoice
                                      ) =>
                                        invoice.customer_id ===
                                        customer.id
                                    )
                                  )
                                )}
                              </td>

                              <td>
                                <span
                                  className={`status-badge tone-${
                                    customer.status ===
                                    "good"
                                      ? "green"
                                      : customer.status ===
                                          "danger"
                                        ? "red"
                                        : "amber"
                                  }`}
                                >
                                  {
                                    statusLabel[
                                      customer
                                        .status
                                    ]
                                  }
                                </span>
                              </td>
                            </tr>
                          )
                        )
                      : filteredInvoices.slice(0, visibleCount).map(
                          (invoice) => {
                            const customer =
                              customers.find(
                                (
                                  item
                                ) =>
                                  item.id ===
                                  invoice.customer_id
                              );

                            return (
                              <tr
                                key={
                                  invoice.id
                                }
                              >
                                <td className="font-medium">
                                  {
                                    invoice.invoice_number
                                  }
                                </td>

                                <td>
                                  {customer?.name ??
                                    "Unknown customer"}
                                </td>

                                <td>
                                  {invoice.due_date ??
                                    "Not set"}
                                </td>

                                <td>
                                  {currency(
                                    Number(
                                      invoice.amount
                                    )
                                  )}
                                </td>

                                <td>
                                  <span
                                    className={`status-badge tone-${
                                      invoice.status ===
                                      "paid"
                                        ? "green"
                                        : isOverdue(
                                              invoice,
                                              today
                                            )
                                          ? "red"
                                          : "amber"
                                    }`}
                                  >
                                    {invoice.status ===
                                    "paid"
                                      ? "Paid"
                                      : isOverdue(
                                            invoice,
                                            today
                                          )
                                        ? "Overdue"
                                        : "Unpaid"}
                                  </span>
                                </td>
                              </tr>
                            );
                          }
                        )}
                  </tbody>
                </table>
              </div>

              {!error && (active === "Customers" ? filteredCustomers.length : filteredInvoices.length) > visibleCount && <div className="flex justify-center border-t border-pink-100 p-4"><button type="button" className="secondary-button" onClick={() => setVisibleCount(count => count + 10)}>Show more</button></div>}
              {/* Empty State */}
              {(error ||
                (active === "Customers"
                  ? filteredCustomers.length ===
                    0
                  : filteredInvoices.length ===
                    0)) && (
                <p className="p-10 text-center text-sm text-stone-500">
                  {error
                    ? "Data unavailable"
                    : "No matching records."}
                </p>
              )}
            </section>
          )}

          {/* AI Assistant */}
          {active === "AI Assistant" && (
            <div className="mx-auto max-w-5xl">
              <AIChat />
            </div>
          )}

          {/* Documents */}
          {active === "Documents" && (
            <section className="card px-6 py-20 text-center">
              <Icon
                name="folder"
                className="mx-auto !h-10 !w-10 text-pink-300"
              />

              <h2 className="mt-5 text-lg font-semibold">
                Your documents, together
              </h2>

              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-stone-600">
                Document management isn’t
                connected yet. Your existing
                customer and invoice records
                are available in their
                respective tabs.
              </p>

              <button
                onClick={() =>
                  setActive("Invoices")
                }
                className="secondary-button mx-auto mt-6"
              >
                View invoices

                <Icon
                  name="arrow"
                  className="!h-4 !w-4"
                />
              </button>
            </section>
          )}

          {/* Settings */}
          {active === "Settings" && (
            <section className="card max-w-2xl p-6">
              <h2 className="section-title">
                Workspace settings
              </h2>

              <dl className="insight-stats">
                <div>
                  <dt>Data source</dt>
                  <dd>Supabase</dd>
                </div>

                <div>
                  <dt>Connection</dt>
                  <dd>
                    {error
                      ? "Unavailable"
                      : "Connected"}
                  </dd>
                </div>

                <div>
                  <dt>Currency</dt>
                  <dd>
                    Indonesian rupiah (IDR)
                  </dd>
                </div>

                <div>
                  <dt>Due-date timezone</dt>
                  <dd>Asia/Jakarta</dd>
                </div>

                <div>
                  <dt>
                    Voice input & responses
                  </dt>
                  <dd>Coming soon</dd>
                </div>
              </dl>

              <button
                className="secondary-button"
                disabled={pending}
                onClick={() =>
                  startTransition(() =>
                    router.refresh()
                  )
                }
              >
                <Icon
                  name="refresh"
                  className="!h-4 !w-4"
                />

                {pending
                  ? "Refreshing…"
                  : "Refresh connection"}
              </button>
            </section>
          )}

          {/* Footer */}
          <footer className="mt-7 flex flex-wrap items-center justify-between gap-2 text-[10px] text-stone-500">
        

            <span className="flex items-center gap-1.5 text-[1.05em] font-semibold">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  error
                    ? "bg-amber-400"
                    : "bg-emerald-400"
                }`}
              />

              {error
                ? "Data unavailable"
                : "Live Supabase data"}
            </span>
          </footer>
        </main>
      </div>

      {/* Add Customer Modal */}
      <AddCustomerModal
        open={addCustomerOpen}
        onClose={() => setAddCustomerOpen(false)}
      />

      {/* Add Invoice Modal */}
      <AddInvoiceModal
        open={addInvoiceOpen}
        onClose={() => setAddInvoiceOpen(false)}
        customers={customers}
      />

      {/* Invoice Scanner Modal */}
      <InvoiceScannerModal
        open={invoiceScannerOpen}
        onClose={() => setInvoiceScannerOpen(false)}
        onSaved={() => router.refresh()}
      />
    </div>
  );
}