import { db } from "@/db";
import { expenses, reservations } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { requireAuth } from "@/lib/api-guard";
import { canRead } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const guard = await requireAuth(req);
  if (!guard.ok) return guard.response;
  if (!canRead(guard.session.role, "depenses")) {
    return Response.json({ error: "Accès refusé." }, { status: 403 });
  }
  const rows = await db.select().from(expenses).orderBy(desc(expenses.dateDepense));
  return Response.json(rows);
}

// Parses the optional "link to a reservation" field. Returns `undefined` on
// invalid input (caller responds 400), `null` for "no link" (general
// expense), or the numeric reservation id once verified to exist.
async function parseReservationId(raw: unknown): Promise<number | null | undefined> {
  if (raw === undefined || raw === null || raw === "") return null;
  const id = Number(raw);
  if (!Number.isFinite(id) || id <= 0) return undefined;
  const [res] = await db.select({ id: reservations.id }).from(reservations).where(eq(reservations.id, id));
  return res ? id : undefined;
}

export async function POST(req: Request) {
  const guard = await requireAuth(req, { module: "depenses", write: true });
  if (!guard.ok) return guard.response;

  const body = await req.json();
  const montant = Number(body.montant);
  if (!Number.isFinite(montant) || montant <= 0) {
    return Response.json({ error: "Le montant doit être un nombre positif." }, { status: 400 });
  }
  if (!body.dateDepense || Number.isNaN(Date.parse(String(body.dateDepense)))) {
    return Response.json({ error: "La date de dépense est invalide." }, { status: 400 });
  }
  const reservationId = await parseReservationId(body.reservationId);
  if (reservationId === undefined) {
    return Response.json({ error: "La réservation liée est introuvable." }, { status: 400 });
  }

  const [row] = await db
    .insert(expenses)
    .values({
      fournisseur: body.fournisseur ?? "",
      nature: body.nature ?? "",
      dateDepense: body.dateDepense,
      montant: String(montant),
      mode: body.mode ?? "Espèces",
      observation: body.observation ?? "",
      reservationId,
    })
    .returning();
  await logAudit({
    session: guard.session,
    action: "create",
    module: "depenses",
    entityId: row.id,
    entityLabel: row.nature || row.fournisseur || "",
    details: `Dépense de ${row.montant} DA`,
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
  const montant = Number(body.montant);
  if (!Number.isFinite(montant) || montant <= 0) {
    return Response.json({ error: "Le montant doit être un nombre positif." }, { status: 400 });
  }
  if (!body.dateDepense || Number.isNaN(Date.parse(String(body.dateDepense)))) {
    return Response.json({ error: "La date de dépense est invalide." }, { status: 400 });
  }
  const reservationId = await parseReservationId(body.reservationId);
  if (reservationId === undefined) {
    return Response.json({ error: "La réservation liée est introuvable." }, { status: 400 });
  }

  const [row] = await db
    .update(expenses)
    .set({
      fournisseur: body.fournisseur ?? "",
      nature: body.nature ?? "",
      dateDepense: body.dateDepense,
      montant: String(montant),
      mode: body.mode ?? "Espèces",
      observation: body.observation ?? "",
      reservationId,
    })
    .where(eq(expenses.id, id))
    .returning();
  if (!row) {
    return Response.json({ error: "Dépense introuvable." }, { status: 404 });
  }
  await logAudit({
    session: guard.session,
    action: "update",
    module: "depenses",
    entityId: row.id,
    entityLabel: row.nature || row.fournisseur || "",
    details: `Dépense modifiée : ${row.montant} DA`,
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
  const [existing] = await db.select().from(expenses).where(eq(expenses.id, Number(id)));
  await db.delete(expenses).where(eq(expenses.id, Number(id)));
  await logAudit({
    session: guard.session,
    action: "delete",
    module: "depenses",
    entityId: Number(id),
    entityLabel: existing?.nature || existing?.fournisseur || "",
    details: existing ? `Dépense supprimée : ${existing.montant} DA` : "",
  });
  return Response.json({ ok: true });
}
