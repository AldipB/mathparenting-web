"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import ChatPageClient from "./ChatPageClient";
import { getBrowserSupabase } from "@/lib/supabaseBrowser";
import ErrorBoundary from "@/components/ErrorBoundary";

export default function ChatPage() {
  const supabase = getBrowserSupabase();
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        console.error("Error getting session:", error.message);
        setSession(null);
        return;
      }
      setSession(data.session ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  if (session === undefined) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center">
        <div className="max-w-2xl mx-auto text-center space-y-4 p-6">
          <h1 className="text-xl font-semibold">Loading MathParenting Chat…</h1>
          <p className="text-gray-600 text-sm">Checking your sign in status.</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center">
        <div className="max-w-2xl mx-auto text-center space-y-4 p-6 border rounded-2xl shadow-sm bg-white">
          <h1 className="text-2xl font-bold">Sign in to use MathParenting Chat</h1>
          <p className="text-gray-600 text-sm">
            The chat is only available for signed in users. Please sign in or create an account.
          </p>
          <div className="flex justify-center gap-3">
            <a
              href="/signin?next=/chat"
              className="rounded-lg px-4 py-2 text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700"
            >
              Sign in
            </a>
            <a
              href="/signup"
              className="rounded-lg px-4 py-2 text-sm font-semibold border border-gray-300 hover:bg-gray-50"
            >
              Sign up
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <ChatPageClient />
    </ErrorBoundary>
  );
}