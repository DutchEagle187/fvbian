import crypto from "node:crypto";

const ALGO = "aes-256-gcm";

/**
 * 32-byte key derived from a server secret. Uses a dedicated key if provided,
 * otherwise falls back to AUTH_SECRET (which every deployment already sets).
 */
function key(): Buffer {
  const secret =
    process.env.CALENDAR_ENCRYPTION_KEY || process.env.AUTH_SECRET || "";
  if (!secret) {
    throw new Error("No encryption secret configured (AUTH_SECRET).");
  }
  return crypto.createHash("sha256").update(secret).digest();
}

/** Encrypts a string to a base64 blob: iv(12) | authTag(16) | ciphertext. */
export function encrypt(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

/** Reverses {@link encrypt}. Throws if the blob is tampered with. */
export function decrypt(blob: string): string {
  const buf = Buffer.from(blob, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const enc = buf.subarray(28);
  const decipher = crypto.createDecipheriv(ALGO, key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString(
    "utf8"
  );
}
