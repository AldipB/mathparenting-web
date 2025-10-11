"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({ email, password: pwd });
      setMsg(error ? error.message : "Sign-up successful. Check your email if confirmations are enabled.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto space-y-3">
      <h1 className="text-2xl font-semibold">Sign up</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <input className="w-full border rounded px-3 py-2" type="email" required
               placeholder="you@example.com" value={email} onChange={(e)=>setEmail(e.target.value)} />
        <input className="w-full border rounded px-3 py-2" type="password" required
               placeholder="Create a password" value={pwd} onChange={(e)=>setPwd(e.target.value)} />
        <button className="w-full rounded px-4 py-2 bg-blue-600 text-white disabled:opacity-60" disabled={loading}>
          {loading ? "Creating..." : "Create account"}
        </button>
      </form>
      {msg && <p className="text-sm text-gray-700">{msg}</p>}
    </div>
  );
}
