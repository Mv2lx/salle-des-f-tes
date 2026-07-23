import { db } from "@/db";
import { expenseCategories } from "@/db/schema";
import { asc } from "drizzle-orm";
import { requireAuth } from "@/lib/api-guard";
import { canRead } from "@/lib/permissions";

export const dynamic = "force-dynamic";

// Read-only for now — every role can read (matches the app's "everyone can
// read" model). Admin-only create/edit/delete (management UI) is a follow-up
// phase; for now categories are seeded by /api/seed.
export async function GET(req: Request) {
  const guard = await requireAuth(req);
  if (!guard.ok) return guard.response;
  if (!canRead(guard.session.role, "expense-categories")) {
    return Response.json({ error: "Accès refusé." }, { status: 403 });
  }
  const rows = await db.select().from(expenseCategories).orderBy(asc(expenseCategories.name));
  return Response.json(rows);
}
