import type { Reservation, ReservationItem } from "@/db/schema";
import { num } from "./format";

export type Totals = {
  sousTotal: number;
  remise: number;
  totalHT: number;
  tva: number;
  totalTTC: number;
};

export function computeTotals(
  items: ReservationItem[] | null | undefined,
  remise: number | string,
  tvaTaux: number | string,
): Totals {
  const list = items ?? [];
  const sousTotal = list.reduce((s, it) => s + num(it.prix) * num(it.qte), 0);
  const rem = num(remise);
  const totalHT = Math.max(0, sousTotal - rem);
  const tva = (totalHT * num(tvaTaux)) / 100;
  const totalTTC = totalHT + tva;
  return { sousTotal, remise: rem, totalHT, tva, totalTTC };
}

export const STATUTS = ["Confirmée", "Option", "Annulée", "Terminée"] as const;
export const TYPES_EVENEMENT = [
  "Mariage",
  "Fiançailles",
  "Anniversaire",
  "Conférence",
  "Séminaire",
  "Réunion",
  "Dîner",
  "Autre",
] as const;
export const MODES_PAIEMENT = [
  "Espèces",
  "Carte bancaire",
  "Virement",
  "Chèque",
  "Paiement mixte",
] as const;
export const CATEGORIES_PRESTATION = [
  "Location de salle",
  "Restauration",
  "Animation",
  "Média",
  "Technique",
  "Confort",
  "Services",
  "Autres",
] as const;

export function statutColor(statut: string): { bg: string; fg: string; dot: string } {
  switch (statut) {
    case "Confirmée":
      return { bg: "#e7f6ec", fg: "#137a3b", dot: "#22a35a" };
    case "Option":
      return { bg: "#fff2df", fg: "#b56a00", dot: "#f5a623" };
    case "Annulée":
      return { bg: "#fdeaea", fg: "#c0392b", dot: "#e74c3c" };
    case "Terminée":
      return { bg: "#e8effc", fg: "#2560c9", dot: "#3b82f6" };
    default:
      return { bg: "#eef0f4", fg: "#4a5162", dot: "#94a3b8" };
  }
}

// ---------------------------------------------------------------------------
// Créneaux / disponibilité — utilisé par le formulaire de réservation pour
// détecter les chevauchements en temps réel (même logique que l'API, gardée
// en synchronisation manuelle : voir findConflict() dans
// src/app/api/reservations/route.ts, l'API reste la source de vérité
// autoritaire au moment de l'enregistrement).
// ---------------------------------------------------------------------------

/** Deux plages [s1,e1) et [s2,e2) se chevauchent-elles ? */
export function timesOverlap(s1: string, e1: string, s2: string, e2: string): boolean {
  return s1 < e2 && s2 < e1;
}

/** Durée lisible entre deux heures "HH:MM", en gérant les créneaux qui passent minuit (ex. 18:00–02:00). */
export function durationLabel(debut: string, fin: string): string {
  const [sh, sm] = debut.split(":").map(Number);
  const [eh, em] = fin.split(":").map(Number);
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return "—";
  let mins = eh * 60 + em - (sh * 60 + sm);
  if (mins <= 0) mins += 24 * 60;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, "0")}`;
}

/** Réservations en conflit pour une salle/date/horaire donnés (statut "Annulée" ignoré). */
export function findSalleConflicts(
  reservations: Reservation[],
  salleId: number,
  dateEvenement: string,
  heureDebut: string,
  heureFin: string,
  excludeId?: number,
): Reservation[] {
  if (!salleId || !dateEvenement || !heureDebut || !heureFin) return [];
  return reservations.filter(
    (r) =>
      r.salleId === salleId &&
      r.dateEvenement === dateEvenement &&
      r.statut !== "Annulée" &&
      r.id !== excludeId &&
      timesOverlap(heureDebut, heureFin, r.heureDebut ?? "00:00", r.heureFin ?? "23:59"),
  );
}
