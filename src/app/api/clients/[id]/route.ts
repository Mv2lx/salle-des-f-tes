import { db } from "@/db";
import { clients } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/api-guard";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAuth(req, { module: "clients", write: true });
  if (!guard.ok) return guard.response;

  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Requête invalide." }, { status: 400 });
  }
  if (!body.nom || String(body.nom).trim() === "") {
    return Response.json({ error: "Le nom est obligatoire." }, { status: 400 });
  }
  const [row] = await db
    .update(clients)
    .set({
      nom: String(body.nom),
      prenom: String(body.prenom ?? ""),
      societe: String(body.societe ?? ""),
      telephone: String(body.telephone ?? ""),
      telephone2: String(body.telephone2 ?? ""),
      email: String(body.email ?? ""),
      adresse: String(body.adresse ?? ""),
      ville: String(body.ville ?? ""),
      wilaya: String(body.wilaya ?? ""),
      pays: String(body.pays ?? "Algérie"),
      piece: String(body.piece ?? ""),
      commentaires: String(body.commentaires ?? ""),
    })
    .where(eq(clients.id, Number(id)))
    .returning();

  if (!row) {
    return Response.json({ error: "Client introuvable." }, { status: 404 });
  }
  await logAudit({
    session: guard.session,
    action: "update",
    module: "clients",
    entityId: row.id,
    entityLabel: `${row.nom} ${row.prenom ?? ""}`.trim(),
  });
  return Response.json(row);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAuth(req, { module: "clients", write: true });
  if (!guard.ok) return guard.response;

  const { id } = await params;
  try {
    const [existing] = await db.select().from(clients).where(eq(clients.id, Number(id)));
    await db.delete(clients).where(eq(clients.id, Number(id)));
    await logAudit({
      session: guard.session,
      action: "delete",
      module: "clients",
      entityId: Number(id),
      entityLabel: existing ? `${existing.nom} ${existing.prenom ?? ""}`.trim() : "",
    });
    return Response.json({ ok: true });
  } catch (err) {
    if (isForeignKeyViolation(err)) {
      return Response.json(
        { error: "Impossible de supprimer ce client : des réservations lui sont liées." },
        { status: 409 },
      );
    }
    console.error("[clients:DELETE]", err);
    return Response.json({ error: "Erreur lors de la suppression." }, { status: 500 });
  }
}

function isForeignKeyViolation(err: unknown): boolean {
  // better-sqlite3 (the actual driver here) throws SqliteError with this
  // code on FK constraint failures. "23503" is the Postgres equivalent —
  // this project has since moved to SQLite, so that check never matched and
  // every blocked deletion fell through to the generic 500 branch instead of
  // this friendly message.
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "SQLITE_CONSTRAINT_FOREIGNKEY"
  );
}
