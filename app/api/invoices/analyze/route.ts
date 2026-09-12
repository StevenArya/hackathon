import Groq from "groq-sdk";
import { NextResponse } from "next/server";
import { createSessionClient } from "@/src/lib/supabase/server";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

type Analysis = {
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
};

function normalize(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function parseAmount(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;

  if (typeof value !== "string") return null;

  const cleaned = value.replace(/[^\d.,-]/g, "").replace(/\./g, "").replace(",", ".");
  const parsed = Number(cleaned);

  return Number.isFinite(parsed) ? parsed : null;
}

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
    const imageDataUrl = body.imageDataUrl as string | undefined;

    if (!imageDataUrl?.startsWith("data:image/")) {
      return NextResponse.json(
        { error: "A valid invoice image is required." },
        { status: 400 }
      );
    }

    if (imageDataUrl.length > 16_000_000) {
      return NextResponse.json(
        { error: "Image is too large. Please use a smaller image." },
        { status: 413 }
      );
    }

    const [{ data: rules, error: rulesError }, { data: customers, error: customersError }] =
      await Promise.all([
        supabase
          .from("invoice_classification_rules")
          .select(
            "category, label, keywords, title_patterns, color_hint, notes"
          )
          .order("category"),
        supabase
          .from("customers")
          .select("id, name, customer_code, bank_ref_number"),
      ]);

    if (rulesError) throw rulesError;
    if (customersError) throw customersError;

    const prompt = `
You are Invora's invoice/faktur document classifier.

Analyse the supplied invoice image and return ONLY JSON.

The business has supplied these classification identifiers:
${JSON.stringify(rules ?? [], null, 2)}

Classification meanings:
- paid: clear evidence that the invoice/faktur is fully paid or settled.
- credit: a normal trade-credit invoice payable later.
- loan: a loan, financing, instalment, or borrowing document.
- unknown: evidence is too weak or conflicting.

Important:
- Do NOT classify by colour alone.
- Use document title, visible words, stamps, due/payment wording, layout and colour together.
- Business-supplied identifiers are evidence, not absolute truth.
- Do not invent text that is not visible.
- Extract identifiers exactly when possible.
- Amount must be a plain number without currency symbols or separators.
- Dates must be YYYY-MM-DD when confidently readable; otherwise null.
- Confidence must be between 0 and 1.

Return this JSON shape:
{
  "classification": "paid" | "credit" | "loan" | "unknown",
  "confidence": 0.0,
  "matchedSignals": ["signal 1", "signal 2"],
  "reasoning": "short explanation",
  "invoiceNumber": "string or null",
  "customerCode": "string or null",
  "bankReference": "string or null",
  "customerName": "string or null",
  "amount": 0,
  "issueDate": "YYYY-MM-DD or null",
  "dueDate": "YYYY-MM-DD or null",
  "title": "visible document title or null"
}
`;

    const completion = await groq.chat.completions.create({
      model: "qwen/qwen3.6-27b",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt,
            },
            {
              type: "image_url",
              image_url: {
                url: imageDataUrl,
              },
            },
          ],
        },
      ],
      temperature: 0.1,
      max_completion_tokens: 1200,
      response_format: {
        type: "json_object",
      },
    });

    const raw = completion.choices[0]?.message?.content;

    if (!raw) {
      return NextResponse.json(
        { error: "The AI did not return an analysis." },
        { status: 502 }
      );
    }

    const parsed = JSON.parse(raw) as Partial<Analysis>;

    const allowed = new Set(["paid", "credit", "loan", "unknown"]);

    const analysis: Analysis = {
      classification: allowed.has(parsed.classification ?? "")
        ? (parsed.classification as Analysis["classification"])
        : "unknown",
      confidence: Math.max(0, Math.min(1, Number(parsed.confidence ?? 0))),
      matchedSignals: Array.isArray(parsed.matchedSignals)
        ? parsed.matchedSignals.map(String).slice(0, 10)
        : [],
      reasoning: String(parsed.reasoning ?? ""),
      invoiceNumber: parsed.invoiceNumber
        ? String(parsed.invoiceNumber).trim()
        : null,
      customerCode: parsed.customerCode
        ? String(parsed.customerCode).trim()
        : null,
      bankReference: parsed.bankReference
        ? String(parsed.bankReference).trim()
        : null,
      customerName: parsed.customerName
        ? String(parsed.customerName).trim()
        : null,
      amount: parseAmount(parsed.amount),
      issueDate: parsed.issueDate ? String(parsed.issueDate) : null,
      dueDate: parsed.dueDate ? String(parsed.dueDate) : null,
      title: parsed.title ? String(parsed.title).trim() : null,
    };

    const customerList = customers ?? [];

    let matchedCustomer =
      customerList.find(
        (customer) =>
          analysis.customerCode &&
          normalize(customer.customer_code) === normalize(analysis.customerCode)
      ) ?? null;

    if (!matchedCustomer) {
      matchedCustomer =
        customerList.find(
          (customer) =>
            analysis.bankReference &&
            customer.bank_ref_number &&
            normalize(customer.bank_ref_number) ===
              normalize(analysis.bankReference)
        ) ?? null;
    }

    if (!matchedCustomer) {
      matchedCustomer =
        customerList.find(
          (customer) =>
            analysis.customerName &&
            normalize(customer.name) === normalize(analysis.customerName)
        ) ?? null;
    }

    return NextResponse.json({
      analysis: {
        ...analysis,
        matchedCustomer,
      },
    });
  } catch (error) {
    console.error("Invoice analysis error:", error);

    return NextResponse.json(
      { error: "Invora could not analyse this invoice." },
      { status: 500 }
    );
  }
}
