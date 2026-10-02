import { compare } from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { z } from "zod";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { requestIp, secret, validPassword } from "@/lib/security";

const credentialsSchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128),
});

export const authOptions: NextAuthOptions = {
  secret: secret(),
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
  pages: { signIn: "/sign-in" },
  providers: [
    CredentialsProvider({
      name: "Email and password",
      credentials: { email: { label: "Email", type: "email" }, password: { label: "Password", type: "password" } },
      async authorize(credentials, request) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;
        if (!validPassword(parsed.data.password)) return null;
        await rateLimit("login-ip", requestIp(request.headers ?? {}), 30, 900);
        await rateLimit("login-email", parsed.data.email, 10, 900);
        const user = await db.user.findUnique({ where: { email: parsed.data.email } });
        const correct = await compare(parsed.data.password, user?.passwordHash ?? "$2b$12$4c6BgWXuJTTvJMbP36gI/euayBUe62svIqnlvl98pU1eOod6nwImi");
        if (!user || !correct) return null;
        return { id: user.id, email: user.email, name: user.name, sessionVersion: user.sessionVersion };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) { token.id = user.id; token.sessionVersion = user.sessionVersion; }
      return token;
    },
    session({ session, token }) {
      if (session.user) { session.user.id = token.id; session.user.sessionVersion = token.sessionVersion ?? 0; }
      return session;
    },
  },
};
