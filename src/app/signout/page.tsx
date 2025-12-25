// src/app/signout/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabaseBrowser";

export default function SignOutPage() {
  const r = useRouter();

  useEffect(() => {
    const supabase = getBrowserSupabase();
    supabase.auth.signOut().finally(() => {
      r.replace("/");
    });
  }, [r]);

  return (
    <div className="max-w-sm mx-auto">
      <p className="text-sm text-gray-600">Signing you out…</p>
    </div>
  );
}
