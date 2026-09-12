"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/src/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    const { data, error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (signupError) {
      setError(signupError.message);
      setLoading(false);
      return;
    }

    if (data.session) {
      router.push("/dashboard");
      router.refresh();
      return;
    }

    setMessage(
      "Account created. Please check your email to confirm your account."
    );

    setLoading(false);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-yellow-50 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-pink-100 bg-white p-8 shadow-xl shadow-y1 shadow-pink-200/50">
        <Link href="/" className="mb-8 inline-flex items-center gap-3 text-xl font-semibold text-stone-500">
        <span className="brand-mark" aria-hidden="true">
          <span /><span /><span /></span>Creditly</Link>
        <div className="mb-8">
          <p className="mb-2 text-sm font-semibold text-stone-500">
            Credit Management
          </p>

          <h1 className="text-3xl font-bold text-pink-500">
            Create account
          </h1>

          <p className="mt-2 text-sm text-stone-600">
            Create your customer account.
          </p>
        </div>

        <form onSubmit={handleSignup} className="space-y-5">
          <div>
            <label
              htmlFor="fullName"
              className="mb-2 block text-sm font-medium text-stone-700"
            >
              Full name
            </label>

            <input
              id="fullName"
              type="text"
              required
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Your full name"
              className="w-full rounded-xl border border-pink-200 px-4 py-3 text-stone-800 outline-none focus:border-pink-400"
            />
          </div>

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
              className="w-full rounded-xl border border-pink-200 px-4 py-3 text-stone-800 outline-none focus:border-pink-400"
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
              placeholder="Create a password"
              className="w-full rounded-xl border border-pink-200 px-4 py-3 text-stone-800 outline-none focus:border-pink-400"
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-2 block text-sm font-medium text-stone-700"
            >
              Confirm password
            </label>

            <input
              id="confirmPassword"
              type="password"
              required
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Repeat your password"
              className="w-full rounded-xl border border-pink-200 px-4 py-3 text-stone-800 outline-none focus:border-pink-400"
            />
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {message && (
            <div className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-pink-200 px-4 py-3 font-semibold text-pink-800 transition hover:bg-pink-300 disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-stone-600">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-pink-500 hover:underline"
          >
            Sign in
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
