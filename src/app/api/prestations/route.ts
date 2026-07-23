import { db } from "@/db";
import { prestations } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { requireAuth } from "@/lib/api-guard";
import { canRead } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const guard = await requireAuth(req);
  if (!guard.ok) return guard.response;
  if (!canRead(guard.session.role, "prestations")) {
    return Response.json({ error: "Accès refusé." }, { status: 403 });
  }
  const rows = await db.select().from(prestations).orderBy(asc(prestations.categorie), asc(prestations.nom));
  return Response.json(rows);
}

export async function POST(req: Request) {
  const guard = await requireAuth(req, { module: "prestations", write: true });
  if (!guard.ok) return guard.response;

  const body = await req.json();
  if (!body.nom || String(body.nom).trim() === "") {
    return Response.json({ error: "Le nom de la prestation est obligatoire." }, { status: 400 });
  }
  const [row] = await db
    .insert(prestations)
    .values({
      nom: body.nom,
      categorie: body.categorie ?? "Autres",
      unite: body.unite ?? "unité",
      prix: String(body.prix ?? "0"),
      actif: body.actif === false ? 0 : 1,
    })
    .returning();
  return Response.json(row);
}

export async function PUT(req: Request) {
  const guard = await requireAuth(req, { module: "prestations", write: true });
  if (!guard.ok) return guard.response;

  const body = await req.json();
  if (!body.id) {
    return Response.json({ error: "Identifiant de prestation manquant." }, { status: 400 });
  }
  const [row] = await db
    .update(prestations)
    .set({
      nom: body.nom,
      categorie: body.categorie ?? "Autres",
      unite: body.unite ?? "unité",
      prix: String(body.prix ?? "0"),
      actif: body.actif ? 1 : 0,
    })
    .where(eq(prestations.id, Number(body.id)))
    .returning();

  if (!row) {
    return Response.json({ error: "Prestation introuvable." }, { status: 404 });
  }
  return Response.json(row);
}

export async function DELETE(req: Request) {
  const guard = await requireAuth(req, { module: "prestations", write: true });
  if (!guard.ok) return guard.response;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return Response.json({ error: "Identifiant manquant." }, { status: 400 });
  }
  await db.delete(prestations).where(eq(prestations.id, Number(id)));
  return Response.json({ ok: true });
}
