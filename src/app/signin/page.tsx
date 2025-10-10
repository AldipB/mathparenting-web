// Server component (no "use client")
import SignInClient from "./SignInClient";

export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const redirectedFrom = Array.isArray(sp.redirectedFrom)
    ? sp.redirectedFrom[0]
    : sp.redirectedFrom;
  const redirectTo = redirectedFrom ?? "/dashboard";

  return <SignInClient redirectTo={redirectTo} />;
}
