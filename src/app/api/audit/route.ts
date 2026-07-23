import { db } from "@/db";
import { auditLog } from "@/db/schema";
import { desc } from "drizzle-orm";
import { requireAuth } from "@/lib/api-guard";

export const dynamic = "force-dynamic";

// Audit log is sensitive (who did what) — restricted to admins only, unlike
// the rest of the app's "everyone can read" model.
export async function GET(req: Request) {
  const guard = await requireAuth(req);
  if (!guard.ok) return guard.response;
  if (guard.session.role !== "admin") {
    return Response.json({ error: "Accès réservé aux administrateurs." }, { status: 403 });
  }
  const rows = await db.select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(500);
  return Response.json(rows);
}
