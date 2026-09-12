"use client";

import { useState } from "react";

type InvoiceForProof = {
  id: string;
  invoice_number: string;
  amount: number | string;
  status: string;
};

type VerificationResult = {
  status: "verified" | "review";
  invoiceNumberMatch: boolean;
  amountMatch: boolean;
  expectedInvoiceNumber: string;
  detectedInvoiceReference: string | null;
  expectedAmount: number;
  detectedAmount: number | null;
  paymentDate: string | null;
  transactionReference: string | null;
  payerName: string | null;
  confidence: number;
  reasoning: string;
  message: string;
};

export default function PaymentProofUpload({
  invoice,
}: {
  invoice: InvoiceForProof;
}) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState("");

  function chooseFile(selected?: File) {
    if (!selected) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(selected.type)) {
      setError("Please upload a JPG, PNG, or WebP image.");
      return;
    }

    if (selected.size > 12 * 1024 * 1024) {
      setError("The proof image must be smaller than 12 MB.");
      return;
    }

    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    setResult(null);
    setError("");
  }

  function close() {
    if (loading) return;

    if (preview) URL.revokeObjectURL(preview);
    setOpen(false);
    setFile(null);
    setPreview("");
    setResult(null);
    setError("");
  }

  async function verify() {
    if (!file) return;

    setLoading(true);
    setResult(null);
    setError("");

    try {
      const formData = new FormData();
      formData.append("invoiceId", invoice.id);
      formData.append("proof", file);

      const response = await fetch("/api/payments/verify-proof", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to verify payment proof.");
      }

      setResult(data.verification);

      if (data.verification.status === "verified") {
        setTimeout(() => window.location.reload(), 1800);
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Unable to verify payment proof.");
    } finally {
      setLoading(false);
    }
  }

  if (invoice.status === "paid") {
    return <span className="text-xs font-medium text-emerald-600">Payment verified</span>;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
      >
        Upload proof of payment
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Upload proof of payment</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Invora AI will check the transfer reference and amount against {invoice.invoice_number}.
                </p>
              </div>

              <button type="button" onClick={close} className="text-2xl leading-none text-slate-400 hover:text-slate-700" aria-label="Close">×</button>
            </div>

            <div className="space-y-5 p-6">
              <div className="rounded-xl bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-4 text-sm">
                  <div>
                    <p className="text-xs text-slate-400">Invoice</p>
                    <p className="font-semibold text-slate-800">{invoice.invoice_number}</p>
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-slate-400">Expected payment</p>
                    <p className="font-semibold text-slate-800">{formatIDR(Number(invoice.amount))}</p>
                  </div>
                </div>
              </div>

              <label className="block cursor-pointer rounded-2xl border-2 border-dashed border-slate-200 p-6 text-center transition hover:border-blue-300 hover:bg-blue-50/40">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  capture="environment"
                  className="hidden"
                  onChange={(event) => chooseFile(event.target.files?.[0])}
                />
                <div className="text-3xl">🧾</div>
                <p className="mt-2 text-sm font-semibold text-slate-800">Take photo or upload payment receipt</p>
                <p className="mt-1 text-xs text-slate-500">Make sure the amount, transfer description, and transaction details are readable.</p>
              </label>

              {preview && (
                <img src={preview} alt="Payment proof preview" className="max-h-72 w-full rounded-xl border border-slate-200 object-contain" />
              )}

              {file && !result && (
                <button
                  type="button"
                  onClick={verify}
                  disabled={loading}
                  className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? "Invora is checking the payment..." : "Verify payment with AI"}
                </button>
              )}

              {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

              {result && (
                <div className={`rounded-2xl border p-5 ${result.status === "verified" ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className={`text-sm font-semibold ${result.status === "verified" ? "text-emerald-800" : "text-amber-800"}`}>
                        {result.status === "verified" ? "✓ Payment verified" : "Manual review needed"}
                      </p>
                      <p className="mt-1 text-xs text-slate-600">AI confidence: {Math.round(result.confidence * 100)}%</p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <CheckRow
                      label="Invoice reference"
                      match={result.invoiceNumberMatch}
                      expected={result.expectedInvoiceNumber}
                      detected={result.detectedInvoiceReference ?? "Not detected"}
                    />
                    <CheckRow
                      label="Payment amount"
                      match={result.amountMatch}
                      expected={formatIDR(result.expectedAmount)}
                      detected={result.detectedAmount === null ? "Not detected" : formatIDR(result.detectedAmount)}
                    />
                  </div>

                  <div className="mt-4 space-y-1 text-xs text-slate-600">
                    {result.transactionReference && <p><span className="font-medium">Transaction:</span> {result.transactionReference}</p>}
                    {result.paymentDate && <p><span className="font-medium">Payment date:</span> {result.paymentDate}</p>}
                    {result.payerName && <p><span className="font-medium">Payer:</span> {result.payerName}</p>}
                    <p className="pt-2">{result.reasoning}</p>
                  </div>

                  <p className="mt-4 text-xs font-medium text-slate-700">{result.message}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function CheckRow({ label, match, expected, detected }: { label: string; match: boolean; expected: string; detected: string }) {
  return (
    <div className="rounded-xl bg-white/70 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-slate-700">{label}</p>
        <span className={`text-xs font-semibold ${match ? "text-emerald-600" : "text-red-600"}`}>{match ? "MATCH" : "MISMATCH"}</span>
      </div>
      <p className="mt-2 text-[11px] text-slate-500">Expected: {expected}</p>
      <p className="text-[11px] text-slate-500">Detected: {detected}</p>
    </div>
  );
}

function formatIDR(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}
