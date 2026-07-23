import { db } from "@/db";
import { payments, reservations } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { requireAuth } from "@/lib/api-guard";
import { canRead } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

function validatePayment(body: Record<string, unknown>) {
  const montant = Number(body.montant);
  if (!Number.isFinite(montant) || montant <= 0) {
    return "Le montant doit être un nombre positif.";
  }
  if (!body.datePaiement || Number.isNaN(Date.parse(String(body.datePaiement)))) {
    return "La date de paiement est invalide.";
  }
  return null;
}

export async function GET(req: Request) {
  const guard = await requireAuth(req);
  if (!guard.ok) return guard.response;
  if (!canRead(guard.session.role, "paiements")) {
    return Response.json({ error: "Accès refusé." }, { status: 403 });
  }
  const rows = await db.select().from(payments).orderBy(desc(payments.datePaiement));
  return Response.json(rows);
}

export async function POST(req: Request) {
  const guard = await requireAuth(req, { module: "paiements", write: true });
  if (!guard.ok) return guard.response;

  const body = await req.json();
  if (!body.reservationId) {
    return Response.json({ error: "Réservation obligatoire." }, { status: 400 });
  }
  const validationError = validatePayment(body);
  if (validationError) {
    return Response.json({ error: validationError }, { status: 400 });
  }

  const [reservation] = await db
    .select({ id: reservations.id, reference: reservations.reference })
    .from(reservations)
    .where(eq(reservations.id, Number(body.reservationId)));
  if (!reservation) {
    return Response.json({ error: "Réservation introuvable." }, { status: 404 });
  }

  const [row] = await db
    .insert(payments)
    .values({
      reservationId: Number(body.reservationId),
      montant: String(Number(body.montant)),
      mode: body.mode ?? "Espèces",
      datePaiement: body.datePaiement,
      reference: body.reference ?? "",
      note: body.note ?? "",
      recordedByUserId: guard.session.uid,
      recordedByName: guard.session.name,
    })
    .returning();

  await logAudit({
    session: guard.session,
    action: "create",
    module: "paiements",
    entityId: row.id,
    entityLabel: reservation.reference,
    details: `Paiement de ${row.montant} DA enregistré pour ${reservation.reference}`,
  });

  return Response.json(row);
}

export async function PUT(req: Request) {
  const guard = await requireAuth(req, { module: "paiements", write: true });
  if (!guard.ok) return guard.response;

  const body = await req.json();
  if (!body.id) {
    return Response.json({ error: "Identifiant de paiement manquant." }, { status: 400 });
  }
  const validationError = validatePayment(body);
  if (validationError) {
    return Response.json({ error: validationError }, { status: 400 });
  }

  const id = Number(body.id);
  const [existing] = await db.select().from(payments).where(eq(payments.id, id));
  if (!existing) {
    return Response.json({ error: "Paiement introuvable." }, { status: 404 });
  }

  const [row] = await db
    .update(payments)
    .set({
      montant: String(Number(body.montant)),
      mode: body.mode ?? existing.mode,
      datePaiement: body.datePaiement,
      reference: body.reference ?? "",
      note: body.note ?? "",
    })
    .where(eq(payments.id, id))
    .returning();

  const [reservation] = await db
    .select({ reference: reservations.reference })
    .from(reservations)
    .where(eq(reservations.id, row.reservationId));

  await logAudit({
    session: guard.session,
    action: "update",
    module: "paiements",
    entityId: row.id,
    entityLabel: reservation?.reference ?? "",
    details: `Paiement modifié : ${existing.montant} DA → ${row.montant} DA`,
  });

  return Response.json(row);
}

export async function DELETE(req: Request) {
  const guard = await requireAuth(req, { module: "paiements", write: true });
  if (!guard.ok) return guard.response;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return Response.json({ error: "Identifiant manquant." }, { status: 400 });
  }

  const [existing] = await db.select().from(payments).where(eq(payments.id, Number(id)));
  const [reservation] = existing
    ? await db
        .select({ reference: reservations.reference })
        .from(reservations)
        .where(eq(reservations.id, existing.reservationId))
    : [null];

  await db.delete(payments).where(eq(payments.id, Number(id)));

  await logAudit({
    session: guard.session,
    action: "delete",
    module: "paiements",
    entityId: Number(id),
    entityLabel: reservation?.reference ?? "",
    details: existing ? `Paiement supprimé : ${existing.montant} DA` : "",
  });

  return Response.json({ ok: true });
}
