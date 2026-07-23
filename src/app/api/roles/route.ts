import { db } from "@/db";
import { rolePermissions, ROLES } from "@/db/schema";
import { requireAuth } from "@/lib/api-guard";
import { defaultPermissions, PERMISSION_MODULES } from "@/lib/permissions";

export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  const guard = await requireAuth(req); if (!guard.ok) return guard.response;
  if (guard.session.role !== "admin") return Response.json({ error: "Accès réservé aux administrateurs." }, { status: 403 });
  const rows = await db.select().from(rolePermissions);
  return Response.json({ modules: PERMISSION_MODULES, roles: ROLES.map((role) => ({ role, permissions: role === "admin" ? ["*"] : rows.find((r) => r.role === role)?.permissions ?? defaultPermissions(role) })) });
}
