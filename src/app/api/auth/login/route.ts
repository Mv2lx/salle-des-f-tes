import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyPassword } from "@/lib/password";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

// Basic in-memory rate limiting per process (best-effort; a reverse proxy /
// WAF should provide the real protection in production).
const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

function tooManyAttempts(key: string): boolean {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_ATTEMPTS;
}

export async function POST(req: Request) {
  let body: { username?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Requête invalide." }, { status: 400 });
  }

  const username = String(body.username ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  if (!username || !password) {
    return Response.json({ error: "Identifiant et mot de passe requis." }, { status: 400 });
  }

  const ip = req.headers.get("x-forwarded-for") ?? "local";
  if (tooManyAttempts(`${ip}:${username}`)) {
    return Response.json(
      { error: "Trop de tentatives. Réessayez dans quelques minutes." },
      { status: 429 },
    );
  }

  const [user] = await db.select().from(users).where(eq(users.username, username));

  // Always run verifyPassword-shaped work to reduce username-enumeration timing signal.
  const valid = user
    ? verifyPassword(password, user.passwordHash, user.passwordSalt)
    : verifyPassword(password, "0".repeat(128), "00");

  if (!user || !valid || user.active !== 1) {
    return Response.json({ error: "Identifiant ou mot de passe incorrect." }, { status: 401 });
  }

  let token: string;
  try {
    token = await createSessionToken({
      uid: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
    });
  } catch {
    return Response.json(
      { error: "Configuration serveur invalide (SESSION_SECRET manquant)." },
      { status: 500 },
    );
  }

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });

  return Response.json({ ok: true, user: { name: user.name, role: user.role, username: user.username } });
}
