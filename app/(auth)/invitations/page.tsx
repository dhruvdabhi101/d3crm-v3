import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { tokenHash } from "@/lib/security";
import { AcceptInvitation } from "@/components/accept-invitation";
export default async function InvitationPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  const invitation = /^[A-Za-z0-9_-]{43}$/.test(token) ? await db.invitation.findFirst({ where: { tokenHash: tokenHash(token), expiresAt: { gt: new Date() } }, include: { organization: { select: { name: true } } } }) : null;
  const session = await getServerSession(authOptions);
  return <section className="auth-card"><div className="auth-heading"><h1>{invitation ? `Join ${invitation.organization.name}` : "Invitation unavailable"}</h1><p>{invitation ? "Sign in with the email address that received this invitation." : "Ask the workspace owner for a new invitation."}</p></div>{invitation && (session?.user.id ? <AcceptInvitation token={token} /> : <div className="success-actions"><Link className="button button-primary" href={`/sign-in?callbackUrl=${encodeURIComponent(`/invitations?token=${token}`)}`}>Sign in</Link><Link className="text-link" href={`/sign-up?callbackUrl=${encodeURIComponent(`/invitations?token=${token}`)}`}>Create account</Link></div>)}</section>;
}
