"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: pwd,
      });
      if (error) {
        setMsg(error.message);
      } else {
        setMsg(`Signed in as ${data.user?.email ?? "user"}`);
      }
    } finally {
      setLoading(false);
    }
  }

  async function onSignOut() {
    setLoading(true);
    setMsg(null);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) setMsg(error.message);
      else setMsg("Signed out");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Sign in</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full border rounded px-3 py-2"
        />
        <input
          type="password"
          required
          value={pwd}
          onChange={(e) => setPwd(e.target.value)}
          placeholder="Your password"
          className="w-full border rounded px-3 py-2"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded px-4 py-2 bg-blue-600 text-white disabled:opacity-60"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <button
        onClick={onSignOut}
        disabled={loading}
        className="mt-3 w-full rounded px-4 py-2 border"
      >
        Sign out
      </button>

      {msg && <p className="mt-4 text-sm text-gray-700">{msg}</p>}

      <p className="mt-6 text-sm text-gray-500">
        Don’t have an account? Create one in your Supabase Auth users tab or wire a sign-up form next.
      </p>
    </div>
  );
}
