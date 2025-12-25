// src/components/HeaderClient.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { User } from "@supabase/supabase-js";
import { getBrowserSupabase } from "@/lib/supabaseBrowser";

export default function HeaderClient() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const supabase = getBrowserSupabase();

    // Load user once on page load
    supabase.auth.getUser().then(({ data, error }) => {
      if (!error) {
        setUser(data.user ?? null);
      }
      setLoading(false);
    });

    // Listen for login / logout
    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => {
      subscription.subscription.unsubscribe();
    };
  }, []);

  const initial =
    (user?.user_metadata?.full_name &&
      String(user.user_metadata.full_name)[0]) ||
    (user?.email && user.email[0]) ||
    "M";

  async function handleSignOut() {
    const supabase = getBrowserSupabase();
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70">
      <div className="mx-auto flex max-w-5xl items-center justify-between p-4">

        {/* Brand */}
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Image
            src="/logo.png"
            alt="MathParenting Logo"
            width={28}
            height={28}
            className="rounded-md"
          />
          <span>MathParenting</span>
        </Link>

        {/* Nav items */}
        <nav className="flex items-center gap-4 text-sm">
          <Link className="hover:underline" href="/">
            Home
          </Link>
          <Link className="hover:underline" href="/chat">
            Chat
          </Link>

          {/* Profile menu */}
          <div className="relative">
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white text-sm font-semibold shadow-sm"
              onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              {loading ? "…" : initial}
            </button>

            {menuOpen && (
              <div
                className="absolute right-0 mt-2 w-56 rounded-xl border bg-white shadow-lg text-sm py-2"
                role="menu"
              >
                {user ? (
                  <>
                    <div className="px-3 py-2 text-xs text-gray-500 border-b">
                      Signed in as
                      <div className="font-medium text-gray-800 truncate">
                        {user.email}
                      </div>
                    </div>

                    <Link
                      href="/account"
                      className="block px-3 py-2 hover:bg-gray-50"
                      role="menuitem"
                      onClick={() => setMenuOpen(false)}
                    >
                      Account
                    </Link>

                    <Link
                      href="/update-password"
                      className="block px-3 py-2 hover:bg-gray-50"
                      role="menuitem"
                      onClick={() => setMenuOpen(false)}
                    >
                      Change Password
                    </Link>

                    <button
                      type="button"
                      className="mt-1 block w-full text-left px-3 py-2 hover:bg-gray-50 text-red-600"
                      onClick={handleSignOut}
                      role="menuitem"
                    >
                      Sign out
                    </button>
                  </>
                ) : (
                  <>
                    <div className="px-3 py-1 text-xs text-gray-500 border-b">
                      You are not signed in
                    </div>

                    <Link
                      href="/signin"
                      className="block px-3 py-2 hover:bg-gray-50"
                      role="menuitem"
                      onClick={() => setMenuOpen(false)}
                    >
                      Sign in
                    </Link>

                    <Link
                      href="/signup"
                      className="block px-3 py-2 hover:bg-gray-50"
                      role="menuitem"
                      onClick={() => setMenuOpen(false)}
                    >
                      Sign up
                    </Link>

                    <Link
                      href="/reset-password"
                      className="block px-3 py-2 hover:bg-gray-50"
                      role="menuitem"
                      onClick={() => setMenuOpen(false)}
                    >
                      Forgot password
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
