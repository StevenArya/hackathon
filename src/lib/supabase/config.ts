import "server-only";

export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase configuration is missing.");
  if (!key.startsWith("sb_publishable_")) {
    // Legacy anon keys are supported, but privileged keys must never be used.
    try {
      const payload = JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString());
      if (payload.role !== "anon") throw new Error("Not an anon key");
    } catch {
      throw new Error("Use a Supabase publishable or legacy anon key, never a secret/service role key.");
    }
  }
  return { url, key };
}
