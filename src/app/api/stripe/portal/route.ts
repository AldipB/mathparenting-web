import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Look up the stripe customer id we stored at checkout
    const { data: sub, error } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("email", email)
      .single();

    if (error || !sub?.stripe_customer_id) {
      return NextResponse.json(
        { error: "No subscription found for this account" },
        { status: 404 }
      );
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/chat`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error("Portal error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}