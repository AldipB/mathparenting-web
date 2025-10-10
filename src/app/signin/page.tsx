// Server component (no "use client")
import SignInClient from "./SignInClient";

// Auth pages should be dynamic (no static pre-render)
export const dynamic = "force-dynamic";

// Next 15-compatible PageProps typing
type SearchParams = { [key: string]: string | string[] | undefined };

export default function Page(props: { searchParams?: SearchParams }) {
  const sp = props.searchParams ?? {};
  // If it's an array, take the first value
  const redirectedFromValue = Array.isArray(sp.redirectedFrom)
    ? sp.redirectedFrom[0]
    : sp.redirectedFrom;
  const redirectTo = redirectedFromValue ?? "/dashboard";

  return <SignInClient redirectTo={redirectTo} />;
}
