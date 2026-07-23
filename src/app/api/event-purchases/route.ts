import { db } from "@/db";
import { eventPurchases, reservations, ACHAT_CATEGORIES } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { requireAuth } from "@/lib/api-guard";
import { canRead } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Achats — purchases made specifically for one reservation's event, part of
// "Dépenses de l'événement". Always tied to a reservation (unlike the
// general expenses/route.ts, which allows a null reservationId).
// ---------------------------------------------------------------------------

async function requireReservation(rawId: unknown): Promise<number | null> {
  const id = Number(rawId);
  if (!Number.isFinite(id) || id <= 0) return null;
  const [res] = await db.select({ id: reservations.id }).from(reservations).where(eq(reservations.id, id));
  return res ? id : null;
}

function validate(body: Record<string, unknown>): string | null {
  if (!body.nomArticle || String(body.nomArticle).trim() === "") return "Le nom de l'article est obligatoire.";
  const quantite = Number(body.quantite);
  if (!Number.isFinite(quantite) || quantite <= 0) return "La quantité doit être un nombre positif.";
  const prixUnitaire = Number(body.prixUnitaire);
  if (!Number.isFinite(prixUnitaire) || prixUnitaire < 0) return "Le prix unitaire doit être un nombre positif ou nul.";
  if (!body.dateAchat || Number.isNaN(Date.parse(String(body.dateAchat)))) return "La date d'achat est invalide.";
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
    ? await db.select().from(eventPurchases).where(eq(eventPurchases.reservationId, Number(reservationId))).orderBy(desc(eventPurchases.dateAchat))
    : await db.select().from(eventPurchases).orderBy(desc(eventPurchases.dateAchat));
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

  const quantite = Number(body.quantite);
  const prixUnitaire = Number(body.prixUnitaire);
  const prixTotal = quantite * prixUnitaire;
  const categorie = ACHAT_CATEGORIES.includes(body.categorie) ? body.categorie : "Autre";

  const [row] = await db
    .insert(eventPurchases)
    .values({
      reservationId,
      nomArticle: String(body.nomArticle).trim(),
      categorie,
      fournisseur: body.fournisseur ?? "",
      quantite: String(quantite),
      prixUnitaire: String(prixUnitaire),
      prixTotal: String(prixTotal),
      dateAchat: body.dateAchat,
      observations: body.observations ?? "",
    })
    .returning();
  await logAudit({
    session: guard.session,
    action: "create",
    module: "depenses",
    entityId: row.id,
    entityLabel: row.nomArticle,
    details: `Achat évènement : ${row.nomArticle} (${row.prixTotal} DA) — réservation #${reservationId}`,
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

  const quantite = Number(body.quantite);
  const prixUnitaire = Number(body.prixUnitaire);
  const prixTotal = quantite * prixUnitaire;
  const categorie = ACHAT_CATEGORIES.includes(body.categorie) ? body.categorie : "Autre";

  const [row] = await db
    .update(eventPurchases)
    .set({
      reservationId,
      nomArticle: String(body.nomArticle).trim(),
      categorie,
      fournisseur: body.fournisseur ?? "",
      quantite: String(quantite),
      prixUnitaire: String(prixUnitaire),
      prixTotal: String(prixTotal),
      dateAchat: body.dateAchat,
      observations: body.observations ?? "",
    })
    .where(eq(eventPurchases.id, id))
    .returning();
  if (!row) {
    return Response.json({ error: "Achat introuvable." }, { status: 404 });
  }
  await logAudit({
    session: guard.session,
    action: "update",
    module: "depenses",
    entityId: row.id,
    entityLabel: row.nomArticle,
    details: `Achat évènement modifié : ${row.nomArticle} (${row.prixTotal} DA)`,
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
  const [existing] = await db.select().from(eventPurchases).where(eq(eventPurchases.id, Number(id)));
  await db.delete(eventPurchases).where(eq(eventPurchases.id, Number(id)));
  await logAudit({
    session: guard.session,
    action: "delete",
    module: "depenses",
    entityId: Number(id),
    entityLabel: existing?.nomArticle ?? "",
    details: existing ? `Achat évènement supprimé : ${existing.nomArticle} (${existing.prixTotal} DA)` : "",
  });
  return Response.json({ ok: true });
}
