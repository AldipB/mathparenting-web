// Do NOT make this a client component.
// Keep it simple and type-agnostic so it works across Next versions.
import SignInClient from "./SignInClient";

// Avoid static prerendering for auth pages (safer for cookies/redirects)
export const dynamic = "force-dynamic";

type SearchParams = { [key: string]: string | string[] | undefined };

export default function Page({ searchParams }: { searchParams?: SearchParams } = {}) {
  const sp = searchParams || {};
  const redirectedFrom = (sp.redirectedFrom as string | undefined) ?? "/dashboard";
  return <SignInClient redirectTo={redirectedFrom} />;
}
