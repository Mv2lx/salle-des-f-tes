// ---------------------------------------------------------------------------
// Créneaux (time slots) — "Journée" / "Soirée" / "Journée complète".
// A hall can be booked twice on the same date by two different clients (once
// for the day slot, once for the evening slot) as long as their hours don't
// overlap — the existing conflict check in the reservations API already
// supports this (it compares heureDebut/heureFin ranges), so this feature is
// purely a UX layer: three quick presets that fill heureDebut/heureFin, plus
// a real-time availability panel. Nothing new is required in the
// reservations table itself.
// ---------------------------------------------------------------------------

export type CreneauKey = "journee" | "soiree" | "journeeComplete";

export type CreneauRange = { debut: string; fin: string };
export type CreneauxDefaults = Record<CreneauKey, CreneauRange>;

export const CRENEAU_KEYS: CreneauKey[] = ["journee", "soiree", "journeeComplete"];

export const CRENEAU_LABELS: Record<CreneauKey, string> = {
  journee: "Journée",
  soiree: "Soirée",
  journeeComplete: "Journée complète",
};

// Fallback used until the admin-configured values (Paramètres > Système)
// have loaded, or if none were ever saved.
export const DEFAULT_CRENEAUX: CreneauxDefaults = {
  journee: { debut: "10:00", fin: "17:00" },
  soiree: { debut: "18:00", fin: "02:00" },
  journeeComplete: { debut: "10:00", fin: "02:00" },
};
