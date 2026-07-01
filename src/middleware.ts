export { auth as middleware } from "@/auth";

export const config = {
  // Protect the dashboard. Everything else (landing, login, auth API,
  // static assets) stays publicly reachable.
  matcher: ["/dashboard/:path*"],
};
