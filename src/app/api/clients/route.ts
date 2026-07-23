import { db } from "@/db";
import { clients } from "@/db/schema";
import { desc } from "drizzle-orm";
import { requireAuth } from "@/lib/api-guard";
import { canRead } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const guard = await requireAuth(req);
  if (!guard.ok) return guard.response;
  if (!canRead(guard.session.role, "clients")) {
    return Response.json({ error: "Accès refusé." }, { status: 403 });
  }
  const rows = await db.select().from(clients).orderBy(desc(clients.id));
  return Response.json(rows);
}

export async function POST(req: Request) {
  const guard = await requireAuth(req, { module: "clients", write: true });
  if (!guard.ok) return guard.response;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Requête invalide." }, { status: 400 });
  }
  if (!body.nom || String(body.nom).trim() === "") {
    return Response.json({ error: "Le nom est obligatoire." }, { status: 400 });
  }
  const [row] = await db
    .insert(clients)
    .values({
      nom: String(body.nom),
      prenom: String(body.prenom ?? ""),
      societe: String(body.societe ?? ""),
      telephone: String(body.telephone ?? ""),
      telephone2: String(body.telephone2 ?? ""),
      email: String(body.email ?? ""),
      adresse: String(body.adresse ?? ""),
      ville: String(body.ville ?? ""),
      wilaya: String(body.wilaya ?? ""),
      pays: String(body.pays ?? "Algérie"),
      piece: String(body.piece ?? ""),
      commentaires: String(body.commentaires ?? ""),
    })
    .returning();
  await logAudit({
    session: guard.session,
    action: "create",
    module: "clients",
    entityId: row.id,
    entityLabel: `${row.nom} ${row.prenom ?? ""}`.trim(),
  });
  return Response.json(row);
}
