import Groq from "groq-sdk";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createSessionClient } from "@/src/lib/supabase/server";

type ExtractedProof = {
  invoiceReference: string | null;
  description: string | null;
  amount: number | null;
  paymentDate: string | null;
  transactionReference: string | null;
  payerName: string | null;
  confidence: number;
  reasoning: string;
};

function normalizeReference(value: string | null | undefined) {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function parseAmount(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;

  let cleaned = value.replace(/[^\d.,-]/g, "");

  if (cleaned.includes(".") && cleaned.includes(",")) {
    if (cleaned.lastIndexOf(",") > cleaned.lastIndexOf(".")) {
      cleaned = cleaned.replace(/\./g, "").replace(",", ".");
    } else {
      cleaned = cleaned.replace(/,/g, "");
    }
  } else if (/^\d{1,3}(\.\d{3})+$/.test(cleaned)) {
    cleaned = cleaned.replace(/\./g, "");
  } else if (/^\d{1,3}(,\d{3})+$/.test(cleaned)) {
    cleaned = cleaned.replace(/,/g, "");
  } else {
    cleaned = cleaned.replace(",", ".");
  }

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function extensionForMime(mime: string) {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

export async function POST(request: Request) {
  try {
    const groqApiKey = process.env.GROQ_API_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!groqApiKey) {
      return NextResponse.json({ error: "GROQ_API_KEY is not configured." }, { status: 500 });
    }

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Server-side Supabase payment verification is not configured." },
        { status: 500 }
      );
    }

    const supabase = await createSessionClient();

    const { data: claimsData, error: authError } = await supabase.auth.getClaims();
    const userId = claimsData?.claims?.sub;

    if (authError || !userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, customer_id")
      .eq("id", userId)
      .single();

    if (profileError || !profile || profile.role !== "customer" || !profile.customer_id) {
      return NextResponse.json({ error: "Customer access required." }, { status: 403 });
    }

    const formData = await request.formData();
    const invoiceId = String(formData.get("invoiceId") ?? "");
    const proof = formData.get("proof");

    if (!invoiceId || !(proof instanceof File)) {
      return NextResponse.json({ error: "Invoice and payment proof are required." }, { status: 400 });
    }

    const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedMimeTypes.includes(proof.type)) {
      return NextResponse.json({ error: "Only JPG, PNG, and WebP images are supported." }, { status: 400 });
    }

    if (proof.size > 12 * 1024 * 1024) {
      return NextResponse.json({ error: "Payment proof must be smaller than 12 MB." }, { status: 413 });
    }

    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select("id, customer_id, invoice_number, amount, status, payment_type")
      .eq("id", invoiceId)
      .eq("customer_id", profile.customer_id)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
    }

    if (invoice.status === "paid") {
      return NextResponse.json({ error: "This invoice is already marked as paid." }, { status: 409 });
    }

    const { data: existingPayments, error: paymentsError } = await supabase
      .from("payments")
      .select("amount")
      .eq("invoice_id", invoice.id);

    if (paymentsError) throw paymentsError;

    const alreadyPaid = (existingPayments ?? []).reduce(
      (sum, payment) => sum + Number(payment.amount ?? 0),
      0
    );

    const outstanding = Math.max(Number(invoice.amount) - alreadyPaid, 0);

    if (outstanding <= 0) {
      return NextResponse.json({ error: "This invoice has no outstanding balance." }, { status: 409 });
    }

    const bytes = Buffer.from(await proof.arrayBuffer());
    const imageDataUrl = `data:${proof.type};base64,${bytes.toString("base64")}`;

    const groq = new Groq({ apiKey: groqApiKey });

    const prompt = `
You are analysing a bank transfer receipt / proof of payment.

Extract ONLY information that is visibly present in the image.
Do not guess missing fields.

Important:
- Look carefully at the transfer description, notes, berita transfer,
  remark, reference, invoice/faktur number, and transaction details.
- invoiceReference should contain the invoice/faktur reference written
  in the transfer description if present.
- amount is the actual transferred amount as a plain number.
- paymentDate must be YYYY-MM-DD if confidently readable.
- confidence must be between 0 and 1.
- Return JSON only.

Return exactly:
{
  "invoiceReference": "string or null",
  "description": "string or null",
  "amount": 0,
  "paymentDate": "YYYY-MM-DD or null",
  "transactionReference": "string or null",
  "payerName": "string or null",
  "confidence": 0.0,
  "reasoning": "one short sentence describing what was visibly found"
}
`;

    const completion = await groq.chat.completions.create({
      model: "qwen/qwen3.6-27b",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: imageDataUrl } },
          ],
        },
      ],
      temperature: 0.1,
      max_completion_tokens: 700,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content;

    if (!raw) {
      return NextResponse.json({ error: "AI could not read the payment proof." }, { status: 502 });
    }

    const parsed = JSON.parse(raw) as Partial<ExtractedProof>;

    const extracted: ExtractedProof = {
      invoiceReference: parsed.invoiceReference ? String(parsed.invoiceReference).trim() : null,
      description: parsed.description ? String(parsed.description).trim() : null,
      amount: parseAmount(parsed.amount),
      paymentDate: parsed.paymentDate ? String(parsed.paymentDate) : null,
      transactionReference: parsed.transactionReference ? String(parsed.transactionReference).trim() : null,
      payerName: parsed.payerName ? String(parsed.payerName).trim() : null,
      confidence: Math.max(0, Math.min(1, Number(parsed.confidence ?? 0))),
      reasoning: String(parsed.reasoning ?? ""),
    };

    const expectedRef = normalizeReference(invoice.invoice_number);
    const visibleReferenceText = normalizeReference(
      [extracted.invoiceReference, extracted.description].filter(Boolean).join(" ")
    );

    const invoiceNumberMatch = expectedRef.length > 0 && visibleReferenceText.includes(expectedRef);
    const amountMatch = extracted.amount !== null && Math.abs(extracted.amount - outstanding) <= 1;
    const verified = invoiceNumberMatch && amountMatch && extracted.confidence >= 0.65;

    const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const storagePath = `${userId}/${invoice.id}/${crypto.randomUUID()}.${extensionForMime(proof.type)}`;

    const { error: uploadError } = await adminSupabase.storage
      .from("payment-proofs")
      .upload(storagePath, bytes, { contentType: proof.type, upsert: false });

    if (uploadError) throw uploadError;

    const { data: proofRecord, error: proofInsertError } = await adminSupabase
      .from("payment_proofs")
      .insert({
        invoice_id: invoice.id,
        customer_id: profile.customer_id,
        user_id: userId,
        storage_path: storagePath,
        extracted_invoice_number: extracted.invoiceReference,
        extracted_amount: extracted.amount,
        extracted_payment_date: extracted.paymentDate,
        transaction_reference: extracted.transactionReference,
        payer_name: extracted.payerName,
        ai_confidence: extracted.confidence,
        invoice_number_match: invoiceNumberMatch,
        amount_match: amountMatch,
        verification_status: verified ? "verified" : "review",
        ai_reasoning: extracted.reasoning,
      })
      .select("id")
      .single();

    if (proofInsertError || !proofRecord) {
      await adminSupabase.storage.from("payment-proofs").remove([storagePath]);
      throw proofInsertError ?? new Error("Could not save payment proof.");
    }

    let finalVerified = false;

    if (verified) {
      const { error: applyError } = await supabase.rpc("apply_verified_payment_proof", {
        p_proof_id: proofRecord.id,
      });

      if (applyError) {
        console.error("Verified payment could not be applied:", applyError);

        await adminSupabase
          .from("payment_proofs")
          .update({
            verification_status: "review",
            ai_reasoning: `${extracted.reasoning} Automatic posting failed and needs review.`,
          })
          .eq("id", proofRecord.id);
      } else {
        finalVerified = true;
      }
    }

    return NextResponse.json({
      verification: {
        status: finalVerified ? "verified" : "review",
        invoiceNumberMatch,
        amountMatch,
        expectedInvoiceNumber: invoice.invoice_number,
        detectedInvoiceReference: extracted.invoiceReference ?? extracted.description,
        expectedAmount: outstanding,
        detectedAmount: extracted.amount,
        paymentDate: extracted.paymentDate,
        transactionReference: extracted.transactionReference,
        payerName: extracted.payerName,
        confidence: extracted.confidence,
        reasoning: extracted.reasoning,
        message: finalVerified
          ? "The invoice reference and amount match. The payment has been recorded and the invoice is now paid."
          : "The proof was saved, but one or more details need manual review before the invoice can be marked paid.",
      },
    });
  } catch (error) {
    console.error("Payment proof verification error:", error);

    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === "development" && error instanceof Error
            ? error.message
            : "Invora could not verify this payment proof.",
      },
      { status: 500 }
    );
  }
}
