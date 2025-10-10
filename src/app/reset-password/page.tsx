"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function ResetPassword() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null); setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: typeof window !== "undefined" 
          ? `${window.location.origin}/update-password`
          : undefined,
      });
      setMsg(error ? error.message : "Check your email for the reset link.");
    } finally { setLoading(false); }
  }

  return (
    <div className="max-w-sm mx-auto space-y-3">
      <h1 className="text-2xl font-semibold">Forgot password</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <input className="w-full border rounded px-3 py-2" type="email" required placeholder="you@example.com"
               value={email} onChange={e=>setEmail(e.target.value)} />
        <button className="w-full rounded px-4 py-2 bg-blue-600 text-white disabled:opacity-60" disabled={loading}>
          {loading ? "Sending..." : "Send reset link"}
        </button>
      </form>
      {msg && <p className="text-sm text-gray-700">{msg}</p>}
    </div>
  );
}
