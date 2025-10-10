"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function UpdatePassword() {
  const [pwd, setPwd] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null); setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pwd });
      setMsg(error ? error.message : "Password updated. You can now sign in.");
    } finally { setLoading(false); }
  }

  return (
    <div className="max-w-sm mx-auto space-y-3">
      <h1 className="text-2xl font-semibold">Set a new password</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <input className="w-full border rounded px-3 py-2" type="password" placeholder="New password"
               value={pwd} onChange={e=>setPwd(e.target.value)} required />
        <button className="w-full rounded px-4 py-2 bg-blue-600 text-white disabled:opacity-60" disabled={loading}>
          {loading ? "Updating..." : "Update password"}
        </button>
      </form>
      {msg && <p className="text-sm text-gray-700">{msg}</p>}
    </div>
  );
}
