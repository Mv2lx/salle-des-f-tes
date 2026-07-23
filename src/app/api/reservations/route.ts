import { db } from "@/db";
import { reservations } from "@/db/schema";
import { and, desc, eq, ne, sql } from "drizzle-orm";
import { requireAuth } from "@/lib/api-guard";
import { canRead } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

// better-sqlite3 (the driver behind drizzle-orm here) runs db.transaction()
// callbacks *synchronously* — the underlying native binding has no
// async/await support mid-transaction. So unlike a Postgres transaction,
// this callback must not use `await` internally; all queries below use the
// synchronous `.get()` / `.all()` / `.run()` accessors instead of being
// awaited. The `db.transaction(...)` call itself returns its result
// synchronously (not a Promise), which is why it isn't awaited below either.
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

function timesOverlap(s1: string, e1: string, s2: string, e2: string) {
  return s1 < e2 && s2 < e1;
}

function findConflict(
  tx: Tx,
  salleId: number,
  dateEvenement: string,
  heureDebut: string,
  heureFin: string,
  excludeId?: number,
) {
  const sameDay = tx
    .select()
    .from(reservations)
    .where(
      and(
        eq(reservations.salleId, salleId),
        eq(reservations.dateEvenement, dateEvenement),
        ne(reservations.statut, "Annulée"),
      ),
    )
    .all();
  return sameDay.find(
    (r) =>
      r.id !== excludeId &&
      timesOverlap(
        heureDebut,
        heureFin,
        r.heureDebut ?? "00:00",
        r.heureFin ?? "23:59",
      ),
  );
}

function validate(body: Record<string, unknown>) {
  if (!body.clientId || !Number(body.clientId)) return "Le client est obligatoire.";
  if (!body.salleId || !Number(body.salleId)) return "La salle est obligatoire.";
  if (!body.dateEvenement || Number.isNaN(Date.parse(String(body.dateEvenement)))) {
    return "La date de l'événement est invalide.";
  }
  return null;
}

export async function GET(req: Request) {
  const guard = await requireAuth(req);
  if (!guard.ok) return guard.response;
  if (!canRead(guard.session.role, "reservations")) {
    return Response.json({ error: "Accès refusé." }, { status: 403 });
  }
  const rows = await db.select().from(reservations).orderBy(desc(reservations.dateEvenement));
  return Response.json(rows);
}

