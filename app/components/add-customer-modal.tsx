"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/src/lib/supabase/client";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function AddCustomerModal({ open, onClose }: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState("");
  const [customerCode, setCustomerCode] = useState("");
  const [bankReference, setBankReference] = useState("");
  const [status, setStatus] = useState("good");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setError("");

    const { error } = await supabase.from("customers").insert({
      name: name.trim(),
      customer_code: customerCode.trim().toUpperCase(),
      bank_ref_number: bankReference.trim() || null,
      status,
    });

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    setName("");
    setCustomerCode("");
    setBankReference("");
    setStatus("good");
    setSaving(false);

    onClose();

    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">
              Add Customer
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Create a new customer account.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-xl text-slate-400 hover:text-slate-700"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-600">
              Customer Name
            </label>

            <input
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="PT Maju Jaya"
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-600">
              Customer ID
            </label>

            <input
              required
              value={customerCode}
              onChange={(event) => setCustomerCode(event.target.value)}
              placeholder="CUST-004"
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-600">
              Bank Reference Number
            </label>

            <input
              value={bankReference}
              onChange={(event) => setBankReference(event.target.value)}
              placeholder="Optional"
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-600">
              Risk Status
            </label>

            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
            >
              <option value="good">Good</option>
              <option value="level_1">Level 1</option>
              <option value="level_2">Level 2</option>
              <option value="danger">Danger</option>
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
              {saving ? "Adding..." : "Add Customer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}