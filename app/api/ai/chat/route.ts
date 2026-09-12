import Groq from "groq-sdk";
import { NextResponse } from "next/server";
import { createSessionClient } from "@/src/lib/supabase/server";
import { buildSystemPrompt } from "@/src/lib/prompts/dataRetrievalPrompt";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

// Caps how much conversation history is resent every turn — without this,
// request size (and cost) grows with every message in a long session.
const MAX_HISTORY_MESSAGES = 12;

export async function POST(request: Request) {
  try {
    const supabase = await createSessionClient();

    const { data: claimsData, error: authError } = await supabase.auth.getClaims();
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
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const messages = ((body.messages ?? []) as ChatMessage[]).slice(-MAX_HISTORY_MESSAGES);

    if (!messages.length) {
      return NextResponse.json({ error: "No messages supplied." }, { status: 400 });
    }

    // NOTE: single-tenant assumption. If Invora becomes multi-business,
    // add .eq("business_id", profile.business_id) to all three queries
    // below (and select business_id above) — nothing currently scopes
    // this data to one business.
    const [customersResult, invoicesResult, paymentsResult] = await Promise.all([
      // phone_number / bank_ref_number deliberately excluded below: no need
      // to send that PII to a third-party inference API for a risk-analysis
      // question. Fetch those separately in the rare feature that needs to
      // act on them (e.g. triggering contact).
      supabase
        .from("customers")
        .select("id, customer_code, name, status")
        .limit(500),
      supabase
        .from("invoices")
        .select("id, customer_id, invoice_number, amount, issue_date, due_date, status, payment_type")
        .order("due_date", { ascending: true })
        .limit(1000),
      supabase
        .from("payments")
        .select("id, invoice_id, amount, payment_date")
        .limit(2000),
    ]);

    if (customersResult.error) throw customersResult.error;
    if (invoicesResult.error) throw invoicesResult.error;
    if (paymentsResult.error) throw paymentsResult.error;

    const systemPrompt = buildSystemPrompt(
      customersResult.data ?? [],
      invoicesResult.data ?? [],
      paymentsResult.data ?? []
    );

    const completion = await groq.chat.completions.create({
      model: "openai/gpt-oss-120b",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
      ],
      temperature: 0.2,
      max_completion_tokens: 1000,
    });

    const response =
      completion.choices[0]?.message?.content ?? "I couldn't generate a response.";

    return NextResponse.json({ message: response });
  } catch (error) {
    console.error("Invora AI error:", error);

    return NextResponse.json(
      { error: "Invora AI could not process your request." },
      { status: 500 }
    );
  }
}