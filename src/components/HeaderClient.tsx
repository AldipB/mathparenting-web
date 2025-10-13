"use client";

import Link from "next/link";
import Image from "next/image";

export default function HeaderClient() {
  return (
    <header className="sticky top-0 z-50 h-16 w-full border-b bg-white/90 backdrop-blur">
      <div className="mx-auto h-full max-w-6xl px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Image
            src="/logo.png"
            alt="MathParenting"
            width={28}
            height={28}
            className="rounded-md"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <Link href="/" className="font-semibold tracking-tight">
            MathParenting
          </Link>
        </div>

        <nav className="flex items-center gap-4 text-sm">
          <Link href="/chat" className="hover:underline">Chat</Link>
          <Link href="/dashboard" className="hover:underline">Dashboard</Link>
          <Link href="/signin" className="rounded border px-3 py-1 hover:bg-gray-50">
            Sign in
          </Link>
        </nav>
      </div>
    </header>
  );
}
