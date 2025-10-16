"use client";

import Link from "next/link";
import Image from "next/image";
import { useRef } from "react";

export default function HeaderClient() {
  const searchRef = useRef<HTMLInputElement>(null);

  return (
    <header className="sticky top-0 z-50 h-16 w-full border-b bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-4">
        {/* Brand */}
        <div className="flex items-center gap-2">
          <Image
            src="/logo.png"
            alt="MathParenting"
            width={28}
            height={28}
            className="rounded-md"
            onError={(e) => {
              // Hide image if it fails to load (optional)
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <Link href="/" className="font-semibold tracking-tight">
            MathParenting
          </Link>
        </div>

        {/* Nav + quick search */}
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/chat" className="hover:underline">
            Chat
          </Link>
          <Link href="/courses" className="hover:underline">
            Courses
          </Link>
          <Link href="/courses/search" className="hover:underline">
            Search
          </Link>

          {/* Compact search that submits to /courses/search?q=... */}
          <form
            action="/courses/search"
            method="get"
            className="hidden md:flex items-center gap-2"
            onSubmit={() => {
              // trim spaces so /courses/search?q= is clean
              if (searchRef.current) {
                searchRef.current.value = searchRef.current.value.trim();
              }
            }}
          >
            <input
              ref={searchRef}
              type="text"
              name="q"
              placeholder="fractions, area, slope…"
              aria-label="Search chapters"
              className="w-48 rounded-lg border px-3 py-1.5 text-sm"
            />
            <button
              type="submit"
              className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              Go
            </button>
          </form>

          <Link
            href="/dashboard"
            className="hidden sm:inline hover:underline"
          >
            Dashboard
          </Link>

          <Link
            href="/signin"
            className="rounded border px-3 py-1 hover:bg-gray-50"
          >
            Sign in
          </Link>
        </nav>
      </div>
    </header>
  );
}
