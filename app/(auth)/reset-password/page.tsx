import { AccountForm } from "@/components/account-form";
export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <section className="auth-card"><div className="auth-heading"><h1>Choose a new password</h1><p>{token ? "Your other sessions will be signed out." : "Open the reset link from your email."}</p></div><AccountForm action="reset-password" token={token} /></section>;
}
