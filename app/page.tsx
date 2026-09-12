import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      {/* Navbar */}
      <nav className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-end justify-center gap-[3px] rounded-lg bg-blue-600 p-2">
              <span className="h-2 w-1 rounded-sm bg-white" />
              <span className="h-3 w-1 rounded-sm bg-white" />
              <span className="h-4 w-1 rounded-sm bg-white" />
            </div>

            <span className="text-lg font-semibold text-slate-900">
              Creditly
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
            >
              Login
            </Link>

            <Link
              href="/signup"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto grid max-w-7xl items-center gap-16 px-6 py-24 lg:grid-cols-2 lg:py-32">
        <div>
          <div className="mb-6 inline-flex rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-xs font-medium text-blue-600">
            Smarter credit management
          </div>

          <h1 className="max-w-2xl text-5xl font-semibold leading-tight tracking-tight text-slate-900 md:text-6xl">
            Manage receivables.
            <span className="block text-blue-600">
              Reduce payment risk.
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-500">
            Monitor customers, invoices, outstanding payments, and credit risk
            from one simple platform.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              Get Started
            </Link>

            <Link
              href="/login"
              className="rounded-lg border border-slate-200 bg-white px-6 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Login
            </Link>
          </div>
        </div>

        {/* Dashboard Preview */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/40">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">Credit Overview</p>
              <h2 className="mt-1 text-lg font-semibold text-slate-800">
                Business Dashboard
              </h2>
            </div>

            <div className="h-9 w-9 rounded-full bg-slate-100" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs text-slate-400">Outstanding</p>
              <p className="mt-2 text-xl font-semibold text-slate-800">
                Rp 25.5M
              </p>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs text-slate-400">Customers</p>
              <p className="mt-2 text-xl font-semibold text-slate-800">24</p>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs text-slate-400">Overdue</p>
              <p className="mt-2 text-xl font-semibold text-rose-600">5</p>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs text-slate-400">Healthy Accounts</p>
              <p className="mt-2 text-xl font-semibold text-emerald-600">
                79%
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-slate-100 p-4">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-medium text-slate-700">
                Recent Customers
              </p>

              <span className="text-xs text-slate-400">Risk</span>
            </div>

            <div className="space-y-4">
              <CustomerRow
                name="PT Maju Jaya"
                code="CUST-001"
                status="High Risk"
                statusClass="bg-rose-50 text-rose-600"
              />

              <CustomerRow
                name="PT Nusantara"
                code="CUST-002"
                status="Watch"
                statusClass="bg-amber-50 text-amber-600"
              />

              <CustomerRow
                name="PT Sejahtera"
                code="CUST-003"
                status="Good"
                statusClass="bg-emerald-50 text-emerald-600"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="mb-12 text-center">
            <p className="text-sm font-medium text-blue-600">
              Everything in one place
            </p>

            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
              Understand your receivables at a glance
            </h2>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <FeatureCard
              icon="01"
              title="Customer Monitoring"
              description="View customer balances, payment history, and credit status from one dashboard."
            />

            <FeatureCard
              icon="02"
              title="Invoice Tracking"
              description="Track cash, credit, and loan invoices together with payment and due-date information."
            />

            <FeatureCard
              icon="03"
              title="Credit Risk"
              description="Identify customers that may require attention before overdue payments become a bigger problem."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-slate-900">
        <div className="mx-auto max-w-7xl px-6 py-20 text-center">
          <h2 className="text-3xl font-semibold text-white">
            Take control of your receivables.
          </h2>

          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-slate-400">
            Create your account and start managing customers, invoices, and
            credit risk in one place.
          </p>

          <Link
            href="/signup"
            className="mt-8 inline-block rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white transition hover:bg-blue-500"
          >
            Create Account
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-900">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 text-xs text-slate-500">
          <p>© 2026 Creditly</p>

          <p>Credit & Receivables Management</p>
        </div>
      </footer>
    </main>
  );
}

function CustomerRow({
  name,
  code,
  status,
  statusClass,
}: {
  name: string;
  code: string;
  status: string;
  statusClass: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-slate-700">{name}</p>
        <p className="mt-1 text-xs text-slate-400">{code}</p>
      </div>

      <span
        className={`rounded-md px-2.5 py-1 text-[10px] font-medium ${statusClass}`}
      >
        {status}
      </span>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 p-6">
      <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-xs font-semibold text-blue-600">
        {icon}
      </div>

      <h3 className="text-base font-semibold text-slate-800">{title}</h3>

      <p className="mt-3 text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}