import { AccountForm } from "@/components/account-form";
export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <section className="auth-card"><div className="auth-heading"><h1>Verify your email</h1><p>{token ? "Confirm this address belongs to you." : "Open the verification link from your email."}</p></div><AccountForm action="verify-email" token={token} /></section>;
}