export async function POST(req: Request) {
  const guard = await requireAuth(req, { module: "reservations", write: true });
  if (!guard.ok) return guard.response;

  const body = await req.json();
  const validationError = validate(body);
  if (validationError) {
    return Response.json({ error: validationError }, { status: 400 });
  }

  const salleId = Number(body.salleId);
  const dateEvenement = String(body.dateEvenement);
  const heureDebut = body.heureDebut ?? "18:00";
  const heureFin = body.heureFin ?? "23:00";

  try {
    const row = db.transaction((tx) => {
      if (body.statut !== "Annulée") {
        const conflict = findConflict(tx, salleId, dateEvenement, heureDebut, heureFin);
        if (conflict) {
          throw new ConflictError(
            `Conflit : la salle est déjà réservée le ${dateEvenement} (${conflict.reference}).`,
          );
        }
      }

      const countRow = tx
        .select({ count: sql<number>`count(*)` })
        .from(reservations)
        .get();
      const count = countRow?.count ?? 0;
      const year = new Date().getFullYear();
      const reference = `RES-${year}-${String(count + 1).padStart(4, "0")}`;

      const inserted = tx
        .insert(reservations)
        .values({
          reference,
          clientId: Number(body.clientId),
          salleId,
          typeEvenement: body.typeEvenement ?? "Mariage",
          packId: body.packId ? Number(body.packId) : null,
          packNom: body.packNom ?? "",
          dateEvenement,
          heureDebut,
          heureFin,
          invites: Number(body.invites) || 0,
          statut: body.statut ?? "Option",
          observations: body.observations ?? "",
          items: body.items ?? [],
          remise: String(body.remise ?? "0"),
          tvaTaux: String(body.tvaTaux ?? "19"),
        })
        .returning()
        .get();
      return inserted;
    });
    await logAudit({
      session: guard.session,
      action: "create",
      module: "reservations",
      entityId: row.id,
      entityLabel: row.reference,
    });
    return Response.json(row);
  } catch (err) {
    if (err instanceof ConflictError) {
      return Response.json({ error: err.message }, { status: 409 });
    }
    if (isUniqueViolation(err)) {
      return Response.json(
        { error: "Conflit temporaire lors de la génération de la référence. Veuillez réessayer." },
        { status: 409 },
      );
    }
    console.error("[reservations:POST]", err);
    return Response.json({ error: "Erreur lors de la création de la réservation." }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const guard = await requireAuth(req, { module: "reservations", write: true });
  if (!guard.ok) return guard.response;

  const body = await req.json();
  if (!body.id) {
    return Response.json({ error: "Identifiant de réservation manquant." }, { status: 400 });
  }
  const validationError = validate(body);
  if (validationError) {
    return Response.json({ error: validationError }, { status: 400 });
  }

  const id = Number(body.id);
  const salleId = Number(body.salleId);
  const dateEvenement = String(body.dateEvenement);
  const heureDebut = body.heureDebut ?? "18:00";
  const heureFin = body.heureFin ?? "23:00";

  try {
    const row = db.transaction((tx) => {
      if (body.statut !== "Annulée") {
        const conflict = findConflict(tx, salleId, dateEvenement, heureDebut, heureFin, id);
        if (conflict) {
          throw new ConflictError(
            `Conflit : la salle est déjà réservée le ${dateEvenement} (${conflict.reference}).`,
          );
        }
      }

      const updated = tx
        .update(reservations)
        .set({
          clientId: Number(body.clientId),
          salleId,
          typeEvenement: body.typeEvenement ?? "Mariage",
          packId: body.packId ? Number(body.packId) : null,
          packNom: body.packNom ?? "",
          dateEvenement,
          heureDebut,
          heureFin,
          invites: Number(body.invites) || 0,
          statut: body.statut ?? "Option",
          observations: body.observations ?? "",
          items: body.items ?? [],
          remise: String(body.remise ?? "0"),
          tvaTaux: String(body.tvaTaux ?? "19"),
        })
        .where(eq(reservations.id, id))
        .returning()
        .get();
      return updated;
    });

    if (!row) {
      return Response.json({ error: "Réservation introuvable." }, { status: 404 });
    }
    await logAudit({
      session: guard.session,
      action: "update",
      module: "reservations",
      entityId: row.id,
      entityLabel: row.reference,
    });
    return Response.json(row);
  } catch (err) {
    if (err instanceof ConflictError) {
      return Response.json({ error: err.message }, { status: 409 });
    }
    console.error("[reservations:PUT]", err);
    return Response.json({ error: "Erreur lors de la mise à jour de la réservation." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const guard = await requireAuth(req, { module: "reservations", write: true });
  if (!guard.ok) return guard.response;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return Response.json({ error: "Identifiant manquant." }, { status: 400 });
  }
  const [existing] = await db.select().from(reservations).where(eq(reservations.id, Number(id)));
  await db.delete(reservations).where(eq(reservations.id, Number(id)));
  await logAudit({
    session: guard.session,
    action: "delete",
    module: "reservations",
    entityId: Number(id),
    entityLabel: existing?.reference ?? "",
  });
  return Response.json({ ok: true });
}

class ConflictError extends Error {}

function isUniqueViolation(err: unknown): boolean {
  // better-sqlite3 throws a SqliteError with this code on UNIQUE constraint failures.
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "SQLITE_CONSTRAINT_UNIQUE"
  );
}
