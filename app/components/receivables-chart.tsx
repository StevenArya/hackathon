"use client";
import { useRef, useState } from "react";
import {
  compact,
  currency,
  isOverdue,
  sum,
  type Invoice
} from "@/src/lib/credit";
export function ReceivablesChart({
  invoices,
  today,
  unavailable
}: {
  invoices: Invoice[];
  today: string;
  unavailable?: boolean;
}) {
  const [range, setRange] = useState("6");
  const [activeMonth, setActiveMonth] = useState<string | null>(null);
  const scrollArea = useRef<HTMLDivElement>(null);
  const [tooltipPosition, setTooltipPosition] = useState<number | null>(null);
  function selectMonth(key: string) {
    setActiveMonth(key);
    const area = scrollArea.current;
    if (area) {
      const index = months.findIndex(month => month.key === key);
      setTooltipPosition((65 + (index + 0.5) * 885 / months.length) / 960 * area.scrollWidth - area.scrollLeft);
    }
  }
  const unpaid = invoices.filter((i) => i.status !== "paid");
  const months = Array.from({ length: Number(range) }, (_, index) => {
    const date = new Date(`${today}T00:00:00Z`);
    date.setUTCDate(1);
    date.setUTCMonth(date.getUTCMonth() - Number(range) + 1 + index);
    const key = date.toISOString().slice(0, 7);
    const entries = unpaid.filter((i) => i.due_date?.slice(0, 7) === key);
    return {
      key,
      label: date.toLocaleDateString("en", { month: "short", timeZone: "UTC" }),
      outstanding: sum(entries),
      overdue: sum(entries.filter((i) => isOverdue(i, today)))
    };
  });
  const selectedMonth = months.find((month) => month.key === activeMonth);
  // Use the same horizontal coordinates as the bars to center the tooltip over the active month.
  const selectedIndex = months.findIndex((month) => month.key === activeMonth);
  const tooltipLeft =
    ((65 + ((selectedIndex + 0.5) * 885) / months.length) / 960) * 100;
  const max = Math.max(...months.map((m) => m.outstanding), 1);
  const ceiling = Math.ceil(max / 4) * 4;
  const excluded = unpaid.filter(
    (i) => !months.some((m) => i.due_date?.slice(0, 7) === m.key)
  );
  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-1">
        <div>
          <h2 className="section-title">Receivables Overview</h2>
          <p className="mt-1.5 text-xs text-stone-500">
            Current balances, grouped by invoice due month
          </p>
        </div>
        <select
          aria-label="Chart date range"
          className="select-control"
          value={range}
          onChange={(e) => {
            setRange(e.target.value);
            setActiveMonth(null);
          }}
        >
          <option value="6">Last 6 months</option>
          <option value="12">Last 12 months</option>
        </select>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-5 text-[11px] text-stone-600">
        <span className="legend text-[1.05em] font-semibold">
          <i className="bg-pink-300" />
          Outstanding
        </span>
        <span className="legend text-[1.05em] font-semibold">
          <i className="bg-yellow-200" />
          Overdue{" "}
          <span className="text-stone-500 text-[1.05em] font-semibold">
            (included in outstanding)
          </span>
        </span>
        <span className="ml-auto text-stone-500 text-[1.05em] font-semibold">
          IDR
        </span>
      </div>
      {unavailable || !invoices.length ? (
        <div className="flex h-56 items-center justify-center text-sm text-stone-500">
          {unavailable
            ? "Chart unavailable while disconnected"
            : "Your receivables chart will appear when invoices are added."}
        </div>
      ) : (
        <div className="mt-5">
          <div className="relative min-w-0 pt-36">
            <div ref={scrollArea} className="overflow-x-auto overscroll-x-contain pb-2" onScroll={() => setActiveMonth(null)} tabIndex={0} role="region" aria-label="Scrollable receivables chart">
            <svg
              viewBox="0 0 960 235"
              role="group"
              aria-label="Current outstanding and overdue invoice balances by due month"
              className="min-w-[600px] w-full"
            >
              <title>Receivables by due month, in Indonesian rupiah</title>
              {[0, 1, 2, 3, 4].map((tick) => (
                <g key={tick}>
                  <line
                    x1="65"
                    x2="950"
                    y1={185 - tick * 42}
                    y2={185 - tick * 42}
                    stroke="#fce7f3"
                    strokeDasharray={tick ? "4 4" : undefined}
                  />
                  <text
                    x="48"
                    y={189 - tick * 42}
                    textAnchor="end"
                    fontSize="10"
                    fill="#78716c"
                  >
                    {compact((ceiling * tick) / 4)}
                  </text>
                </g>
              ))}
              {months.map((month, index) => {
                const x = 65 + ((index + 0.5) * 885) / months.length;
                const width = Number(range) === 6 ? 25 : 15;
                return (
                  <g
                    key={month.key}
                    className="chart-month"
                    tabIndex={0}
                    role="img"
                    aria-label={`${month.key}: Outstanding ${currency(month.outstanding)}; overdue ${currency(month.overdue)}`}
                    onPointerEnter={event => { if (event.pointerType === "mouse") selectMonth(month.key); }}
                    onPointerLeave={event => { if (event.pointerType === "mouse") setActiveMonth(null); }}
                    onFocus={() => selectMonth(month.key)}
                    onBlur={() => setActiveMonth(null)}
                    onClick={() => selectMonth(month.key)}
                    onKeyDown={(event) => {
                      if (event.key === "Escape") setActiveMonth(null);
                    }}
                  >
                    <rect
                      x={x - 885 / months.length / 2}
                      y="10"
                      width={885 / months.length}
                      height="214"
                      fill="transparent"
                    />
                    <g className="chart-bars">
                      <rect
                        x={x - width - 3}
                        y={185 - (month.outstanding / ceiling) * 168}
                        width={width}
                        height={(month.outstanding / ceiling) * 168}
                        rx="4"
                        fill="#f9a8d4"
                      />
                      <rect
                        x={x + 3}
                        y={185 - (month.overdue / ceiling) * 168}
                        width={width}
                        height={(month.overdue / ceiling) * 168}
                        rx="4"
                        fill="#fef08a"
                      />
                    </g>
                    <text
                      x={x}
                      y="214"
                      textAnchor="middle"
                      fontSize="11"
                      fill="#78716c"
                    >
                      {month.label}
                    </text>
                  </g>
                );
              })}
            </svg></div>
            {selectedMonth && (
              <div
                role="tooltip"
                style={{
                  left: `clamp(8px, calc(${tooltipPosition !== null ? `${tooltipPosition}px` : `${tooltipLeft}%`} - 90px), calc(100% - 188px))`
                }}
                className="pointer-events-none absolute top-0 w-[180px] rounded-xl border border-pink-200 bg-white p-3 text-xs text-stone-700 shadow-lg shadow-pink-200/50"
              >
                <p className="font-semibold text-pink-800">
                  {selectedMonth.key}
                </p>
                <p className="mt-1">
                  Outstanding:{" "}
                  <strong>{currency(selectedMonth.outstanding)}</strong>
                </p>
                <p className="mt-1">
                  Overdue: <strong>{currency(selectedMonth.overdue)}</strong>
                </p>
              </div>
            )}
          </div>
        </div>
      )}
      <div className="mt-2 flex flex-wrap justify-between gap-2 border-t border-pink-100 pt-4 text-[10px] text-stone-500">
        <span className="text-[1.05em] font-semibold">
          Current unpaid invoices · not a historical balance trend
        </span>
        <span className="text-[1.05em] font-semibold">
          {excluded.length
            ? `${excluded.length} invoices outside this range or without a due date`
            : "All unpaid invoices included in this range"}
        </span>
      </div>
    </section>
  );
}
