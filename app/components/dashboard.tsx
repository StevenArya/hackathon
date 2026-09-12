"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

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
import { AIInsightCard, Assistant } from "./ai-insight-card";
import AddCustomerModal from "./add-customer-modal";
import AddInvoiceModal from "./add-invoice-modal";

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
  const [notifications, setNotifications] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState("");
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
          setActive(section);
          setQuery("");
        }}
      />

      <div className="main-shell">
        {/* Topbar */}
        <div className="topbar">
          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            <span>Workspace</span>

            <Icon
              name="chevron"
              className="!h-3 !w-3"
            />

            <span className="text-slate-600">
              {active}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden text-[11px] text-slate-400 sm:block">
              Credit management
            </span>

            <span className="ml-3 flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600">
              CI
            </span>
          </div>
        </div>

        <main className="content">
          {/* Page Header */}
          <header className="mb-7 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="mb-2 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[.14em] text-slate-400">
                <span className="h-1 w-1 rounded-full bg-blue-500" />
                Your business at a glance
              </div>

              <h1 className="text-[27px] font-semibold tracking-tight sm:text-[30px]">
                {titles[active]}
              </h1>

              <p className="mt-1.5 text-xs text-slate-500">
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
                  <span className="absolute right-2 top-1.5 h-1.5 w-1.5 rounded-full border border-white bg-blue-500" />
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
              {notifications && (
                <div
                  className="notification-panel"
                  role="region"
                  aria-label="Notifications"
                >
                  <div className="flex justify-between">
                    <h2 className="text-sm font-semibold">
                      Notifications
                    </h2>

                    <button
                      aria-label="Close notifications"
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

                  <p className="mt-3 text-xs leading-6 text-slate-500">
                    {error
                      ? "Your data connection needs attention."
                      : `${data.overdue.length} overdue invoices and ${data.dueSoon.length} invoices due in the next 7 days.`}
                  </p>

                  <button
                    className="mt-3 text-xs text-blue-600"
                    onClick={() => {
                      setActive("Invoices");
                      setNotifications(false);
                    }}
                  >
                    Review invoices →
                  </button>
                </div>
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
                <h2 className="text-xs font-medium text-slate-600">
                  Portfolio snapshot
                </h2>

                <span className="text-[10px] text-slate-400">
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
                  <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
                    <div>
                      <h2 className="section-title">
                        Activity Feed
                      </h2>

                      <p className="mt-1 text-[11px] text-slate-400">
                        Current invoice and
                        customer signals
                      </p>
                    </div>

                    <button
                      onClick={() =>
                        setExpanded(
                          !expanded
                        )
                      }
                      className="flex items-center gap-1 text-[11px] font-medium text-blue-600"
                    >
                      {expanded
                        ? "Show less"
                        : "View all"}

                      <Icon
                        name="arrow"
                        className="!h-3.5 !w-3.5"
                      />
                    </button>
                  </div>

                  <ActivityFeed
                    customers={customers}
                    invoices={invoices}
                    today={today}
                    expanded={expanded}
                    unavailable={!!error}
                  />

                  <p className="border-t border-slate-100 px-6 py-3 text-[10px] text-slate-400">
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
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
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
                      <span className="text-base leading-none">+</span>
                      Add Customer
                    </button>
                  )}

                  {/* Add Invoice Button */}
                  {active === "Invoices" && (
                    <button
                      onClick={() => setAddInvoiceOpen(true)}
                      className="primary-button"
                    >
                      <span className="text-base leading-none">+</span>
                      Add Invoice
                    </button>
                  )}
                </div>

                {/* Search */}
                <label className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-slate-400">
                  <Icon
                    name="search"
                    className="!h-4 !w-4"
                  />

                  <input
                    aria-label={`Search ${active.toLowerCase()}`}
                    value={query}
                    onChange={(event) =>
                      setQuery(
                        event.target.value
                      )
                    }
                    placeholder={`Search ${active.toLowerCase()}…`}
                    className="w-44 text-xs text-slate-700 outline-none"
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
                      ? filteredCustomers.map(
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
                      : filteredInvoices.map(
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

              {/* Empty State */}
              {(error ||
                (active === "Customers"
                  ? filteredCustomers.length ===
                    0
                  : filteredInvoices.length ===
                    0)) && (
                <p className="p-10 text-center text-sm text-slate-400">
                  {error
                    ? "Data unavailable"
                    : "No matching records."}
                </p>
              )}
            </section>
          )}

          {/* AI Assistant */}
          {active === "AI Assistant" && (
            <Assistant
              customers={customers}
              invoices={invoices}
              today={today}
              unavailable={!!error}
            />
          )}

          {/* Documents */}
          {active === "Documents" && (
            <section className="card px-6 py-20 text-center">
              <Icon
                name="folder"
                className="mx-auto !h-10 !w-10 text-blue-400"
              />

              <h2 className="mt-5 text-lg font-semibold">
                Your documents, together
              </h2>

              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
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
          <footer className="mt-7 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-400">
            <span>
              Credit Intelligence · Make
              confident credit decisions.
            </span>

            <span className="flex items-center gap-1.5">
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
    </div>
  );
}