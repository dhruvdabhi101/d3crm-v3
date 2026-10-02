import { AccountForm } from "@/components/account-form";
export default function ForgotPasswordPage() {
  return <section className="auth-card"><div className="auth-heading"><h1>Reset your password</h1><p>We will email you a link to recover your account.</p></div><AccountForm action="reset-request" /></section>;
}
