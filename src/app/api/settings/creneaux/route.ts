import { db } from "@/db";
import { companySettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/api-guard";
import { DEFAULT_CRENEAUX, type CreneauxDefaults } from "@/lib/creneaux";

export const dynamic = "force-dynamic";

const SETTINGS_ID = 1;

// Unlike /api/company-settings (admin-only, full organization identity),
// these six hour values are operational defaults every role that creates
// reservations (receptionist included) needs to read — so this endpoint is
// open to any authenticated user, read-only. Editing still happens only
// through /api/company-settings ("Système" tab, admin-only).
export async function GET(req: Request) {
  const guard = await requireAuth(req);
  if (!guard.ok) return guard.response;

  const [row] = await db.select().from(companySettings).where(eq(companySettings.id, SETTINGS_ID));

  const creneaux: CreneauxDefaults = {
    journee: {
      debut: row?.creneauJourneeDebut || DEFAULT_CRENEAUX.journee.debut,
      fin: row?.creneauJourneeFin || DEFAULT_CRENEAUX.journee.fin,
    },
    soiree: {
      debut: row?.creneauSoireeDebut || DEFAULT_CRENEAUX.soiree.debut,
      fin: row?.creneauSoireeFin || DEFAULT_CRENEAUX.soiree.fin,
    },
    journeeComplete: {
      debut: row?.creneauJourneeCompleteDebut || DEFAULT_CRENEAUX.journeeComplete.debut,
      fin: row?.creneauJourneeCompleteFin || DEFAULT_CRENEAUX.journeeComplete.fin,
    },
  };

  return Response.json(creneaux);
}
