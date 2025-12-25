// src/app/signin/page.tsx
import SignInClient from "./SignInClient";

export const dynamic = "force-static"; // optional

export default function SignInPage() {
  return <SignInClient />;
}
