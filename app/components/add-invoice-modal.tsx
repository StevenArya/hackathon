"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/src/lib/supabase/client";
import type { Customer } from "@/src/lib/credit";

type Props = {
  open: boolean;
  onClose: () => void;
  customers: Customer[];
};

export default function AddInvoiceModal({
  open,
  onClose,
  customers,
}: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [customerId, setCustomerId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [paymentType, setPaymentType] = useState("credit");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setError("");

    const numericAmount = Number(amount);

    if (!numericAmount || numericAmount <= 0) {
      setError("Please enter a valid amount.");
      setSaving(false);
      return;
    }

    const { error } = await supabase.from("invoices").insert({
      customer_id: customerId,
      invoice_number: invoiceNumber.trim().toUpperCase(),
      amount: numericAmount,
      issue_date: issueDate || null,
      due_date: dueDate || null,
      status: "unpaid",
      payment_type: paymentType,
    });

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    setCustomerId("");
    setInvoiceNumber("");
    setAmount("");
    setIssueDate("");
    setDueDate("");
    setPaymentType("credit");

    setSaving(false);

    onClose();
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-stone-800">
              Add Invoice
            </h2>

            <p className="mt-1 text-xs text-stone-600">
              Create a new invoice for a customer.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-xl text-stone-500 hover:text-stone-700"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-stone-600">
              Customer
            </label>

            <select
              required
              value={customerId}
              onChange={(event) => setCustomerId(event.target.value)}
              className="w-full rounded-lg border border-pink-100 bg-white px-3 py-2.5 text-sm outline-none focus:border-pink-400"
            >
              <option value="">Select customer</option>

              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name} ({customer.customer_code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-stone-600">
              Invoice Number
            </label>

            <input
              required
              value={invoiceNumber}
              onChange={(event) => setInvoiceNumber(event.target.value)}
              placeholder="INV-004"
              className="w-full rounded-lg border border-pink-100 px-3 py-2.5 text-sm outline-none focus:border-pink-400"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-stone-600">
              Amount
            </label>

            <input
              required
              type="number"
              min="1"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="10000000"
              className="w-full rounded-lg border border-pink-100 px-3 py-2.5 text-sm outline-none focus:border-pink-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-stone-600">
                Issue Date
              </label>

              <input
                type="date"
                value={issueDate}
                onChange={(event) => setIssueDate(event.target.value)}
                className="w-full rounded-lg border border-pink-100 px-3 py-2.5 text-sm outline-none focus:border-pink-400"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-stone-600">
                Due Date
              </label>

              <input
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                className="w-full rounded-lg border border-pink-100 px-3 py-2.5 text-sm outline-none focus:border-pink-400"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-stone-600">
              Payment Type
            </label>

            <select
              value={paymentType}
              onChange={(event) => setPaymentType(event.target.value)}
              className="w-full rounded-lg border border-pink-100 bg-white px-3 py-2.5 text-sm outline-none focus:border-pink-400"
            >
              <option value="cash">Cash</option>
              <option value="credit">Credit</option>
              <option value="loan">Loan</option>
            </select>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-xs text-red-600">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="secondary-button"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="primary-button"
            >
              {saving ? "Adding..." : "Add Invoice"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 