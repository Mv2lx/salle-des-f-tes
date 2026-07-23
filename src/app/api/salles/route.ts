import { db } from "@/db";
import { salles } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { requireAuth } from "@/lib/api-guard";
import { canRead } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const guard = await requireAuth(req);
  if (!guard.ok) return guard.response;
  if (!canRead(guard.session.role, "salles")) {
    return Response.json({ error: "Accès refusé." }, { status: 403 });
  }
  const rows = await db.select().from(salles).orderBy(asc(salles.id));
  return Response.json(rows);
}

export async function POST(req: Request) {
  const guard = await requireAuth(req, { module: "salles", write: true });
  if (!guard.ok) return guard.response;

  const body = await req.json();
  if (!body.nom || String(body.nom).trim() === "") {
    return Response.json({ error: "Le nom de la salle est obligatoire." }, { status: 400 });
  }
  const [row] = await db
    .insert(salles)
    .values({
      nom: body.nom,
      capacite: Number(body.capacite) || 0,
      tarif: String(body.tarif ?? "0"),
      equipements: body.equipements ?? "",
      couleur: body.couleur ?? "#F5A623",
      description: body.description ?? "",
    })
    .returning();
  return Response.json(row);
}

export async function PUT(req: Request) {
  const guard = await requireAuth(req, { module: "salles", write: true });
  if (!guard.ok) return guard.response;

  const body = await req.json();
  if (!body.id) {
    return Response.json({ error: "Identifiant de salle manquant." }, { status: 400 });
  }
  const [row] = await db
    .update(salles)
    .set({
      nom: body.nom,
      capacite: Number(body.capacite) || 0,
      tarif: String(body.tarif ?? "0"),
      equipements: body.equipements ?? "",
      couleur: body.couleur ?? "#F5A623",
      description: body.description ?? "",
    })
    .where(eq(salles.id, Number(body.id)))
    .returning();

  if (!row) {
    return Response.json({ error: "Salle introuvable." }, { status: 404 });
  }
  return Response.json(row);
}
