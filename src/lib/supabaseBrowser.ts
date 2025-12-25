// src/lib/supabaseBrowser.ts
// Cookie based Supabase client for Client Components
// This matches middleware session checks.

import { createBrowserClient } from "@supabase/ssr";

function getCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(name + "="));
  return match ? decodeURIComponent(match.split("=").slice(1).join("=")) : undefined;
}

function setCookie(name: string, value: string, options?: any) {
  if (typeof document === "undefined") return;

  const maxAge =
    typeof options?.maxAge === "number" ? `; Max-Age=${options.maxAge}` : "";
  const path = `; Path=${options?.path ?? "/"}`;
  const sameSite = `; SameSite=${options?.sameSite ?? "Lax"}`;
  const secure = options?.secure ? "; Secure" : "";

  document.cookie = `${name}=${encodeURIComponent(value)}${maxAge}${path}${sameSite}${secure}`;
}

function removeCookie(name: string, options?: any) {
  setCookie(name, "", { ...options, maxAge: 0 });
}

export function getBrowserSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createBrowserClient(url, anon, {
    cookies: {
      get(name: string) {
        return getCookie(name);
      },
      set(name: string, value: string, options: any) {
        setCookie(name, value, options);
      },
      remove(name: string, options: any) {
        removeCookie(name, options);
      },
    },
  });
}
