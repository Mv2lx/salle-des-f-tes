import { db } from "@/db";
import { rolePermissions, ROLES, type Role } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/api-guard";
import { logAudit } from "@/lib/audit";
import { PERMISSION_MODULES } from "@/lib/permissions";

export async function PUT(req: Request, { params }: { params: Promise<{ role: string }> }) {
  const guard = await requireAuth(req, { write: true }); if (!guard.ok) return guard.response;
  if (guard.session.role !== "admin") return Response.json({ error: "Accès réservé aux administrateurs." }, { status: 403 });
  const role = (await params).role as Role;
  if (!ROLES.includes(role) || role === "admin") return Response.json({ error: "Le rôle Administrateur a toujours tous les accès." }, { status: 400 });
  let body: { permissions?: unknown }; try { body = await req.json(); } catch { return Response.json({ error: "Requête invalide." }, { status: 400 }); }
  if (!Array.isArray(body.permissions) || body.permissions.some((p) => typeof p !== "string" || !PERMISSION_MODULES.includes(p as typeof PERMISSION_MODULES[number]))) return Response.json({ error: "Liste de permissions invalide." }, { status: 400 });
  const permissions = [...new Set(body.permissions as string[])];
  await db.insert(rolePermissions).values({ role, permissions, updatedAt: new Date().toISOString() }).onConflictDoUpdate({ target: rolePermissions.role, set: { permissions, updatedAt: new Date().toISOString() } });
  await logAudit({ session: guard.session, action: "update", module: "roles", entityLabel: role, details: "Permissions mises à jour" });
  return Response.json({ role, permissions });
}
