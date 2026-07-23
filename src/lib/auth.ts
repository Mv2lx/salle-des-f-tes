import type { Role } from "@/db/schema";

// ---------------------------------------------------------------------------
// Signed session tokens (stateless, HMAC-SHA256 via Web Crypto) — stored in
// an httpOnly cookie. Web Crypto (`crypto.subtle`) is used instead of Node's
// `crypto` module so that verification also works unmodified inside
// middleware, which runs on the Edge runtime by default. IMPORTANT: do not
// import Node-only modules (e.g. `crypto`, `fs`) into this file — see
// src/lib/password.ts for password hashing, which is Node-only and must
// only ever be imported from API route handlers, never from middleware.
// ---------------------------------------------------------------------------
export type SessionPayload = {
  uid: number;
  username: string;
  name: string;
  role: Role;
  iat: number;
  exp: number;
};

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "SESSION_SECRET is required (min 16 chars). Set it in your .env file — see .env.example.",
    );
  }
  return secret;
}

function toBase64Url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let str = "";
  for (const b of arr) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(input: string): Uint8Array {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/").padEnd(input.length + ((4 - (input.length % 4)) % 4), "=");
  const bin = atob(padded);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder().encode(secret);
  return crypto.subtle.importKey("raw", enc, { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function createSessionToken(
  payload: Omit<SessionPayload, "iat" | "exp">,
  ttlSeconds = 60 * 60 * 8,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const full: SessionPayload = { ...payload, iat: now, exp: now + ttlSeconds };
  const body = toBase64Url(new TextEncoder().encode(JSON.stringify(full)));
  const key = await importHmacKey(getSecret());
  const sigBuf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  const sig = toBase64Url(sigBuf);
  return `${body}.${sig}`;
}

export async function verifySessionToken(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  try {
    const key = await importHmacKey(getSecret());
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      fromBase64Url(sig) as BufferSource,
      new TextEncoder().encode(body) as BufferSource,
    );
    if (!valid) return null;
    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(body))) as SessionPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE = "erp_session";

