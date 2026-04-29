import { NextResponse } from "next/server";
import { checkSubscription } from "@/lib/checkSubscription";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ subscribed: false });
    }

    const subscribed = await checkSubscription(email);
    return NextResponse.json({ subscribed });
  } catch (error) {
    console.error("Check subscription error:", error);
    return NextResponse.json({ subscribed: false });
  }
}