// src/app/signup/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { getBrowserSupabase } from "@/lib/supabaseBrowser";

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    if (!agreed) {
      setMsg("Please agree to the Terms of Service and Privacy Policy to continue.");
      return;
    }

    setLoading(true);

    try {
      const supabase = getBrowserSupabase();
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName || null,
          },
          emailRedirectTo:
            typeof window !== "undefined"
              ? `${window.location.origin}/signin`
              : undefined,
        },
      });

      if (error) {
        setMsg(error.message);
      } else {
        setMsg(
          "Check your email to confirm your account. After confirming, you can sign in."
        );
        setEmail("");
        setPassword("");
      }
    } catch (err: any) {
      setMsg(err?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto space-y-4">
      <h1 className="text-2xl font-semibold">Create your account</h1>

      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className="block text-sm font-medium mb-1">Full name</label>
          <input
            className="w-full border rounded px-3 py-2 text-sm"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Optional"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            className="w-full border rounded px-3 py-2 text-sm"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Password</label>
          <input
            className="w-full border rounded px-3 py-2 text-sm"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
          />
        </div>

        <label className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer"
          />
          <span>
            I am 18 or older and I agree to the{" "}
            <Link
              href="/terms"
              target="_blank"
              className="text-blue-600 hover:underline font-medium"
            >
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              href="/privacy"
              target="_blank"
              className="text-blue-600 hover:underline font-medium"
            >
              Privacy Policy
            </Link>
            .
          </span>
        </label>

        <button
          type="submit"
          disabled={loading || !agreed}
          className="w-full rounded bg-blue-600 text-white py-2 text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? "Creating account..." : "Sign up"}
        </button>
      </form>

      {msg && <p className="text-sm text-gray-700">{msg}</p>}

      <p className="text-sm text-gray-600">
        Already have an account?{" "}
        <Link href="/signin" className="text-blue-600 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
