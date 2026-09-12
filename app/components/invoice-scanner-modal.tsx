"use client";

import { useEffect, useMemo, useState } from "react";

type Rule = {
  category: "paid" | "credit" | "loan";
  label: string;
  keywords: string[];
  title_patterns: string[];
  color_hint: string | null;
  notes: string | null;
};

type AnalysisResult = {
  classification: "paid" | "credit" | "loan" | "unknown";
  confidence: number;
  matchedSignals: string[];
  reasoning: string;
  invoiceNumber: string | null;
  customerCode: string | null;
  bankReference: string | null;
  customerName: string | null;
  amount: number | null;
  issueDate: string | null;
  dueDate: string | null;
  title: string | null;
  matchedCustomer: {
    id: string;
    name: string;
    customer_code: string;
    bank_ref_number: string | null;
  } | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
};

const categories: Array<Rule["category"]> = ["paid", "credit", "loan"];

export default function InvoiceScannerModal({
  open,
  onClose,
  onSaved,
}: Props) {
  const [imageDataUrl, setImageDataUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [rules, setRules] = useState<Rule[]>([]);
  const [showRules, setShowRules] = useState(false);
  const [loadingRules, setLoadingRules] = useState(false);
  const [savingRules, setSavingRules] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [savingInvoice, setSavingInvoice] = useState(false);
  const [message, setMessage] = useState("");

  const canSave = useMemo(() => {
    if (!analysis) return false;

    return Boolean(
      analysis.classification !== "unknown" &&
        analysis.matchedCustomer &&
        analysis.invoiceNumber &&
        analysis.amount &&
        analysis.amount > 0
    );
  }, [analysis]);

  useEffect(() => {
    if (!open) return;

    void loadRules();
  }, [open]);

  if (!open) return null;

  async function loadRules() {
    setLoadingRules(true);

    try {
      const response = await fetch("/api/invoices/rules");
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to load classification rules.");
      }

      setRules(result.rules ?? []);
    } catch (error) {
      console.error(error);
      setMessage("Could not load classification rules.");
    } finally {
      setLoadingRules(false);
    }
  }

  function handleFile(file?: File) {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setMessage("Please choose an image file.");
      return;
    }

    if (file.size > 12 * 1024 * 1024) {
      setMessage("Please use an image smaller than 12 MB.");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result;

      if (typeof result !== "string") return;

      setImageDataUrl(result);
      setFileName(file.name);
      setAnalysis(null);
      setMessage("");
    };

    reader.readAsDataURL(file);
  }

  async function analyzeInvoice() {
    if (!imageDataUrl) return;

    setAnalyzing(true);
    setAnalysis(null);
    setMessage("");

    try {
      const response = await fetch("/api/invoices/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageDataUrl,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to analyse invoice.");
      }

      setAnalysis(result.analysis);
    } catch (error) {
      console.error(error);
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to analyse this invoice."
      );
    } finally {
      setAnalyzing(false);
    }
  }

  function updateRule(
    category: Rule["category"],
    field: "keywords" | "title_patterns" | "color_hint" | "notes",
    value: string
  ) {
    setRules((current) =>
      current.map((rule) => {
        if (rule.category !== category) return rule;

        if (field === "keywords" || field === "title_patterns") {
          return {
            ...rule,
            [field]: value
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean),
          };
        }

        return {
          ...rule,
          [field]: value,
        };
      })
    );
  }

  async function saveRules() {
    setSavingRules(true);
    setMessage("");

    try {
      const response = await fetch("/api/invoices/rules", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rules,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to save rules.");
      }

      setRules(result.rules ?? rules);
      setMessage("Classification identifiers saved.");
    } catch (error) {
      console.error(error);
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to save classification identifiers."
      );
    } finally {
      setSavingRules(false);
    }
  }

  async function confirmAndSave() {
    if (!analysis || !canSave) return;

    setSavingInvoice(true);
    setMessage("");

    try {
      const response = await fetch("/api/invoices/confirm-scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          analysis,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to save invoice.");
      }

      setMessage("Invoice saved successfully.");
      onSaved?.();

      setTimeout(() => {
        onClose();
        setImageDataUrl("");
        setFileName("");
        setAnalysis(null);
        setMessage("");
      }, 700);
    } catch (error) {
      console.error(error);
      setMessage(
        error instanceof Error ? error.message : "Unable to save invoice."
      );
    } finally {
      setSavingInvoice(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 px-4 py-8">
      <div className="mx-auto w-full max-w-5xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Scan invoice / faktur
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Take a photo or upload an invoice. Invora will classify it and
              match the customer.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-2xl text-slate-400 hover:text-slate-700"
            aria-label="Close scanner"
          >
            ×
          </button>
        </div>

        <div className="grid gap-6 p-6 lg:grid-cols-[1fr_1.05fr]">
          <section>
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5">
              <label className="block cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(event) => handleFile(event.target.files?.[0])}
                />

                <div className="text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-2xl">
                    📷
                  </div>

                  <p className="text-sm font-medium text-slate-800">
                    Take photo or choose invoice
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    JPG, PNG or phone camera
                  </p>
                </div>
              </label>
            </div>

            {imageDataUrl && (
              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs text-slate-500">{fileName}</span>

                  <button
                    type="button"
                    onClick={() => {
                      setImageDataUrl("");
                      setFileName("");
                      setAnalysis(null);
                    }}
                    className="text-xs text-red-500"
                  >
                    Remove
                  </button>
                </div>

                <img
                  src={imageDataUrl}
                  alt="Invoice preview"
                  className="max-h-[420px] w-full rounded-xl border border-slate-200 object-contain"
                />

                <button
                  type="button"
                  onClick={analyzeInvoice}
                  disabled={analyzing}
                  className="primary-button mt-4 w-full justify-center"
                >
                  {analyzing ? "Analysing invoice…" : "Analyse with AI"}
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowRules((current) => !current)}
              className="mt-5 text-xs font-medium text-blue-600"
            >
              {showRules ? "Hide" : "Edit"} classification identifiers
            </button>

            {showRules && (
              <div className="mt-3 space-y-4 rounded-xl border border-slate-200 p-4">
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    Business-specific identifiers
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Tell Invora how your business recognises paid, credit and
                    loan documents. Use comma-separated examples.
                  </p>
                </div>

                {loadingRules ? (
                  <p className="text-xs text-slate-500">Loading rules…</p>
                ) : (
                  categories.map((category) => {
                    const rule = rules.find(
                      (item) => item.category === category
                    );

                    if (!rule) return null;

                    return (
                      <div
                        key={category}
                        className="rounded-lg bg-slate-50 p-3"
                      >
                        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-700">
                          {rule.label}
                        </p>

                        <label className="block text-xs text-slate-600">
                          Keywords / stamps
                          <input
                            value={rule.keywords.join(", ")}
                            onChange={(event) =>
                              updateRule(
                                category,
                                "keywords",
                                event.target.value
                              )
                            }
                            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-blue-500"
                            placeholder="PAID, LUNAS, NET 30"
                          />
                        </label>

                        <label className="mt-3 block text-xs text-slate-600">
                          Title examples
                          <input
                            value={rule.title_patterns.join(", ")}
                            onChange={(event) =>
                              updateRule(
                                category,
                                "title_patterns",
                                event.target.value
                              )
                            }
                            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-blue-500"
                            placeholder="Credit Invoice, Loan Agreement"
                          />
                        </label>

                        <label className="mt-3 block text-xs text-slate-600">
                          Colour / visual hint
                          <input
                            value={rule.color_hint ?? ""}
                            onChange={(event) =>
                              updateRule(
                                category,
                                "color_hint",
                                event.target.value
                              )
                            }
                            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-blue-500"
                            placeholder="green header, red PAID stamp"
                          />
                        </label>
                      </div>
                    );
                  })
                )}

                <button
                  type="button"
                  onClick={saveRules}
                  disabled={savingRules}
                  className="secondary-button"
                >
                  {savingRules ? "Saving…" : "Save identifiers"}
                </button>
              </div>
            )}
          </section>

          <section>
            {!analysis ? (
              <div className="flex min-h-[360px] items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center">
                <div>
                  <div className="text-3xl">✦</div>
                  <p className="mt-3 text-sm font-medium text-slate-700">
                    AI analysis will appear here
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Invora checks text, title, visual markers, colour hints and
                    customer identifiers.
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-400">
                      Classification
                    </p>
                    <h3 className="mt-1 text-xl font-semibold capitalize text-slate-900">
                      {analysis.classification === "paid"
                        ? "Paid in full"
                        : analysis.classification}
                    </h3>
                  </div>

                  <div className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                    {Math.round(analysis.confidence * 100)}% confidence
                  </div>
                </div>

                <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt className="text-xs text-slate-400">Invoice</dt>
                    <dd className="mt-1 font-medium text-slate-800">
                      {analysis.invoiceNumber ?? "Not detected"}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-xs text-slate-400">Amount</dt>
                    <dd className="mt-1 font-medium text-slate-800">
                      {analysis.amount
                        ? new Intl.NumberFormat("id-ID", {
                            style: "currency",
                            currency: "IDR",
                            maximumFractionDigits: 0,
                          }).format(analysis.amount)
                        : "Not detected"}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-xs text-slate-400">Issue date</dt>
                    <dd className="mt-1 font-medium text-slate-800">
                      {analysis.issueDate ?? "Not detected"}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-xs text-slate-400">Due date</dt>
                    <dd className="mt-1 font-medium text-slate-800">
                      {analysis.dueDate ?? "Not detected"}
                    </dd>
                  </div>
                </dl>

                <div className="mt-5 rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold text-slate-700">
                    Customer match
                  </p>

                  {analysis.matchedCustomer ? (
                    <div className="mt-2">
                      <p className="text-sm font-medium text-slate-900">
                        {analysis.matchedCustomer.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {analysis.matchedCustomer.customer_code}
                        {analysis.matchedCustomer.bank_ref_number
                          ? ` · Ref ${analysis.matchedCustomer.bank_ref_number}`
                          : ""}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-amber-700">
                      No exact customer match. Detected:{" "}
                      {analysis.customerCode ??
                        analysis.bankReference ??
                        analysis.customerName ??
                        "none"}
                    </p>
                  )}
                </div>

                <div className="mt-5">
                  <p className="text-xs font-semibold text-slate-700">
                    Why Invora chose this
                  </p>

                  <ul className="mt-2 space-y-1.5 text-xs leading-5 text-slate-600">
                    {analysis.matchedSignals.map((signal) => (
                      <li key={signal}>• {signal}</li>
                    ))}
                  </ul>

                  <p className="mt-3 text-xs leading-5 text-slate-500">
                    {analysis.reasoning}
                  </p>
                </div>

                {!canSave && (
                  <div className="mt-5 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                    This result needs manual review before saving. Invora must
                    detect a customer, invoice number, amount and a confident
                    category.
                  </div>
                )}

                <button
                  type="button"
                  onClick={confirmAndSave}
                  disabled={!canSave || savingInvoice}
                  className="primary-button mt-5 w-full justify-center disabled:opacity-50"
                >
                  {savingInvoice ? "Saving…" : "Confirm & Save Invoice"}
                </button>
              </div>
            )}

            {message && (
              <div className="mt-4 rounded-lg bg-slate-100 p-3 text-xs text-slate-700">
                {message}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
