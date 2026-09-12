import Link from "next/link";

export default function LandingPage() {
  return (
    // Soft yellow, blush pink, and white surfaces use darker text for readability.
    <main className="min-h-screen bg-yellow-50">
      {/* Sticky keeps the navbar at the top while scrolling and preserves its layout space; z-50 keeps it above page content. */}
      <nav className="sticky top-0 z-50 border-b border-pink-100 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-end justify-center gap-[3px] rounded-lg bg-pink-300 p-2">
              <span className="h-2 w-1 rounded-sm bg-white" />
              <span className="h-3 w-1 rounded-sm bg-white" />
              <span className="h-4 w-1 rounded-sm bg-white" />
            </div>

            <span className="text-lg font-semibold text-stone-800">
              Creditly
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="border border-pink-100 rounded-lg bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
            >
              Login
            </Link>

            <Link
              href="/signup"
              className="rounded-lg bg-pink-200 px-4 py-2 text-sm font-medium text-stone-800 transition hover:bg-pink-300"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </nav>

      {/* Vertical padding keeps the hero spaced from the navbar on every screen size. */}
      <section className="mx-auto grid max-w-7xl items-center gap-10 px-6 py-16 lg:grid-cols-2 lg:py-16">
        <div>
          <div className="mb-6 inline-flex font-bold rounded-full border border-pink-800 bg-pink-100 px-4 py-2 text-xs text-stone-800">
            Smarter credit management
          </div>

          <h1 className="max-w-2xl text-5xl font-semibold leading-tight tracking-tight text-stone-800 md:text-6xl">
            Manage receivables.
            <span className="block text-pink-300">
              Reduce payment risk.
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-8 text-stone-600">
            Monitor customers, invoices, outstanding payments, and credit risk
            from one simple platform.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="rounded-lg bg-pink-200 px-6 py-3 text-sm font-medium text-stone-800 transition hover:bg-pink-300"
            >
              Get Started
            </Link>

            <Link
              href="/login"
              className="rounded-lg border border-pink-100 bg-white px-6 py-3 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
            >
              Login
            </Link>
          </div>
        </div>

        {/* Dashboard Preview */}
        <div className="rounded-2xl border border-pink-100 bg-white p-5 shadow-xl shadow-pink-200/50">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-stone-500">Credit Overview</p>
              <h2 className="mt-1 text-lg font-semibold text-stone-800">
                Business Dashboard
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-pink-100 bg-pink-100 p-4">
              <p className="text-xs font-bold text-stone-500">Outstanding</p>
              <p className="mt-2 text-xl font-semibold text-stone-800">
                Rp 25.5M
              </p>
            </div>

            <div className="rounded-xl border border-pink-100 bg-pink-100 p-4">
              <p className="text-xs font-bold text-stone-500">Customers</p>
              <p className="mt-2 text-xl font-semibold text-stone-800">24</p>
            </div>

            <div className="rounded-xl border-2 border-pink-100 bg-pink-500 p-4">
              <p className="text-xs font-bold text-white">Overdue</p>
              <p className="mt-2 text-xl font-semibold text-white">5</p>
            </div>

            <div className="rounded-xl border border-pink-100 bg-pink-100 p-4">
              <p className="text-xs font-bold text-stone-500">Healthy Accounts</p>
              <p className="mt-2 text-xl font-semibold text-stone-700">
                79%
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-xl border-2 border-pink-100 p-4">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-medium text-stone-700">
                Recent Customers
              </p>

              <span className="text-xs text-stone-500">Risk</span>
            </div>

            <div className="space-y-4">
              <CustomerRow
                name="PT Maju Jaya"
                code="CUST-001"
                status="High Risk"
                statusClass="bg-red-100 text-red-700 font-semibold"
              />

              <CustomerRow
                name="PT Nusantara"
                code="CUST-002"
                status="Watch"
                statusClass="bg-yellow-100 text-yellow-800 font-semibold"
              />

              <CustomerRow
                name="PT Sejahtera"
                code="CUST-003"
                status="Good"
                statusClass="bg-green-100 text-green-700 font-semibold"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-pink-100 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="mb-12 text-center">
            <p className="text-sm font-medium text-pink-800">
              Everything in one place
            </p>

            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-stone-800">
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
      <section className="bg-pink-50">
        <div className="mx-auto max-w-7xl px-6 py-20 text-center">
          <h2 className="text-3xl font-semibold text-stone-800">
            Take control of your receivables.
          </h2>

          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-stone-500">
            Create your account and start managing customers, invoices, and
            credit risk in one place.
          </p>

          <Link
            href="/signup"
            className="mt-8 inline-block rounded-lg bg-pink-200 px-6 py-3 text-sm font-medium text-stone-800 transition hover:bg-pink-300"
          >
            Create Account
          </Link>
        </div>
      </section>

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
        <p className="text-sm font-medium text-stone-700">{name}</p>
        <p className="mt-1 text-xs text-stone-500">{code}</p>
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
    <div className="rounded-xl border border-pink-100 p-6">
      <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100 text-xs font-semibold text-pink-800">
        {icon}
      </div>

      <h3 className="text-base font-semibold text-stone-800">{title}</h3>

      <p className="mt-3 text-sm leading-6 text-stone-600">{description}</p>
    </div>
  );
}
