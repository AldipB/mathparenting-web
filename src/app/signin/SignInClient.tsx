"use client";

import Link from "next/link";
import { useState } from "react";
import { getBrowserSupabase } from "@/lib/supabaseBrowser";

export default function SignInClient() {
  const supabase = getBrowserSupabase();
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function getNextPath(): string {
    if (typeof window === "undefined") return "/chat";
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next");
    if (!next || next.startsWith("http")) return "/chat";
    return next;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: pass,
      });
      if (error) throw error;
      const dest = getNextPath();
      window.location.href = dest;
    } catch (err: any) {
      setMsg(err?.message || "Sign-in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto space-y-4">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <input
          className="w-full border rounded px-3 py-2"
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="w-full border rounded px-3 py-2"
          type="password"
          required
          placeholder="Password"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
        />
        <button
          className="w-full rounded px-4 py-2 bg-blue-600 text-white disabled:opacity-50"
          disabled={loading}
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <div className="text-sm flex justify-between">
        <Link href="/reset-password" className="text-blue-600 hover:underline">
          Forgot password?
        </Link>
        <Link href="/signup" className="text-blue-600 hover:underline">
          Create account
        </Link>
      </div>

      {msg && <p className="text-sm text-red-600">{msg}</p>}
    </div>
  );
}
