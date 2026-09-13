import Groq from "groq-sdk";
import { NextResponse } from "next/server";
import { createSessionClient } from "@/src/lib/supabase/server";

type AnalysisResult = {
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

function parseAmount(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

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

function normalizePaymentType(
  value: unknown
): "cash" | "credit" | "loan" | null {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();

  if (normalized === "cash") {
    return "cash";
  }

  if (normalized === "credit") {
    return "credit";
  }

  if (normalized === "loan") {
    return "loan";
  }

  return null;
}

function extractJson(text: string) {
  const cleaned = text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    console.error("AI response without JSON:", text);

    throw new Error(
      "Invora AI did not return readable invoice data."
    );
  }

  const jsonText = cleaned.slice(start, end + 1);

  try {
    return JSON.parse(jsonText);
  } catch (error) {
    console.error("Invalid AI JSON:", jsonText);
    console.error("JSON parse error:", error);

    throw new Error(
      "Invora AI returned invalid invoice data."
    );
  }
}

export async function POST(request: Request) {
  try {
    const groqApiKey = process.env.GROQ_API_KEY;

    if (!groqApiKey) {
      return NextResponse.json(
        {
          error: "GROQ_API_KEY is not configured.",
        },
        {
          status: 500,
        }
      );
    }

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

    const formData = await request.formData();

    const imageEntries = formData.getAll("images");

    if (imageEntries.length === 0) {
      return NextResponse.json(
        {
          error: "At least one invoice image is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (imageEntries.length > 5) {
      return NextResponse.json(
        {
          error:
            "A maximum of 5 invoice pages can be scanned at once.",
        },
        {
          status: 400,
        }
      );
    }

    const files = imageEntries.filter(
      (item): item is File => item instanceof File
    );

    if (files.length !== imageEntries.length) {
      return NextResponse.json(
        {
          error: "Invalid invoice file.",
        },
        {
          status: 400,
        }
      );
    }

    const allowedMimeTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    for (const file of files) {
      if (!allowedMimeTypes.includes(file.type)) {
        return NextResponse.json(
          {
            error:
              "Only JPG, PNG, and WebP images can be analysed.",
          },
          {
            status: 400,
          }
        );
      }

      if (file.size > 20 * 1024 * 1024) {
        return NextResponse.json(
          {
            error:
              "Each invoice image must be smaller than 20 MB.",
          },
          {
            status: 413,
          }
        );
      }
    }

    const imageContents: Array<{
      type: "image_url";
      image_url: {
        url: string;
      };
    }> = [];

    for (const file of files) {
      const buffer = Buffer.from(
        await file.arrayBuffer()
      );

      const dataUrl =
        `data:${file.type};base64,` +
        buffer.toString("base64");

      imageContents.push({
        type: "image_url",
        image_url: {
          url: dataUrl,
        },
      });
    }

    const {
      data: customers,
      error: customersError,
    } = await supabase
      .from("customers")
      .select(
        "id, customer_code, name, bank_ref_number"
      )
      .order("name");

    if (customersError) {
      throw customersError;
    }

    const customerReference = (customers ?? []).map(
      (customer) => ({
        customerCode: customer.customer_code,
        name: customer.name,
        bankRefNumber: customer.bank_ref_number,
      })
    );

    const prompt = `
You are Invora AI.

Read the supplied invoice document.

There may be multiple images because a PDF has been converted into individual pages.

All supplied pages belong to the same invoice.

Extract ONLY information that is visibly present in the document.

Do not guess.
Do not invent values.
Do not invent customers.
Do not invent invoice numbers.
Do not invent amounts.

REGISTERED CUSTOMERS:

${JSON.stringify(customerReference)}

Use visible information to identify the customer, including:

- customer name
- customer code
- customer ID
- bank reference number
- invoice recipient details

If the visible invoice clearly matches a registered customer, return that customer's exact registered:
- name
- customerCode
- bankRefNumber

Extract the following:

1. invoiceNumber
2. customerName
3. customerCode
4. bankRefNumber
5. amount
6. issueDate
7. dueDate
8. paymentType
9. confidence
10. reasoning

PAYMENT TYPE

Valid values:

cash
credit
loan

Use visible information such as:
- invoice title
- payment method
- payment terms
- credit wording
- financing wording
- loan wording
- invoice labels
- visual identifiers

Do not classify only from colour if visible text contradicts it.

Use "cash" if it clearly represents a direct or cash payment.

Use "credit" if it clearly represents customer credit or accounts receivable.

Use "loan" if it clearly represents financing or lending.

If payment type cannot be reliably identified, return null.

AMOUNT

Return the total invoice amount as a plain number.

Example:

Rp 3.250.000

must become:

3250000

DATES

Return dates as:

YYYY-MM-DD

Example:

12 September 2026

must become:

2026-09-12

RETURN FORMAT

Return ONLY one JSON object.

Do not use markdown.
Do not use code fences.
Do not write anything before the JSON.
Do not write anything after the JSON.

Use exactly these keys:

{
  "invoiceNumber": null,
  "customerName": null,
  "customerCode": null,
  "bankRefNumber": null,
  "amount": null,
  "issueDate": null,
  "dueDate": null,
  "paymentType": null,
  "confidence": 0,
  "reasoning": ""
}

Rules:

- Use null if information is not visible.
- amount must be a number.
- confidence must be a number between 0 and 1.
- reasoning must be one short sentence.
`;

    const groq = new Groq({
      apiKey: groqApiKey,
    });

    const completion =
      await groq.chat.completions.create({
        model: "qwen/qwen3.6-27b",

        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt,
              },
              ...imageContents,
            ],
          },
        ],

        temperature: 0.7,
        top_p: 0.8,

        max_completion_tokens: 700,

        reasoning_effort: "none",

        stream: false,
      });

    const message =
      completion.choices[0]?.message;

    console.log(
      "===== INVORA GROQ FULL MESSAGE ====="
    );

    console.dir(message, {
      depth: null,
    });

    console.log(
      "===================================="
    );

    const raw =
      message?.content?.trim();

    if (!raw) {
      console.error(
        "Groq returned empty content."
      );

      console.error(
        "Full choice:",
        completion.choices[0]
      );

      return NextResponse.json(
        {
          error:
            "Invora AI could not extract invoice data from this document. Please try a clearer image or PDF.",
        },
        {
          status: 502,
        }
      );
    }

    const parsed =
      extractJson(raw) as Partial<AnalysisResult>;

    const analysis: AnalysisResult = {
      invoiceNumber:
        parsed.invoiceNumber !== null &&
        parsed.invoiceNumber !== undefined
          ? String(parsed.invoiceNumber).trim()
          : null,

      customerName:
        parsed.customerName !== null &&
        parsed.customerName !== undefined
          ? String(parsed.customerName).trim()
          : null,

      customerCode:
        parsed.customerCode !== null &&
        parsed.customerCode !== undefined
          ? String(parsed.customerCode).trim()
          : null,

      bankRefNumber:
        parsed.bankRefNumber !== null &&
        parsed.bankRefNumber !== undefined
          ? String(parsed.bankRefNumber).trim()
          : null,

      amount: parseAmount(parsed.amount),

      issueDate:
        parsed.issueDate !== null &&
        parsed.issueDate !== undefined
          ? String(parsed.issueDate).trim()
          : null,

      dueDate:
        parsed.dueDate !== null &&
        parsed.dueDate !== undefined
          ? String(parsed.dueDate).trim()
          : null,

      paymentType: normalizePaymentType(
        parsed.paymentType
      ),

      confidence: Math.max(
        0,
        Math.min(
          1,
          Number(parsed.confidence ?? 0)
        )
      ),

      reasoning: String(
        parsed.reasoning ?? ""
      ).trim(),
    };

    console.log(
      "===== INVORA INVOICE ANALYSIS ====="
    );

    console.dir(analysis, {
      depth: null,
    });

    console.log(
      "===================================="
    );

    return NextResponse.json({
      analysis,
    });
  } catch (error) {
    console.error(
      "Invoice analysis error:",
      error
    );

    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === "development" &&
          error instanceof Error
            ? error.message
            : "Invora could not analyse this invoice.",
      },
      {
        status: 500,
      }
    );
  }
}