import { NextResponse } from "next/server";
import { createSessionClient } from "@/src/lib/supabase/server";

type IncomingAnalysis = {
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

function normalizeIdentifier(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function normalizeName(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export async function POST(request: Request) {
  try {
    const supabase = await createSessionClient();

    const {
      data: claimsData,
      error: authError,
    } = await supabase.auth.getClaims();

    const userId = claimsData?.claims?.sub;

    if (authError || !userId) {
      return NextResponse.json(
        {
          error: "Unauthorized.",
        },
        {
          status: 401,
        }
      );
    }

    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    if (
      profileError ||
      !profile ||
      profile.role !== "admin"
    ) {
      return NextResponse.json(
        {
          error: "Admin access required.",
        },
        {
          status: 403,
        }
      );
    }

    const body = await request.json();

    const analysis =
      body.analysis as IncomingAnalysis | undefined;

    if (!analysis) {
      return NextResponse.json(
        {
          error: "Analysis result is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !analysis.invoiceNumber ||
      analysis.amount === null ||
      analysis.amount === undefined ||
      analysis.amount <= 0 ||
      !analysis.paymentType
    ) {
      return NextResponse.json(
        {
          error:
            "The scanned invoice is missing required information.",
        },
        {
          status: 400,
        }
      );
    }

    if (analysis.confidence < 0.6) {
      return NextResponse.json(
        {
          error:
            "This invoice needs manual review because the AI confidence is too low.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      data: customers,
      error: customersError,
    } = await supabase
      .from("customers")
      .select(
        "id, customer_code, name, bank_ref_number"
      );

    if (customersError) {
      throw customersError;
    }

    const normalizedAnalysisCode =
      normalizeIdentifier(
        analysis.customerCode
      );

    const normalizedAnalysisBankRef =
      normalizeIdentifier(
        analysis.bankRefNumber
      );

    const normalizedAnalysisName =
      normalizeName(
        analysis.customerName
      );

    const matchedCustomer =
      customers?.find((customer) => {
        const customerCode =
          normalizeIdentifier(
            customer.customer_code
          );

        const customerBankRef =
          normalizeIdentifier(
            customer.bank_ref_number
          );

        const customerName =
          normalizeName(
            customer.name
          );

        const codeMatch =
          normalizedAnalysisCode.length > 0 &&
          customerCode.length > 0 &&
          normalizedAnalysisCode ===
            customerCode;

        const bankRefMatch =
          normalizedAnalysisBankRef.length > 0 &&
          customerBankRef.length > 0 &&
          normalizedAnalysisBankRef ===
            customerBankRef;

        const nameMatch =
          normalizedAnalysisName.length > 0 &&
          customerName.length > 0 &&
          normalizedAnalysisName ===
            customerName;

        return (
          codeMatch ||
          bankRefMatch ||
          nameMatch
        );
      });

    if (!matchedCustomer) {
      return NextResponse.json(
        {
          error:
            "The customer could not be matched to an existing Invora customer.",
        },
        {
          status: 400,
        }
      );
    }

    console.log(
      "===== CUSTOMER MATCHED ====="
    );

    console.log({
      id: matchedCustomer.id,
      customerCode:
        matchedCustomer.customer_code,
      name: matchedCustomer.name,
    });

    console.log(
      "============================"
    );

    const invoiceNumber =
      analysis.invoiceNumber
        .trim()
        .toUpperCase();

    const {
      data: existingInvoice,
      error: existingInvoiceError,
    } = await supabase
      .from("invoices")
      .select("id")
      .eq(
        "invoice_number",
        invoiceNumber
      )
      .maybeSingle();

    if (existingInvoiceError) {
      throw existingInvoiceError;
    }

    if (existingInvoice) {
      return NextResponse.json(
        {
          error: `Invoice ${invoiceNumber} already exists.`,
        },
        {
          status: 409,
        }
      );
    }

    const status =
      analysis.paymentType === "cash"
        ? "paid"
        : "unpaid";

    const {
      data: invoice,
      error: invoiceError,
    } = await supabase
      .from("invoices")
      .insert({
        customer_id:
          matchedCustomer.id,

        invoice_number:
          invoiceNumber,

        amount:
          analysis.amount,

        issue_date:
          analysis.issueDate || null,

        due_date:
          analysis.dueDate || null,

        status,

        payment_type:
          analysis.paymentType,
      })
      .select(
        `
        id,
        invoice_number,
        amount,
        issue_date,
        due_date,
        status,
        payment_type,
        customer_id
        `
      )
      .single();

    if (
      invoiceError ||
      !invoice
    ) {
      throw (
        invoiceError ??
        new Error(
          "Invoice could not be created."
        )
      );
    }

    if (
      analysis.paymentType === "cash"
    ) {
      const paymentDate =
        analysis.issueDate ??
        new Date()
          .toISOString()
          .slice(0, 10);

      const {
        error: paymentError,
      } = await supabase
        .from("payments")
        .insert({
          invoice_id:
            invoice.id,

          amount:
            analysis.amount,

          payment_date:
            paymentDate,
        });

      if (paymentError) {
        console.error(
          "Payment logging error:",
          paymentError
        );
      }
    }

    console.log(
      "===== INVOICE CREATED ====="
    );

    console.log(invoice);

    console.log(
      "==========================="
    );

    return NextResponse.json({
      success: true,

      customer: {
        id:
          matchedCustomer.id,

        customerCode:
          matchedCustomer.customer_code,

        name:
          matchedCustomer.name,
      },

      invoice,
    });
  } catch (error) {
    console.error(
      "Confirm scanned invoice error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to save the scanned invoice.",
      },
      {
        status: 500,
      }
    );
  }
}