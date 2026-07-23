import { db } from "@/db";
import { expenses } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/api-guard";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAuth(req, { module: "depenses", write: true });
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const [existing] = await db.select().from(expenses).where(eq(expenses.id, Number(id)));
  if (!existing) {
    return Response.json({ error: "Dépense introuvable." }, { status: 404 });
  }
  // Same rule as DELETE: expenses linked to a reservation can only be
  // edited by an admin, regardless of the generic "depenses" write permission.
  if (existing.reservationId && guard.session.role !== "admin") {
    return Response.json(
      { error: "Seul un administrateur peut modifier une dépense liée à une réservation." },
      { status: 403 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Requête invalide." }, { status: 400 });
  }

  const montant = Number(body.montant);
  if (!Number.isFinite(montant) || montant <= 0) {
    return Response.json({ error: "Le montant doit être un nombre positif." }, { status: 400 });
  }
  if (!body.dateDepense || Number.isNaN(Date.parse(String(body.dateDepense)))) {
    return Response.json({ error: "La date de dépense est invalide." }, { status: 400 });
  }

  const [row] = await db
    .update(expenses)
    .set({
      fournisseur: String(body.fournisseur ?? ""),
      nature: String(body.nature ?? ""),
      dateDepense: String(body.dateDepense),
      montant: String(montant),
      mode: String(body.mode ?? "Espèces"),
      observation: String(body.observation ?? ""),
      categoryId: body.categoryId ? Number(body.categoryId) : null,
    })
    .where(eq(expenses.id, Number(id)))
    .returning();

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
