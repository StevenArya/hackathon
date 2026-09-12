import { NextResponse } from "next/server";
import { createSessionClient } from "@/src/lib/supabase/server";

type IncomingAnalysis = {
  classification: "paid" | "credit" | "loan" | "unknown";
  invoiceNumber: string | null;
  amount: number | null;
  issueDate: string | null;
  dueDate: string | null;
  matchedCustomer: {
    id: string;
  } | null;
};

export async function POST(request: Request) {
  try {
    const supabase = await createSessionClient();

    const { data: claimsData, error: authError } =
      await supabase.auth.getClaims();

    const userId = claimsData?.claims?.sub;

    if (authError || !userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    if (profileError || profile?.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const analysis = body.analysis as IncomingAnalysis | undefined;

    if (!analysis) {
      return NextResponse.json(
        { error: "Analysis result is required." },
        { status: 400 }
      );
    }

    if (
      !analysis.matchedCustomer?.id ||
      !analysis.invoiceNumber ||
      !analysis.amount ||
      analysis.amount <= 0 ||
      !["paid", "credit", "loan"].includes(analysis.classification)
    ) {
      return NextResponse.json(
        { error: "This invoice needs manual review before it can be saved." },
        { status: 400 }
      );
    }

    const invoiceNumber = analysis.invoiceNumber.trim().toUpperCase();

    const { data: existingInvoice } = await supabase
      .from("invoices")
      .select("id")
      .eq("invoice_number", invoiceNumber)
      .maybeSingle();

    if (existingInvoice) {
      return NextResponse.json(
        { error: `Invoice ${invoiceNumber} already exists.` },
        { status: 409 }
      );
    }

    const paymentType =
      analysis.classification === "paid"
        ? "cash"
        : analysis.classification;

    const status =
      analysis.classification === "paid" ? "paid" : "unpaid";

    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .insert({
        customer_id: analysis.matchedCustomer.id,
        invoice_number: invoiceNumber,
        amount: analysis.amount,
        issue_date: analysis.issueDate || null,
        due_date: analysis.dueDate || null,
        status,
        payment_type: paymentType,
      })
      .select("id, invoice_number")
      .single();

    if (invoiceError || !invoice) {
      throw invoiceError ?? new Error("Invoice could not be created.");
    }

    if (analysis.classification === "paid") {
      const paymentDate =
        analysis.issueDate ?? new Date().toISOString().slice(0, 10);

      const { error: paymentError } = await supabase
        .from("payments")
        .insert({
          invoice_id: invoice.id,
          amount: analysis.amount,
          payment_date: paymentDate,
        });

      if (paymentError) {
        console.error("Payment logging error:", paymentError);
      }
    }

    return NextResponse.json({
      success: true,
      invoice,
    });
  } catch (error) {
    console.error("Confirm scanned invoice error:", error);

    return NextResponse.json(
      { error: "Unable to save the scanned invoice." },
      { status: 500 }
    );
  }
}
