"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabaseBrowser";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const supabase = getBrowserSupabase();

  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function init() {
      const { data, error } = await supabase.auth.getSession();

      if (!mounted) return;

      if (error || !data.session) {
        setMsg("This reset link is invalid or expired. Please request a new one.");
        setReady(false);
        return;
      }

      setReady(true);
    }

    init();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMsg(null);

    if (pwd.length < 8) {
      setMsg("Password must be at least 8 characters.");
      return;
    }

    if (pwd !== pwd2) {
      setMsg("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pwd });

      if (error) {
        setMsg(error.message);
        return;
      }

      setMsg("Password updated. Redirecting to sign in...");
      setTimeout(() => router.push("/signin"), 800);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-16 space-y-4">
      <h1 className="text-2xl font-semibold">Set a new password</h1>

      {!ready && (
        <p className="text-sm text-gray-700">{msg || "Validating your reset link..."}</p>
      )}

      {ready && (
        <form onSubmit={onSubmit} className="space-y-3">
          <input
            className="w-full border rounded px-3 py-2"
            type="password"
            placeholder="New password"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            required
          />

          <input
            className="w-full border rounded px-3 py-2"
            type="password"
            placeholder="Confirm new password"
            value={pwd2}
            onChange={(e) => setPwd2(e.target.value)}
            required
          />

          <button
            className="w-full rounded px-4 py-2 bg-blue-600 text-white disabled:opacity-60"
            disabled={loading}
            type="submit"
          >
            {loading ? "Updating..." : "Update password"}
          </button>

          {msg && <p className="text-sm text-gray-700">{msg}</p>}
        </form>
      )}
    </div>
  );
}
