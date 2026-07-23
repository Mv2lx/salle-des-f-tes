import { db } from "@/db";
import { eventOtherExpenses, reservations } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { requireAuth } from "@/lib/api-guard";
import { canRead } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Autres dépenses — any other one-off cost tied to a specific event, part of
// "Dépenses de l'événement" (alongside Achats and Personnel).
// ---------------------------------------------------------------------------

async function requireReservation(rawId: unknown): Promise<number | null> {
  const id = Number(rawId);
  if (!Number.isFinite(id) || id <= 0) return null;
  const [res] = await db.select({ id: reservations.id }).from(reservations).where(eq(reservations.id, id));
  return res ? id : null;
}

function validate(body: Record<string, unknown>): string | null {
  if (!body.libelle || String(body.libelle).trim() === "") return "Le libellé est obligatoire.";
  const montant = Number(body.montant);
  if (!Number.isFinite(montant) || montant <= 0) return "Le montant doit être un nombre positif.";
  if (!body.dateDepense || Number.isNaN(Date.parse(String(body.dateDepense)))) return "La date est invalide.";
  return null;
}

export async function GET(req: Request) {
  const guard = await requireAuth(req);
  if (!guard.ok) return guard.response;
  if (!canRead(guard.session.role, "depenses")) {
    return Response.json({ error: "Accès refusé." }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const reservationId = searchParams.get("reservationId");
  const rows = reservationId
    ? await db.select().from(eventOtherExpenses).where(eq(eventOtherExpenses.reservationId, Number(reservationId))).orderBy(desc(eventOtherExpenses.dateDepense))
    : await db.select().from(eventOtherExpenses).orderBy(desc(eventOtherExpenses.dateDepense));
  return Response.json(rows);
}

export async function POST(req: Request) {
  const guard = await requireAuth(req, { module: "depenses", write: true });
  if (!guard.ok) return guard.response;

  const body = await req.json();
  const reservationId = await requireReservation(body.reservationId);
  if (!reservationId) {
    return Response.json({ error: "La réservation liée est introuvable." }, { status: 400 });
  }
  const validationError = validate(body);
  if (validationError) {
    return Response.json({ error: validationError }, { status: 400 });
  }

  const [row] = await db
    .insert(eventOtherExpenses)
    .values({
      reservationId,
      libelle: String(body.libelle).trim(),
      montant: String(Number(body.montant)),
      dateDepense: body.dateDepense,
      observations: body.observations ?? "",
    })
    .returning();
  await logAudit({
    session: guard.session,
    action: "create",
    module: "depenses",
    entityId: row.id,
    entityLabel: row.libelle,
    details: `Autre dépense évènement : ${row.libelle} (${row.montant} DA) — réservation #${reservationId}`,
  });
  return Response.json(row);
}

export async function PUT(req: Request) {
  const guard = await requireAuth(req, { module: "depenses", write: true });
  if (!guard.ok) return guard.response;

  const body = await req.json();
  const id = Number(body.id);
  if (!Number.isFinite(id) || id <= 0) {
    return Response.json({ error: "Identifiant manquant." }, { status: 400 });
  }
  const reservationId = await requireReservation(body.reservationId);
  if (!reservationId) {
    return Response.json({ error: "La réservation liée est introuvable." }, { status: 400 });
  }
  const validationError = validate(body);
  if (validationError) {
    return Response.json({ error: validationError }, { status: 400 });
  }

  const [row] = await db
    .update(eventOtherExpenses)
    .set({
      reservationId,
      libelle: String(body.libelle).trim(),
      montant: String(Number(body.montant)),
      dateDepense: body.dateDepense,
      observations: body.observations ?? "",
    })
    .where(eq(eventOtherExpenses.id, id))
    .returning();
  if (!row) {
    return Response.json({ error: "Dépense introuvable." }, { status: 404 });
  }
  await logAudit({
    session: guard.session,
    action: "update",
    module: "depenses",
    entityId: row.id,
    entityLabel: row.libelle,
    details: `Autre dépense évènement modifiée : ${row.libelle} (${row.montant} DA)`,
  });
  return Response.json(row);
}

export async function DELETE(req: Request) {
  const guard = await requireAuth(req, { module: "depenses", write: true });
  if (!guard.ok) return guard.response;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return Response.json({ error: "Identifiant manquant." }, { status: 400 });
  }
  const [existing] = await db.select().from(eventOtherExpenses).where(eq(eventOtherExpenses.id, Number(id)));
  await db.delete(eventOtherExpenses).where(eq(eventOtherExpenses.id, Number(id)));
  await logAudit({
    session: guard.session,
    action: "delete",
    module: "depenses",
    entityId: Number(id),
    entityLabel: existing?.libelle ?? "",
    details: existing ? `Autre dépense évènement supprimée : ${existing.libelle} (${existing.montant} DA)` : "",
  });
  return Response.json({ ok: true });
}
