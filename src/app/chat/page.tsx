"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import ChatPageClient from "./ChatPageClient";
import { getBrowserSupabase } from "@/lib/supabaseBrowser";
import ErrorBoundary from "@/components/ErrorBoundary";

export default function ChatPage() {
  const supabase = getBrowserSupabase();
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [isSubscribed, setIsSubscribed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

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

  useEffect(() => {
    if (!session?.user?.email) return;

    fetch("/api/check-subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: session.user.email }),
    })
      .then((res) => res.json())
      .then((data) => setIsSubscribed(data.subscribed));
  }, [session]);

  const handleSubscribe = async () => {
    if (!session?.user?.email) return;
    setLoading(true);

    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: session.user.email }),
    });

    const data = await res.json();
    if (data.url) window.location.href = data.url;
    setLoading(false);
  };

  if (session === undefined || isSubscribed === null && session !== null) {
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

  if (!isSubscribed) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center">
        <div className="max-w-2xl mx-auto text-center space-y-6 p-8 border rounded-2xl shadow-sm bg-white">
          <img src="/logo.png" alt="MathParenting" className="w-20 h-20 mx-auto" />
          <h1 className="text-2xl font-bold">Start Your MathParenting Journey</h1>
          <p className="text-gray-600">
            Guide your child through K-12 math with confidence. Step by step coaching that turns any parent into their child's math mentor.
          </p>
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-3xl font-bold">$12.99 <span className="text-base font-normal text-gray-500">USD / month</span></p>
          </div>
          <button
            onClick={handleSubscribe}
            disabled={loading}
            className="w-full rounded-lg px-6 py-3 text-base font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Redirecting to checkout..." : "Subscribe Now"}
          </button>
          <p className="text-xs text-gray-400">Cancel anytime. Secure payment via Stripe.</p>
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