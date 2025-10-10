import SignInClient from "./SignInClient";

// NOTE: In Next 15, searchParams is a Promise in server components.
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ redirectedFrom?: string }>;
}) {
  const params = await searchParams;
  const redirectTo = params.redirectedFrom ?? "/dashboard";
  return <SignInClient redirectTo={redirectTo} />;
}
