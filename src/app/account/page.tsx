"use client";

import { useEffect, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabaseBrowser";
import type { Session } from "@supabase/supabase-js";

export default function AccountPage() {
  const supabase = getBrowserSupabase();
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
    });
  }, [supabase]);

  if (!session) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-4">Account</h1>

      <div className="rounded-xl border p-4 bg-white">
        <p className="text-sm text-gray-600">Signed in as</p>
        <p className="font-semibold">{session.user.email}</p>

        <div className="mt-4 flex gap-3">
          <a href="/update-password" className="border px-4 py-2 rounded">
            Change password
          </a>

          <button
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/";
            }}
            className="border px-4 py-2 rounded text-red-600"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
