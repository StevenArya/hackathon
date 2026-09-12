import Groq from "groq-sdk";
import { NextResponse } from "next/server";
import { createSessionClient } from "@/src/lib/supabase/server";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export async function POST(request: Request) {
  try {
    const supabase = await createSessionClient();

    const { data: claimsData, error: authError } =
      await supabase.auth.getClaims();

    const userId = claimsData?.claims?.sub;

    if (authError || !userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
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

    const messages = (body.messages ?? []) as ChatMessage[];

    if (!messages.length) {
      return NextResponse.json(
        { error: "No messages supplied." },
        { status: 400 }
      );
    }

    const [
      customersResult,
      invoicesResult,
      paymentsResult,
    ] = await Promise.all([
      supabase
        .from("customers")
        .select(
          "id, customer_code, name, status, bank_ref_number"
        )
        .order("created_at", { ascending: false }),

      supabase
        .from("invoices")
        .select(
          "id, customer_id, invoice_number, amount, issue_date, due_date, status, payment_type"
        )
        .order("due_date", { ascending: true }),

      supabase
        .from("payments")
        .select(
          "id, invoice_id, amount, payment_date"
        )
        .order("payment_date", { ascending: false }),
    ]);

    if (customersResult.error) {
      throw customersResult.error;
    }

    if (invoicesResult.error) {
      throw invoicesResult.error;
    }

    if (paymentsResult.error) {
      throw paymentsResult.error;
    }

    const customers = customersResult.data ?? [];
    const invoices = invoicesResult.data ?? [];
    const payments = paymentsResult.data ?? [];

    const overdueInvoices = invoices
      .filter((invoice) => invoice.status === "overdue")
      .slice(0, 15);

    const unpaidInvoices = invoices
      .filter((invoice) => invoice.status === "unpaid")
      .slice(0, 15);

    const highRiskCustomers = customers
      .filter((customer) =>
        ["danger", "level_2", "level_1"].includes(customer.status)
      )
      .slice(0, 15);

    const recentPayments = payments.slice(0, 10);

    const totalOutstanding = invoices
      .filter((invoice) => invoice.status !== "paid")
      .reduce(
        (sum, invoice) => sum + Number(invoice.amount ?? 0),
        0
      );

    const totalPaid = invoices
      .filter((invoice) => invoice.status === "paid")
      .reduce(
        (sum, invoice) => sum + Number(invoice.amount ?? 0),
        0
      );

    const summary = {
      totalCustomers: customers.length,
      totalInvoices: invoices.length,
      totalOutstanding,
      totalPaid,
      overdueCount: invoices.filter(
        (invoice) => invoice.status === "overdue"
      ).length,
      unpaidCount: invoices.filter(
        (invoice) => invoice.status === "unpaid"
      ).length,
      paidCount: invoices.filter(
        (invoice) => invoice.status === "paid"
      ).length,
      dangerCustomers: customers.filter(
        (customer) => customer.status === "danger"
      ).length,
      level2Customers: customers.filter(
        (customer) => customer.status === "level_2"
      ).length,
      level1Customers: customers.filter(
        (customer) => customer.status === "level_1"
      ).length,
    };

    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

    const systemPrompt = `
You are Invora AI, an accounts receivable and credit-risk assistant.

You help finance administrators understand customers, invoices,
payments, overdue balances, and credit risk.

Today is ${today}.

RULES:
- Only use the business data provided below.
- Never invent customers, invoices, payments, dates, or amounts.
- If the provided data is not enough to answer a question, say so.
- Money values are Indonesian Rupiah.
- Keep responses concise, clear, and useful.
- Risk order from highest to lowest:
  danger > level_2 > level_1 > good.
- Prioritise overdue invoices and high-risk customers.
- Explain briefly why a customer is considered risky.
- Give actionable recommendations where appropriate.
- Never claim an invoice is paid unless its status or payment data supports it.
- Format money clearly using Rp.
- When asked for the highest-risk customer, use customer status first.
- When multiple customers have the same risk status, use overdue exposure as supporting information.

PORTFOLIO SUMMARY:
${JSON.stringify(summary)}

HIGH-RISK CUSTOMERS:
${JSON.stringify(highRiskCustomers)}

OVERDUE INVOICES:
${JSON.stringify(overdueInvoices)}

UNPAID INVOICES:
${JSON.stringify(unpaidInvoices)}

RECENT PAYMENTS:
${JSON.stringify(recentPayments)}
`;

    const recentMessages = messages.slice(-6);

    const completion = await groq.chat.completions.create({
      model: "openai/gpt-oss-120b",

      messages: [
        {
          role: "system",
          content: systemPrompt,
        },

        ...recentMessages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
      ],

      temperature: 0.2,
      max_completion_tokens: 700,
    });

    const response =
      completion.choices[0]?.message?.content ??
      "I couldn't generate a response.";

    return NextResponse.json({
      message: response,
    });
  } catch (error) {
    console.error("Invora AI error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Unknown server error";

    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === "development"
            ? message
            : "Invora AI could not process your request.",
      },
      {
        status: 500,
      }
    );
  }
}