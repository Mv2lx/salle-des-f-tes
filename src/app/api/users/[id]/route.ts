import { db } from "@/db";
import { users, ROLES } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/api-guard";
import { hashPassword } from "@/lib/password";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const PUBLIC_COLUMNS = {
  id: users.id,
  username: users.username,
  name: users.name,
  role: users.role,
  active: users.active,
  createdAt: users.createdAt,
};

async function requireAdmin(req: Request) {
  const guard = await requireAuth(req, { write: true });
  if (!guard.ok) return guard;
  if (guard.session.role !== "admin") {
    return {
      ok: false as const,
      response: Response.json({ error: "Accès réservé aux administrateurs." }, { status: 403 }),
    };
  }
  return guard;
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const targetId = Number(id);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Requête invalide." }, { status: 400 });
  }

  const [target] = await db.select().from(users).where(eq(users.id, targetId));
  if (!target) return Response.json({ error: "Utilisateur introuvable." }, { status: 404 });

  const updates: Partial<typeof users.$inferInsert> = {};

  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) return Response.json({ error: "Le nom complet est obligatoire." }, { status: 400 });
    updates.name = name;
  }

  if (body.role !== undefined) {
    const role = String(body.role);
    if (!ROLES.includes(role as (typeof ROLES)[number])) {
      return Response.json({ error: "Rôle invalide." }, { status: 400 });
    }
    // Guard against locking everyone out: an admin can't demote themselves.
    if (targetId === guard.session.uid && role !== "admin") {
      return Response.json({ error: "Vous ne pouvez pas retirer votre propre rôle administrateur." }, { status: 400 });
    }
    updates.role = role as (typeof ROLES)[number];
  }

  if (body.active !== undefined) {
    // Same reasoning: an admin can't deactivate their own account.
    if (targetId === guard.session.uid && !body.active) {
      return Response.json({ error: "Vous ne pouvez pas désactiver votre propre compte." }, { status: 400 });
    }
    updates.active = body.active ? 1 : 0;
  }

  if (body.password !== undefined) {
    const password = String(body.password);
    if (password.length < 8) {
      return Response.json({ error: "Le mot de passe doit contenir au moins 8 caractères." }, { status: 400 });
    }
    const { hash, salt } = hashPassword(password);
    updates.passwordHash = hash;
    updates.passwordSalt = salt;
  }

  const [row] = await db.update(users).set(updates).where(eq(users.id, targetId)).returning(PUBLIC_COLUMNS);

  await logAudit({
    session: guard.session,
    action: "update",
    module: "users",
    entityId: row.id,
    entityLabel: `${row.name} (${row.username})`,
    details: body.password !== undefined ? "Mot de passe réinitialisé" : "",
  });

  return Response.json(row);
}
