import SignUpForm from "@/components/sign-up-form";
import { redirectSignedInUser } from "@/lib/permissions";
import { legalProfile } from "@/lib/legal-contact";
import Link from "next/link";

export default async function SignUpPage() {
  await redirectSignedInUser();
  if (process.env.NODE_ENV === "production" && !legalProfile()) return <section className="auth-card"><div className="auth-heading"><h1>Registration will open soon.</h1><p>New accounts are temporarily unavailable. You can still <Link href="/demo">explore the demo</Link> or <Link href="/sign-in">sign in to an existing account</Link>.</p></div></section>;
  return <SignUpForm />;
}
