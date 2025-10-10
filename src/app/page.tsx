"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function Home() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setEmail(data.session?.user.email ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold">app router home</h1>
      {email ? (
        <p className="text-green-700">Signed in as <b>{email}</b></p>
      ) : (
        <p className="text-gray-700">You are not signed in. <Link className="text-blue-600 underline" href="/signin">Go to Sign in</Link></p>
      )}
    </div>
  );
}
