import type { EventOtherExpense, EventPurchase, EventStaff, Payment, Reservation, ReservationItem } from "@/db/schema";
import { resFinance } from "./finance";
import { num } from "./format";

// ---------------------------------------------------------------------------
// Financial helpers for "Dépenses de l'événement" — the three reservation-
// scoped expense categories (Achats / Personnel / Autres dépenses) that feed
// the admin-only internal profitability report. Kept separate from
// lib/finance.ts (which only knows about revenue: items/remise/TVA/payments)
// so both the reservation edit screen and the internal report import the
// exact same math and can never drift apart.
// ---------------------------------------------------------------------------

export function purchasesFor(reservationId: number, purchases: EventPurchase[]): EventPurchase[] {
  return purchases
    .filter((p) => p.reservationId === reservationId)
    .sort((a, b) => a.dateAchat.localeCompare(b.dateAchat));
}

export function staffFor(reservationId: number, staff: EventStaff[]): EventStaff[] {
  return staff.filter((s) => s.reservationId === reservationId);
}

export function otherExpensesFor(reservationId: number, others: EventOtherExpense[]): EventOtherExpense[] {
  return others
    .filter((o) => o.reservationId === reservationId)
    .sort((a, b) => a.dateDepense.localeCompare(b.dateDepense));
}

export function purchasesTotal(list: EventPurchase[]): number {
  return list.reduce((s, p) => s + num(p.prixTotal), 0);
}

export function staffTotal(list: EventStaff[]): number {
  return list.reduce((s, p) => s + num(p.salaire), 0);
}

export function otherExpensesTotal(list: EventOtherExpense[]): number {
  return list.reduce((s, p) => s + num(p.montant), 0);
}

// "Location de salle" line items are added with prestationId: null and
// nom === "Location de salle" (see src/app/api/seed/route.ts and the
// "Location de salle" prestation category) — every other item on a
// reservation is a "Prestation supplémentaire". This mirrors the only
// signal already used consistently elsewhere in the app; reservations don't
// currently model the hall price as a separate field from `items`.
function isLocationItem(item: ReservationItem): boolean {
  return item.nom.trim().toLowerCase() === "location de salle";
}

export function splitRevenue(res: Reservation) {
  const items = res.items ?? [];
  const location = items.filter(isLocationItem).reduce((s, i) => s + num(i.prix) * num(i.qte), 0);
  const prestations = items.filter((i) => !isLocationItem(i)).reduce((s, i) => s + num(i.prix) * num(i.qte), 0);
  return { location, prestations };
}

export type EventExpensesTotals = {
  totalAchats: number;
  totalSalaires: number;
  totalAutres: number;
  totalDepenses: number;
};

export function eventExpensesTotals(
  reservationId: number,
  purchases: EventPurchase[],
  staff: EventStaff[],
  others: EventOtherExpense[],
): EventExpensesTotals {
  const totalAchats = purchasesTotal(purchasesFor(reservationId, purchases));
  const totalSalaires = staffTotal(staffFor(reservationId, staff));
  const totalAutres = otherExpensesTotal(otherExpensesFor(reservationId, others));
  return { totalAchats, totalSalaires, totalAutres, totalDepenses: totalAchats + totalSalaires + totalAutres };
}

export type ReservationProfitability = EventExpensesTotals & {
  revenuLocation: number;
  revenuPrestations: number;
  totalRevenus: number;
  beneficeNet: number;
};

/**
 * Full revenue/expenses/profit breakdown for one reservation, used by both
 * the reservation's live "Dépenses de l'événement" summary and the internal
 * PDF report. Total revenus reuses resFinance()'s totalTTC (remise + TVA
 * already applied) so it always matches what's shown everywhere else in the
 * app for that reservation; revenuLocation/revenuPrestations only split that
 * same total for display, they aren't independently taxed sub-totals.
 */
export function reservationProfitability(
  res: Reservation,
  payments: Payment[],
  purchases: EventPurchase[],
  staff: EventStaff[],
  others: EventOtherExpense[],
): ReservationProfitability {
  const fin = resFinance(res, payments);
  const { location, prestations } = splitRevenue(res);
  const expenses = eventExpensesTotals(res.id, purchases, staff, others);
  return {
    revenuLocation: location,
    revenuPrestations: prestations,
    totalRevenus: fin.totalTTC,
    ...expenses,
    beneficeNet: fin.totalTTC - expenses.totalDepenses,
  };
}
