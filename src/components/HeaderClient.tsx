"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

export default function HeaderClient() {
  const [logoOk, setLogoOk] = useState(true);

  return (
    // 👇 stays visible on scroll
    <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <nav
        className="mx-auto w-full max-w-screen-lg px-3 sm:px-6 md:px-8 flex items-center gap-4 py-3"
        aria-label="Primary"
      >
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold tracking-tight text-xl"
        >
          {logoOk ? (
            <Image
              src="/logo.png"
              alt="MathParenting logo"
              width={32}
              height={32}
              className="rounded-md object-contain"
              priority
              onError={() => setLogoOk(false)}
            />
          ) : (
            <div className="h-8 w-8 grid place-items-center bg-blue-600 text-white rounded-md text-xs font-bold">
              MP
            </div>
          )}
          MathParenting
        </Link>

        <div className="ml-auto flex items-center gap-4 text-blue-600">
          <Link href="/" className="hover:underline">Home</Link>
          <Link href="/signin" className="hover:underline">Sign in</Link>
          <Link href="/signup" className="hover:underline">Sign up</Link>
          <Link href="/reset-password" className="hover:underline">Forgot password</Link>
          <Link href="/dashboard" prefetch={false} className="hover:underline">Dashboard</Link>
          <Link href="/chat" prefetch={false} className="hover:underline">Chat</Link>
        </div>
      </nav>
    </header>
  );
}
