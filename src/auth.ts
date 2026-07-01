import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { isEmailAllowed } from "@/lib/allowlist";

const TASKS_SCOPE = "https://www.googleapis.com/auth/tasks";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      authorization: {
        params: {
          scope: `openid email profile ${TASKS_SCOPE}`,
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    signIn({ user }) {
      return isEmailAllowed(user.email);
    },
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const isProtected = request.nextUrl.pathname.startsWith("/dashboard");
      if (isProtected) return isLoggedIn;
      return true;
    },
    async jwt({ token, account }) {
      // Initial sign-in: capture the Google tokens.
      if (account) {
        token.access_token = account.access_token;
        token.refresh_token = account.refresh_token;
        token.expires_at = account.expires_at;
        return token;
      }

      // Still valid (with a 60s safety margin)?
      if (token.expires_at && Date.now() < token.expires_at * 1000 - 60_000) {
        return token;
      }

      // Expired → refresh using the refresh token.
      if (!token.refresh_token) return token;
      try {
        const res = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: process.env.AUTH_GOOGLE_ID ?? "",
            client_secret: process.env.AUTH_GOOGLE_SECRET ?? "",
            grant_type: "refresh_token",
            refresh_token: token.refresh_token,
          }),
        });
        const refreshed = await res.json();
        if (!res.ok) throw refreshed;
        token.access_token = refreshed.access_token;
        token.expires_at =
          Math.floor(Date.now() / 1000) + (refreshed.expires_in ?? 3600);
        if (refreshed.refresh_token) token.refresh_token = refreshed.refresh_token;
        token.error = undefined;
      } catch {
        token.error = "RefreshAccessTokenError";
      }
      return token;
    },
    session({ session, token }) {
      session.accessToken = token.access_token;
      session.error = token.error;
      return session;
    },
  },
  session: { strategy: "jwt" },
});
