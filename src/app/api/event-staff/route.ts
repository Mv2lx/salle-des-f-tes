import { db } from "@/db";
import { eventStaff, reservations, STAFF_TYPES, PAYMENT_STATUSES } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { requireAuth } from "@/lib/api-guard";
import { canRead } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Personnel de l'événement — temporary staff hired for one specific
// reservation only (servers, chefs, security, DJ, etc.), part of "Dépenses
// de l'événement". Distinct from the permanent `users` table (hotel staff
// accounts with login access).
// ---------------------------------------------------------------------------

async function requireReservation(rawId: unknown): Promise<number | null> {
  const id = Number(rawId);
  if (!Number.isFinite(id) || id <= 0) return null;
  const [res] = await db.select({ id: reservations.id }).from(reservations).where(eq(reservations.id, id));
  return res ? id : null;
}

function validate(body: Record<string, unknown>): string | null {
  if (!body.nom || String(body.nom).trim() === "") return "Le nom de l'employé est obligatoire.";
  const heures = Number(body.nombreHeures);
  if (!Number.isFinite(heures) || heures < 0) return "Le nombre d'heures doit être un nombre positif ou nul.";
  const salaire = Number(body.salaire);
  if (!Number.isFinite(salaire) || salaire < 0) return "Le salaire convenu doit être un nombre positif ou nul.";
  if (body.statutPaiement === "Payé" && body.datePaiement && Number.isNaN(Date.parse(String(body.datePaiement)))) {
    return "La date de paiement est invalide.";
  }
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
    ? await db.select().from(eventStaff).where(eq(eventStaff.reservationId, Number(reservationId))).orderBy(desc(eventStaff.createdAt))
    : await db.select().from(eventStaff).orderBy(desc(eventStaff.createdAt));
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

  const type = STAFF_TYPES.includes(body.type) ? body.type : "Autre";
  const statutPaiement = PAYMENT_STATUSES.includes(body.statutPaiement) ? body.statutPaiement : "Non payé";

  const [row] = await db
    .insert(eventStaff)
    .values({
      reservationId,
      type,
      nom: String(body.nom).trim(),
      telephone: body.telephone ?? "",
      nombreHeures: String(Number(body.nombreHeures) || 0),
      salaire: String(Number(body.salaire) || 0),
      statutPaiement,
      datePaiement: statutPaiement === "Payé" ? (body.datePaiement ?? "") : "",
      observations: body.observations ?? "",
    })
    .returning();
  await logAudit({
    session: guard.session,
    action: "create",
    module: "depenses",
    entityId: row.id,
    entityLabel: row.nom,
    details: `Personnel évènement : ${row.nom} (${row.type}, ${row.salaire} DA) — réservation #${reservationId}`,
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

  const type = STAFF_TYPES.includes(body.type) ? body.type : "Autre";
  const statutPaiement = PAYMENT_STATUSES.includes(body.statutPaiement) ? body.statutPaiement : "Non payé";

  const [row] = await db
    .update(eventStaff)
    .set({
      reservationId,
      type,
      nom: String(body.nom).trim(),
      telephone: body.telephone ?? "",
      nombreHeures: String(Number(body.nombreHeures) || 0),
      salaire: String(Number(body.salaire) || 0),
      statutPaiement,
      datePaiement: statutPaiement === "Payé" ? (body.datePaiement ?? "") : "",
      observations: body.observations ?? "",
    })
    .where(eq(eventStaff.id, id))
    .returning();
  if (!row) {
    return Response.json({ error: "Employé introuvable." }, { status: 404 });
  }
  await logAudit({
    session: guard.session,
    action: "update",
    module: "depenses",
    entityId: row.id,
    entityLabel: row.nom,
    details: `Personnel évènement modifié : ${row.nom} (${row.salaire} DA)`,
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
  const [existing] = await db.select().from(eventStaff).where(eq(eventStaff.id, Number(id)));
  await db.delete(eventStaff).where(eq(eventStaff.id, Number(id)));
  await logAudit({
    session: guard.session,
    action: "delete",
    module: "depenses",
    entityId: Number(id),
    entityLabel: existing?.nom ?? "",
    details: existing ? `Personnel évènement supprimé : ${existing.nom} (${existing.salaire} DA)` : "",
  });
  return Response.json({ ok: true });
}
