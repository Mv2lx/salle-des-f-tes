import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/api-guard";
import { hashPassword } from "@/lib/password";
import { logAudit } from "@/lib/audit";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAuth(req, { write: true }); if (!guard.ok) return guard.response;
  if (guard.session.role !== "admin") return Response.json({ error: "Accès réservé aux administrateurs." }, { status: 403 });
  const id = Number((await params).id); let body: { password?: unknown }; try { body = await req.json(); } catch { return Response.json({ error: "Requête invalide." }, { status: 400 }); }
  const password = String(body.password ?? ""); if (!Number.isInteger(id) || password.length < 8) return Response.json({ error: "Le mot de passe doit contenir au moins 8 caractères." }, { status: 400 });
  const { hash, salt } = hashPassword(password); const [row] = await db.update(users).set({ passwordHash: hash, passwordSalt: salt }).where(eq(users.id, id)).returning();
  if (!row) return Response.json({ error: "Utilisateur introuvable." }, { status: 404 });
  await logAudit({ session: guard.session, action: "update", module: "users", entityId: id, entityLabel: row.username, details: "Mot de passe réinitialisé" });
  return Response.json({ ok: true });
}
