import { db } from "@/db";
import { companySettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/api-guard";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

// Company settings describe the organization itself (name, contact, legal,
// system defaults) — unlike the rest of the app's "everyone can read" model,
// this is restricted to admins only, both for read and write.
const SETTINGS_ID = 1;

// A data-URL logo is stored inline in SQLite as TEXT. Cap it well below
// SQLite's practical row-size comfort zone so a huge upload can't bloat the
// DB file or slow down every settings read.
const MAX_LOGO_LENGTH = 1_500_000; // ~1.1 MB decoded

async function requireAdmin(req: Request, write: boolean) {
  const guard = await requireAuth(req, write ? { write: true } : undefined);
  if (!guard.ok) return guard;
  if (guard.session.role !== "admin") {
    return {
      ok: false as const,
      response: Response.json({ error: "Accès réservé aux administrateurs." }, { status: 403 }),
    };
  }
  return guard;
}

export async function GET(req: Request) {
  const guard = await requireAdmin(req, false);
  if (!guard.ok) return guard.response;

  const [row] = await db.select().from(companySettings).where(eq(companySettings.id, SETTINGS_ID));
  return Response.json(row ?? null);
}

function validate(body: Record<string, unknown>): string | null {
  if (!body.name || String(body.name).trim() === "") return "Le nom de l'organisation est obligatoire.";
  if (!body.currency || String(body.currency).trim() === "") return "La devise est obligatoire.";
  const tax = Number(body.defaultTaxRate);
  if (Number.isNaN(tax) || tax < 0 || tax > 100) return "Le taux de TVA par défaut doit être entre 0 et 100.";
  if (body.defaultLanguage !== "fr" && body.defaultLanguage !== "ar") return "Langue par défaut invalide.";
  if (typeof body.logoUrl === "string" && body.logoUrl.length > MAX_LOGO_LENGTH) {
    return "Le logo est trop volumineux (max ~1 Mo).";
  }
  if (body.email && String(body.email).trim() !== "" && !/^\S+@\S+\.\S+$/.test(String(body.email))) {
    return "Adresse e-mail invalide.";
  }
  const timeFields: [string, string][] = [
    ["creneauJourneeDebut", "Journée — heure de début"],
    ["creneauJourneeFin", "Journée — heure de fin"],
    ["creneauSoireeDebut", "Soirée — heure de début"],
    ["creneauSoireeFin", "Soirée — heure de fin"],
    ["creneauJourneeCompleteDebut", "Journée complète — heure de début"],
    ["creneauJourneeCompleteFin", "Journée complète — heure de fin"],
  ];
  for (const [key, label] of timeFields) {
    const v = String(body[key] ?? "");
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(v)) {
      return `${label} : format d'heure invalide (HH:MM).`;
    }
  }
  return null;
}

export async function PUT(req: Request) {
  const guard = await requireAdmin(req, true);
  if (!guard.ok) return guard.response;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Requête invalide." }, { status: 400 });
  }

  const error = validate(body);
  if (error) return Response.json({ error }, { status: 400 });

  const values = {
    logoUrl: String(body.logoUrl ?? ""),
    name: String(body.name).trim(),
    salleName: String(body.salleName ?? ""),
    description: String(body.description ?? ""),
    address: String(body.address ?? ""),
    city: String(body.city ?? ""),
    wilaya: String(body.wilaya ?? ""),
    country: String(body.country ?? "Algérie"),
    phone: String(body.phone ?? ""),
    phone2: String(body.phone2 ?? ""),
    email: String(body.email ?? ""),
    website: String(body.website ?? ""),
    rc: String(body.rc ?? ""),
    nif: String(body.nif ?? ""),
    nis: String(body.nis ?? ""),
    currency: String(body.currency).trim(),
    defaultTaxRate: String(Number(body.defaultTaxRate)),
    defaultLanguage: body.defaultLanguage as "fr" | "ar",
    creneauJourneeDebut: String(body.creneauJourneeDebut ?? "10:00"),
    creneauJourneeFin: String(body.creneauJourneeFin ?? "17:00"),
    creneauSoireeDebut: String(body.creneauSoireeDebut ?? "18:00"),
    creneauSoireeFin: String(body.creneauSoireeFin ?? "02:00"),
    creneauJourneeCompleteDebut: String(body.creneauJourneeCompleteDebut ?? "10:00"),
    creneauJourneeCompleteFin: String(body.creneauJourneeCompleteFin ?? "02:00"),
  };

  const [existing] = await db.select({ id: companySettings.id }).from(companySettings).where(eq(companySettings.id, SETTINGS_ID));

  const [row] = existing
    ? await db.update(companySettings).set(values).where(eq(companySettings.id, SETTINGS_ID)).returning()
    : await db.insert(companySettings).values({ id: SETTINGS_ID, ...values }).returning();

  await logAudit({
    session: guard.session,
    action: existing ? "update" : "create",
    module: "company-settings",
    entityId: SETTINGS_ID,
    entityLabel: values.name,
  });

  return Response.json(row);
}
