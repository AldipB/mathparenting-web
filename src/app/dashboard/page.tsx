"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link"; // keep this

export default function Dashboard() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setEmail(data.session?.user.email ?? null);
      setLoading(false);
      if (!data.session) router.replace("/signin?redirectedFrom=/dashboard");
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user?.email ?? null);
      if (!session) router.replace("/signin?redirectedFrom=/dashboard");
    });
    return () => sub.subscription.unsubscribe();
  }, [router]);

  if (loading) return <p>Loading…</p>;
  if (!email) return null;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="text-gray-700">Signed in as <b>{email}</b></p>
      <button
        onClick={async () => {
          await supabase.auth.signOut();
          router.replace("/signin?redirectedFrom=/dashboard");
        }}
        className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
      >
        Sign out
      </button>

      <p className="text-sm text-gray-500">
        Need to change account? <Link className="text-blue-600 underline" href="/signin">Sign in</Link> again.
      </p>
    </div>
  );
}
