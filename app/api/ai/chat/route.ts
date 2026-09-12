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
          "id, customer_code, name, status, phone_number, bank_ref_number"
        ),

      supabase
        .from("invoices")
        .select(
          "id, customer_id, invoice_number, amount, issue_date, due_date, status, payment_type"
        ),

      supabase
        .from("payments")
        .select(
          "id, invoice_id, amount, payment_date"
        ),
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

    const systemPrompt = `
You are Invora AI, an accounts receivable and credit-risk assistant.

You help finance administrators understand customers, invoices,
payments, overdue balances, and credit risk.

Today is ${new Date().toISOString().slice(0, 10)}.

Rules:
- Only use the business data provided below.
- Never invent customers, invoices, payments, dates, or amounts.
- If the data does not answer the question, say so.
- Money values are Indonesian Rupiah unless stated otherwise.
- Keep responses concise and useful.
- When discussing customer risk, explain the reasons.
- Prioritise overdue invoices and high-risk customers.
- A customer with status "danger" is the highest risk.
- "level_2" is higher risk than "level_1".
- "good" is the lowest risk.
- Give actionable recommendations where appropriate.
- Do not claim that an invoice has been paid unless its status or payment data supports it.

BUSINESS DATA

CUSTOMERS:
${JSON.stringify(customers, null, 2)}

INVOICES:
${JSON.stringify(invoices, null, 2)}

PAYMENTS:
${JSON.stringify(payments, null, 2)}
`;

    const completion = await groq.chat.completions.create({
      model: "openai/gpt-oss-120b",

      messages: [
        {
          role: "system",
          content: systemPrompt,
        },

        ...messages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
      ],

      temperature: 0.2,
      max_completion_tokens: 1000,
    });

    const response =
      completion.choices[0]?.message?.content ??
      "I couldn't generate a response.";

    return NextResponse.json({
      message: response,
    });
  } catch (error) {
    console.error("Invora AI error:", error);

    return NextResponse.json(
      {
        error: "Invora AI could not process your request.",
      },
      {
        status: 500,
      }
    );
  }
}