import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { isEmailAllowed } from "@/lib/allowlist";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [Google],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    /**
     * Enforce the allowlist. Returning `false` aborts the sign-in and sends the
     * user back to the login page with an `AccessDenied` error.
     */
    signIn({ user }) {
      return isEmailAllowed(user.email);
    },
    /**
     * Gate every route under /dashboard behind an authenticated session.
     * Used by the middleware via `auth` as a wrapper.
     */
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const isProtected = request.nextUrl.pathname.startsWith("/dashboard");
      if (isProtected) return isLoggedIn;
      return true;
    },
  },
  session: { strategy: "jwt" },
});
