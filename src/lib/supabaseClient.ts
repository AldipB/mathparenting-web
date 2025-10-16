// src/lib/supabaseClient.ts
import { createClient } from "@supabase/supabase-js";

// Browser/server-safe client using the public anon key.
// For admin/server-only ops, make a separate server client and never ship its key to the browser.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
);

export type SupabaseClient = typeof supabase;
