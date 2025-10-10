import SignInClient from "./SignInClient";

export default function Page({
  searchParams,
}: {
  searchParams: { redirectedFrom?: string };
}) {
  const redirectTo = searchParams.redirectedFrom ?? "/dashboard";
  return <SignInClient redirectTo={redirectTo} />;
}
