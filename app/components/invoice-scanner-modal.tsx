"use client";

import { useRef, useState } from "react";
import * as pdfjs from "pdfjs-dist";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

type ScanResult = {
  invoiceNumber: string | null;
  customerName: string | null;
  customerCode: string | null;
  bankRefNumber: string | null;
  amount: number | null;
  issueDate: string | null;
  dueDate: string | null;
  paymentType: "cash" | "credit" | "loan" | null;
  confidence: number;
  reasoning: string;
};

type InvoiceScannerModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirmed?: () => void;
};

const MAX_PDF_PAGES = 5;
const MAX_FILE_SIZE = 20 * 1024 * 1024;

async function pdfToImages(file: File): Promise<File[]> {
  const arrayBuffer = await file.arrayBuffer();

  const loadingTask = pdfjs.getDocument({
    data: arrayBuffer,
  });

  const pdf = await loadingTask.promise;

  const pageCount = Math.min(
    pdf.numPages,
    MAX_PDF_PAGES
  );

  const images: File[] = [];

  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber++) {
    const page = await pdf.getPage(pageNumber);

    const viewport = page.getViewport({
      scale: 2,
    });

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Could not create PDF canvas.");
    }

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({
      canvas,
      canvasContext: context,
      viewport,
    }).promise;

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (result) {
            resolve(result);
          } else {
            reject(
              new Error(
                `Could not convert PDF page ${pageNumber}.`
              )
            );
          }
        },
        "image/jpeg",
        0.9
      );
    });

    images.push(
      new File(
        [blob],
        `${file.name.replace(/\.pdf$/i, "")}-page-${pageNumber}.jpg`,
        {
          type: "image/jpeg",
        }
      )
    );
  }

  return images;
}

export default function InvoiceScannerModal({
  open,
  onClose,
  onConfirmed,
}: InvoiceScannerModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] =
    useState<string | null>(null);

  const [result, setResult] =
    useState<ScanResult | null>(null);

  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  if (!open) {
    return null;
  }

  function reset() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setFile(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const selected = event.target.files?.[0];

    if (!selected) {
      return;
    }

    setError(null);
    setResult(null);

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
    ];

    if (!allowedTypes.includes(selected.type)) {
      setError(
        "Please upload a JPG, PNG, WebP, or PDF file."
      );
      return;
    }

    if (selected.size > MAX_FILE_SIZE) {
      setError(
        "File must be smaller than 20 MB."
      );
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setFile(selected);

    if (selected.type === "application/pdf") {
      setPreviewUrl(null);
    } else {
      setPreviewUrl(
        URL.createObjectURL(selected)
      );
    }
  }

  async function analyzeInvoice() {
    if (!file) {
      setError("Please select an invoice first.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setResult(null);

      const formData = new FormData();

      if (file.type === "application/pdf") {
        const pdfImages = await pdfToImages(file);

        for (const image of pdfImages) {
          formData.append("images", image);
        }
      } else {
        formData.append("images", file);
      }

      const response = await fetch(
        "/api/invoices/analyze",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Unable to analyse invoice."
        );
      }

      setResult(data.analysis);
    } catch (err) {
      console.error(
        "Invoice scan error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to analyse invoice."
      );
    } finally {
      setLoading(false);
    }
  }

  async function confirmInvoice() {
  if (!result) {
    return;
  }

  try {
    setConfirming(true);
    setError(null);

    const response = await fetch(
      "/api/invoices/confirm-scan",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          analysis: result,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error ??
          "Unable to save invoice."
      );
    }

    console.log(
      "Invoice successfully saved:",
      data
    );

    onConfirmed?.();

    handleClose();

    window.location.reload();
  } catch (err) {
    console.error(
      "Confirm invoice error:",
      err
    );

    setError(
      err instanceof Error
        ? err.message
        : "Unable to save invoice."
    );
  } finally {
    setConfirming(false);
  }
}

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Scan Invoice
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Upload an invoice image or PDF and
              let Invora AI extract the details.
            </p>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-100"
          >
            ✕
          </button>
        </div>

        {!result && (
          <>
            <label className="block cursor-pointer rounded-xl border-2 border-dashed border-slate-300 p-8 text-center transition hover:border-slate-400">
              <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="text-4xl">
                📄
              </div>

              <p className="mt-3 font-medium text-slate-800">
                Upload invoice
              </p>

              <p className="mt-1 text-sm text-slate-500">
                JPG, PNG, WebP, or PDF
              </p>

              <p className="mt-1 text-xs text-slate-400">
                PDFs: first 5 pages will be scanned
              </p>
            </label>

            {file && (
              <div className="mt-4 rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">
                      {file.name}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {(
                        file.size /
                        1024 /
                        1024
                      ).toFixed(2)}{" "}
                      MB
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={reset}
                    className="text-sm font-medium text-red-600"
                  >
                    Remove
                  </button>
                </div>

                {previewUrl && (
                  <img
                    src={previewUrl}
                    alt="Invoice preview"
                    className="mt-4 max-h-72 w-full rounded-lg object-contain"
                  />
                )}

                {file.type ===
                  "application/pdf" && (
                  <div className="mt-4 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
                    PDF selected. Invora will convert
                    up to the first 5 pages into
                    images before scanning.
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={!file || loading}
                onClick={analyzeInvoice}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading
                  ? "Scanning..."
                  : "Scan with Invora AI"}
              </button>
            </div>
          </>
        )}

        {result && (
          <>
            <div className="space-y-4">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Invoice Number
                </p>

                <p className="mt-1 font-semibold text-slate-900">
                  {result.invoiceNumber ??
                    "Not detected"}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <ResultField
                  label="Customer"
                  value={
                    result.customerName
                  }
                />

                <ResultField
                  label="Customer Code"
                  value={
                    result.customerCode
                  }
                />

                <ResultField
                  label="Bank Reference"
                  value={
                    result.bankRefNumber
                  }
                />

                <ResultField
                  label="Amount"
                  value={
                    result.amount !== null
                      ? `$ ${Number(
                          result.amount
                        ).toLocaleString(
                          "en-AU"
                        )}`
                      : null
                  }
                />

                <ResultField
                  label="Issue Date"
                  value={
                    result.issueDate
                  }
                />

                <ResultField
                  label="Due Date"
                  value={
                    result.dueDate
                  }
                />

                <ResultField
                  label="Payment Type"
                  value={
                    result.paymentType
                      ? result.paymentType.toUpperCase()
                      : null
                  }
                />

                <ResultField
                  label="AI Confidence"
                  value={`${Math.round(
                    result.confidence * 100
                  )}%`}
                />
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  AI Notes
                </p>

                <p className="mt-2 text-sm text-slate-700">
                  {result.reasoning ||
                    "No notes provided."}
                </p>
              </div>
            </div>

            {error && (
              <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="mt-6 flex justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setResult(null);
                  setError(null);
                }}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
              >
                Scan Again
              </button>

              <button
                type="button"
                onClick={confirmInvoice}
                disabled={confirming}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {confirming
                  ? "Saving..."
                  : "Confirm & Add Invoice"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ResultField({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-sm font-medium text-slate-900">
        {value ?? "Not detected"}
      </p>
    </div>
  );
}