"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function Dashboard() {
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setEmail(data.session?.user.email ?? null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (loading) return <p>Loading…</p>;

  if (!email) {
    return (
      <div>
        <h1 className="text-xl font-semibold">Please sign in</h1>
        <p className="mt-2">
          You need an account to view the dashboard.{" "}
          <Link className="text-blue-600 underline" href="/signin">Go to Sign in</Link>
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-2">Dashboard</h1>
      <p className="text-gray-700">Signed in as <b>{email}</b></p>
    </div>
  );
}
