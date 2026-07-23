import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

const SCRYPT_KEYLEN = 64;

export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, SCRYPT_KEYLEN).toString("hex");
  return { hash, salt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  try {
    const candidate = scryptSync(password, salt, SCRYPT_KEYLEN);
    const stored = Buffer.from(hash, "hex");
    if (candidate.length !== stored.length) return false;
    return timingSafeEqual(candidate, stored);
  } catch {
    return false;
  }
}
