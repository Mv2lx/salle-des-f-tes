import { db } from "@/db";
import { packs } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { requireAuth } from "@/lib/api-guard";
import { canRead } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const guard = await requireAuth(req);
  if (!guard.ok) return guard.response;
  if (!canRead(guard.session.role, "packs")) {
    return Response.json({ error: "Accès refusé." }, { status: 403 });
  }
  const rows = await db.select().from(packs).orderBy(asc(packs.nom));
  return Response.json(rows);
}

export async function POST(req: Request) {
  const guard = await requireAuth(req, { module: "packs", write: true });
  if (!guard.ok) return guard.response;

  const body = await req.json();
  if (!body.nom || String(body.nom).trim() === "") {
    return Response.json({ error: "Le nom du pack est obligatoire." }, { status: 400 });
  }
  const [row] = await db
    .insert(packs)
    .values({
      nom: body.nom,
      typeEvenement: body.typeEvenement ?? "",
      prix: String(body.prix ?? "0"),
      description: body.description ?? "",
      prestations: Array.isArray(body.prestations) ? body.prestations : [],
      actif: body.actif === false ? 0 : 1,
    })
    .returning();
  return Response.json(row);
}

export async function PUT(req: Request) {
  const guard = await requireAuth(req, { module: "packs", write: true });
  if (!guard.ok) return guard.response;

  const body = await req.json();
  if (!body.id) {
    return Response.json({ error: "Identifiant de pack manquant." }, { status: 400 });
  }
  const [row] = await db
    .update(packs)
    .set({
      nom: body.nom,
      typeEvenement: body.typeEvenement ?? "",
      prix: String(body.prix ?? "0"),
      description: body.description ?? "",
      prestations: Array.isArray(body.prestations) ? body.prestations : [],
      actif: body.actif ? 1 : 0,
    })
    .where(eq(packs.id, Number(body.id)))
    .returning();

  if (!row) {
    return Response.json({ error: "Pack introuvable." }, { status: 404 });
  }
  return Response.json(row);
}

export async function DELETE(req: Request) {
  const guard = await requireAuth(req, { module: "packs", write: true });
  if (!guard.ok) return guard.response;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return Response.json({ error: "Identifiant manquant." }, { status: 400 });
  }
  await db.delete(packs).where(eq(packs.id, Number(id)));
  return Response.json({ ok: true });
}
