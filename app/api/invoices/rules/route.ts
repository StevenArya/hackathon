import { NextResponse } from "next/server";
import { createSessionClient } from "@/src/lib/supabase/server";

async function getAdminClient() {
  const supabase = await createSessionClient();

  const { data: claimsData, error: authError } =
    await supabase.auth.getClaims();

  const userId = claimsData?.claims?.sub;

  if (authError || !userId) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (profileError || profile?.role !== "admin") {
    return {
      error: NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      ),
    };
  }

  return { supabase };
}

export async function GET() {
  const result = await getAdminClient();

  if ("error" in result) return result.error;

  const { data, error } = await result.supabase
    .from("invoice_classification_rules")
    .select("category, label, keywords, title_patterns, color_hint, notes")
    .order("category");

  if (error) {
    return NextResponse.json(
      { error: "Unable to load classification rules." },
      { status: 500 }
    );
  }

  return NextResponse.json({ rules: data ?? [] });
}

export async function PUT(request: Request) {
  const result = await getAdminClient();

  if ("error" in result) return result.error;

  const body = await request.json();
  const rules = Array.isArray(body.rules) ? body.rules : [];

  for (const rule of rules) {
    if (!["paid", "credit", "loan"].includes(rule.category)) continue;

    const { error } = await result.supabase
      .from("invoice_classification_rules")
      .update({
        keywords: Array.isArray(rule.keywords) ? rule.keywords : [],
        title_patterns: Array.isArray(rule.title_patterns)
          ? rule.title_patterns
          : [],
        color_hint: rule.color_hint?.trim() || null,
        notes: rule.notes?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("category", rule.category);

    if (error) {
      return NextResponse.json(
        { error: "Unable to save classification rules." },
        { status: 500 }
      );
    }
  }

  const { data, error } = await result.supabase
    .from("invoice_classification_rules")
    .select("category, label, keywords, title_patterns, color_hint, notes")
    .order("category");

  if (error) {
    return NextResponse.json(
      { error: "Rules saved, but could not reload them." },
      { status: 500 }
    );
  }

  return NextResponse.json({ rules: data ?? [] });
}
