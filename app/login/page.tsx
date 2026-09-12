"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/src/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setLoading(true);

    const { data, error: loginError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (loginError) {
      setError(loginError.message);
      setLoading(false);
      return;
    }

    if (!data.user) {
      setError("Unable to sign in.");
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    if (profileError || !profile) {
      setError("Unable to load your profile.");
      setLoading(false);
      return;
    }

    if (profile.role === "admin") {
      router.push("/admin/dashboard");
    } else {
      router.push("/dashboard");
    }

    router.refresh();
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-yellow-50 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-pink-100 bg-white p-8 shadow-xl shadow-pink-200/50">
        <Link href="/" className="mb-8 inline-flex items-center gap-3 text-xl font-semibold text-stone-500"><span className="brand-mark" aria-hidden="true"><span /><span /><span /></span>Creditly</Link>
        <div className="mb-8">
          <p className="mb-2 text-sm font-semibold text-stone-500">
            Credit Management
          </p>

          <h1 className="text-3xl font-bold text-pink-500">
            Welcome back
          </h1>

          <p className="mt-2 text-sm text-stone-600">
            Sign in to access your account.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-stone-700"
            >
              Email
            </label>

            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-pink-200 px-4 py-3 text-stone-800 outline-none transition focus:border-pink-400"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-stone-700"
            >
              Password
            </label>

            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              className="w-full rounded-xl border border-pink-200 px-4 py-3 text-stone-800 outline-none transition focus:border-pink-400"
            />
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-pink-200 px-4 py-3 font-semibold text-pink-800 transition hover:bg-pink-300 disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-stone-600">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="font-semibold text-pink-500 hover:underline"
          >
            Sign up
          </Link>
        </p>
      </div>
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="inline-flex rounded-xl bg-pink-200 px-5 py-3 text-sm font-semibold text-pink-800 transition hover:bg-pink-300"
        >
          Go back to home
        </Link>
      </div>
    </main>
  );
}
