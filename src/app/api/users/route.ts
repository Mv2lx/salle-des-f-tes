import { db } from "@/db";
import { users, ROLES } from "@/db/schema";
import { desc } from "drizzle-orm";
import { requireAuth } from "@/lib/api-guard";
import { hashPassword } from "@/lib/password";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

// User accounts are managed from the admin-only "Company Settings" page —
// like the audit log, this is restricted to admins for both read and write,
// unlike the rest of the app's "everyone can read" model. Password hash/salt
// are never included in any response.
const PUBLIC_COLUMNS = {
  id: users.id,
  username: users.username,
  name: users.name,
  role: users.role,
  active: users.active,
  createdAt: users.createdAt,
};

async function requireAdmin(req: Request, write: boolean) {
  const guard = await requireAuth(req, write ? { write: true } : undefined);
  if (!guard.ok) return guard;
  if (guard.session.role !== "admin") {
    return {
      ok: false as const,
      response: Response.json({ error: "Accès réservé aux administrateurs." }, { status: 403 }),
    };
  }
  return guard;
}

export async function GET(req: Request) {
  const guard = await requireAdmin(req, false);
  if (!guard.ok) return guard.response;

  const rows = await db.select(PUBLIC_COLUMNS).from(users).orderBy(desc(users.id));
  return Response.json(rows);
}

export async function POST(req: Request) {
  const guard = await requireAdmin(req, true);
  if (!guard.ok) return guard.response;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Requête invalide." }, { status: 400 });
  }

  const username = String(body.username ?? "").trim().toLowerCase();
  const name = String(body.name ?? "").trim();
  const role = String(body.role ?? "");
  const password = String(body.password ?? "");

  if (!username) return Response.json({ error: "Le nom d'utilisateur est obligatoire." }, { status: 400 });
  if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
    return Response.json(
      { error: "Nom d'utilisateur invalide (3-32 caractères : lettres, chiffres, . _ -)." },
      { status: 400 },
    );
  }
  if (!name) return Response.json({ error: "Le nom complet est obligatoire." }, { status: 400 });
  if (!ROLES.includes(role as (typeof ROLES)[number])) {
    return Response.json({ error: "Rôle invalide." }, { status: 400 });
  }
  if (password.length < 8) {
    return Response.json({ error: "Le mot de passe doit contenir au moins 8 caractères." }, { status: 400 });
  }

  const { hash, salt } = hashPassword(password);

  try {
    const [row] = await db
      .insert(users)
      .values({
        username,
        name,
        role: role as (typeof ROLES)[number],
        passwordHash: hash,
        passwordSalt: salt,
        active: 1,
      })
      .returning(PUBLIC_COLUMNS);

    await logAudit({
      session: guard.session,
      action: "create",
      module: "users",
      entityId: row.id,
      entityLabel: `${row.name} (${row.username})`,
    });

    return Response.json(row);
  } catch (err) {
    if (isUniqueViolation(err)) {
      return Response.json({ error: "Ce nom d'utilisateur existe déjà." }, { status: 409 });
    }
    console.error("[users:POST]", err);
    return Response.json({ error: "Erreur lors de la création de l'utilisateur." }, { status: 500 });
  }
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && (err as { code?: string }).code === "SQLITE_CONSTRAINT_UNIQUE";
}
