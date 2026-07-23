import type { Payment, Reservation } from "@/db/schema";
import { computeTotals } from "./compute";
import { num } from "./format";

export function paidFor(reservationId: number, payments: Payment[]): number {
  return payments
    .filter((p) => p.reservationId === reservationId)
    .reduce((s, p) => s + num(p.montant), 0);
}

export function resFinance(res: Reservation, payments: Payment[]) {
  const totals = computeTotals(res.items, res.remise, res.tvaTaux);
  const paye = paidFor(res.id, payments);
  const solde = totals.totalTTC - paye;
  return { ...totals, paye, solde };
}

export function sameDay(a: string, b: string) {
  return a.slice(0, 10) === b.slice(0, 10);
}

export function inRange(dateStr: string, from: Date, to: Date) {
  const d = new Date(dateStr);
  return d >= from && d <= to;
}
