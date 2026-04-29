import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const WHITELISTED_EMAILS = [
  "boharaaldip8529@gmail.com",
];

export async function checkSubscription(email: string): Promise<boolean> {
  if (WHITELISTED_EMAILS.includes(email)) return true;

  const { data, error } = await supabase
    .from("subscriptions")
    .select("status")
    .eq("email", email)
    .single();

  if (error || !data) return false;

  return data.status === "active";
}