"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { getBrowserSupabase } from "@/lib/supabaseBrowser";

export default function Dashboard() {
  const router = useRouter();
  const supabase = getBrowserSupabase();
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, nextSession: Session | null) => {
        setSession(nextSession);
      }
    );

    return () => {
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  if (!session) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-bold mb-2">Dashboard</h1>
        <p className="text-gray-600 mb-4">Please sign in to view your dashboard.</p>
        <Link
          href="/signin?next=/dashboard"
          className="inline-block rounded-lg bg-blue-600 px-4 py-2 text-white font-semibold hover:bg-blue-700"
        >
          Go to Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold mb-2">Welcome back!</h1>
      <p className="text-gray-600">
        You’re signed in as <span className="font-semibold">{session.user.email}</span>.
      </p>

      <div className="mt-6 grid gap-3">
        <Link href="/chat" className="rounded-lg border px-4 py-2 hover:bg-gray-50">
          Open Chat
        </Link>
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            router.push("/signin");
          }}
          className="rounded-lg border px-4 py-2 hover:bg-gray-50 text-left"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
