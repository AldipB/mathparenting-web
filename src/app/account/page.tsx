"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Session } from "@supabase/supabase-js";
import { getBrowserSupabase } from "@/lib/supabaseBrowser";

export default function AccountPage() {
  const supabase = getBrowserSupabase();
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) {
        setMsg(error.message);
        setSession(null);
        return;
      }
      setSession(data.session ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  if (session === undefined) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-bold mb-2">Account</h1>
        <p className="text-gray-600">Loading your account</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-bold mb-2">Account</h1>
        <p className="text-gray-600 mb-4">
          You are not signed in. Please sign in to view your account.
        </p>
        {msg && <p className="text-sm text-red-600 mb-4">{msg}</p>}
        <div className="flex gap-3">
          <Link
            href="/signin?next=/account"
            className="rounded-lg bg-blue-600 px-4 py-2 text-white font-semibold hover:bg-blue-700"
          >
            Sign in
          </Link>
          <Link href="/signup" className="rounded-lg border px-4 py-2 font-semibold hover:bg-gray-50">
            Sign up
          </Link>
        </div>
      </div>
    );
  }

  const email = session.user.email ?? "";
  const fullName = (session.user.user_metadata?.full_name as string | undefined) ?? "";

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold mb-2">Account</h1>

      <div className="rounded-2xl border bg-white p-5 space-y-2">
        <div className="text-sm text-gray-600">Signed in as</div>
        <div className="font-semibold text-gray-900">{email}</div>

        {fullName && (
          <>
            <div className="pt-3 text-sm text-gray-600">Name</div>
            <div className="font-medium text-gray-900">{fullName}</div>
          </>
        )}

        <div className="pt-4 flex flex-wrap gap-3">
          <Link href="/update-password" className="rounded-lg border px-4 py-2 hover:bg-gray-50">
            Change password
          </Link>

          <button
            type="button"
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/";
            }}
            className="rounded-lg border px-4 py-2 hover:bg-gray-50 text-left text-red-600"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
