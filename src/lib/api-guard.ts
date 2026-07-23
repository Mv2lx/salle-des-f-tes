import { cookies, headers } from "next/headers";
import { SESSION_COOKIE, verifySessionToken, type SessionPayload } from "@/lib/auth";
import { canWrite } from "@/lib/permissions";

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  return verifySessionToken(token);
}

/**
 * Basic same-origin / CSRF check for state-changing requests.
 * Because auth relies on a cookie, we verify the request's Origin (or Referer)
 * matches the app's own host before allowing POST/PUT/PATCH/DELETE.
 */
export async function assertSameOrigin(req: Request): Promise<string | null> {
  const h = await headers();
  const origin = req.headers.get("origin") ?? h.get("origin");
  const host = req.headers.get("host") ?? h.get("host");
  if (!origin || !host) return null; // same-origin requests from some clients omit Origin; rely on session+SameSite cookie
  try {
    const originHost = new URL(origin).host;
    if (originHost !== host) return "Origine de la requête invalide (protection CSRF).";
  } catch {
    return "Origine de la requête invalide.";
  }
  return null;
}

export type Guarded =
  | { ok: true; session: SessionPayload }
  | { ok: false; response: Response };

/**
 * Ensures the caller is authenticated, and (optionally) allowed to write to a given module.
 * Use at the top of API route handlers.
 */
export async function requireAuth(req: Request, opts?: { module?: string; write?: boolean }): Promise<Guarded> {
  const session = await getSession();
  if (!session) {
    return { ok: false, response: Response.json({ error: "Authentification requise." }, { status: 401 }) };
  }

  if (opts?.write) {
    const csrfError = await assertSameOrigin(req);
    if (csrfError) {
      return { ok: false, response: Response.json({ error: csrfError }, { status: 403 }) };
    }
    if (opts.module && !canWrite(session.role, opts.module)) {
      return {
        ok: false,
        response: Response.json({ error: "Vous n'avez pas la permission d'effectuer cette action." }, { status: 403 }),
      };
    }
  }

  return { ok: true, session };
}
