/**
 * Access control for the site.
 *
 * The site is publicly reachable, but only the Google accounts whose email
 * appears in the ALLOWED_EMAILS environment variable may actually sign in.
 * Everyone else is rejected during the OAuth callback.
 *
 * Add or remove people by editing ALLOWED_EMAILS (comma-separated) in your
 * environment / Vercel project settings — no code change or redeploy of logic
 * required.
 */
export function getAllowedEmails(): string[] {
  return (process.env.ALLOWED_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isEmailAllowed(email?: string | null): boolean {
  if (!email) return false;
  const allowed = getAllowedEmails();
  // If no allowlist is configured, deny everyone (fail closed).
  if (allowed.length === 0) return false;
  return allowed.includes(email.toLowerCase());
}
