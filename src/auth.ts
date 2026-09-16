import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { hasLocale } from "next-intl";
import NextAuth, { type NextAuthConfig } from "next-auth";
import Apple from "next-auth/providers/apple";
import Credentials from "next-auth/providers/credentials";
import Facebook from "next-auth/providers/facebook";
import Google from "next-auth/providers/google";
import { cookies } from "next/headers";
import { z } from "zod";

import { routing } from "@/i18n/routing";
import { isOAuthProviderConfigured } from "@/lib/oauth";
import { prisma } from "@/lib/prisma";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/// Google, Apple and Facebook all return an address they have verified
/// themselves, so a social sign-in may attach to the account that already owns
/// that email. Without this, anyone who registered with a password would hit
/// `OAuthAccountNotLinked` the first time they used a social button. Set it to
/// false to require every provider to have its own separate account.
const allowDangerousEmailAccountLinking = true;

const providers: NextAuthConfig["providers"] = [];

if (isOAuthProviderConfigured("google")) {
  providers.push(Google({ allowDangerousEmailAccountLinking }));
}

if (isOAuthProviderConfigured("apple")) {
  providers.push(Apple({ allowDangerousEmailAccountLinking }));
}

if (isOAuthProviderConfigured("facebook")) {
  providers.push(Facebook({ allowDangerousEmailAccountLinking }));
}

providers.push(
  Credentials({
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(rawCredentials) {
      const parsed = credentialsSchema.safeParse(rawCredentials);

      if (!parsed.success) return null;

      const user = await prisma.user.findUnique({
        where: { email: parsed.data.email.toLowerCase() },
      });

      // Accounts created through a social provider have no password to check.
      if (!user?.passwordHash) return null;

      const passwordMatches = await bcrypt.compare(
        parsed.data.password,
        user.passwordHash,
      );

      if (!passwordMatches) return null;

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
      };
    },
  }),
);

/// Cookies on localhost are shared across ports, so every app a developer runs
/// writes to the same `authjs.session-token` unless told otherwise. When two of
/// them sign cookies with different secrets, this one reads a cookie it cannot
/// decrypt, finds no session, and bounces a signed-in person to the login page.
/// Naming the cookie after the app keeps that from happening.
const secureCookies = process.env.NODE_ENV === "production";
const cookiePrefix = secureCookies ? "__Secure-" : "";

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: secureCookies,
};

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  cookies: {
    sessionToken: {
      name: `${cookiePrefix}mboatour.session-token`,
      options: cookieOptions,
    },
    callbackUrl: {
      name: `${cookiePrefix}mboatour.callback-url`,
      options: cookieOptions,
    },
    csrfToken: {
      name: `${cookiePrefix}mboatour.csrf-token`,
      options: cookieOptions,
    },
  },
  // Credentials sign-in requires JWT sessions; the adapter still persists the
  // user and linked OAuth accounts.
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers,
  events: {
    /// The adapter creates social users without knowing which language the
    /// visitor was browsing in, so carry it over from the locale cookie.
    async createUser({ user }) {
      if (!user.id) return;

      try {
        const locale = (await cookies()).get("NEXT_LOCALE")?.value;

        if (!locale || !hasLocale(routing.locales, locale)) return;

        await prisma.user.update({ where: { id: user.id }, data: { locale } });
      } catch {
        // A missing cookie store must never fail an otherwise valid sign-in.
      }
    },
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
