"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        setMsg("Invalid or expired reset link.");
        return;
      }
      setReady(true);
    });
  }, []);

  async function onSubmit(e: React.FormEvent) {
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

    const { error } = await supabase.auth.updateUser({ password: pwd });

    if (error) {
      setMsg(error.message);
      return;
    }

    setMsg("Password updated. Redirecting…");
    setTimeout(() => router.push("/signin"), 800);
  }

  return (
    <div className="max-w-sm mx-auto mt-20 space-y-4">
      <h1 className="text-2xl font-semibold">Set new password</h1>

      {!ready && <p className="text-sm text-gray-700">{msg ?? "Checking link…"}</p>}

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
            placeholder="Confirm password"
            value={pwd2}
            onChange={(e) => setPwd2(e.target.value)}
            required
          />

          <button className="w-full bg-blue-600 text-white py-2 rounded">
            Update password
          </button>

          {msg && <p className="text-sm text-gray-700">{msg}</p>}
        </form>
      )}
    </div>
  );
}
