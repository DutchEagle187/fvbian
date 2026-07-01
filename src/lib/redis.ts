import { Redis } from "@upstash/redis";

/**
 * Returns an Upstash Redis client if credentials are configured, otherwise
 * null. Supports both the Upstash Marketplace variables and the classic
 * Vercel KV names, so it works no matter how the integration was added.
 *
 * When this returns null the app falls back to browser-local storage, so
 * everything keeps working before the database is set up.
 */
export function getRedis(): Redis | null {
  const url =
    process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;

  if (!url || !token) return null;
  return new Redis({ url, token });
}
