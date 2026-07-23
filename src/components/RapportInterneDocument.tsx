"use client";

import Image from "next/image";
import type { Client, EventOtherExpense, EventPurchase, EventStaff, Payment, Reservation, Salle } from "@/db/schema";
import { HOTEL } from "@/lib/hotel";
import { reservationProfitability, purchasesFor, staffFor, otherExpensesFor } from "@/lib/event-finance";
import { fmtMoney, fmtDate, num } from "@/lib/format";

// ---------------------------------------------------------------------------
// Rapport financier interne — Location de salle
//
// Ce document est réservé à un usage interne par la direction de l'hôtel.
// Il n'apparaît jamais dans le module "Facturation" ni dans aucun document
// remis au client — il n'est accessible que depuis un écran administratif
// séparé, réservé au rôle "admin" (voir components/modules/RapportInterne.tsx
// et ErpApp.tsx pour le contrôle d'accès).
// Toutes les valeurs (achats, salaires, autres dépenses, bénéfice net) sont
// recalculées à partir des données courantes à chaque affichage/impression,
// donc mises à jour automatiquement dès qu'une dépense liée à la réservation
// est ajoutée, modifiée ou supprimée (voir lib/event-finance.ts).
// ---------------------------------------------------------------------------

export default function RapportInterneDocument({
  reservation,
  client,
  salle,
  payments,
  purchases,
  staff,
  otherExpenses,
}: {
  reservation: Reservation;
  client: Client | undefined;
  salle: Salle | undefined;
  payments: Payment[];
  purchases: EventPurchase[];
  staff: EventStaff[];
  otherExpenses: EventOtherExpense[];
}) {
  const p = reservationProfitability(reservation, payments, purchases, staff, otherExpenses);
  const resPurchases = purchasesFor(reservation.id, purchases);
  const resStaff = staffFor(reservation.id, staff);
  const resOthers = otherExpensesFor(reservation.id, otherExpenses);

  const docNo = `INT-${new Date().getFullYear()}-${String(reservation.id).padStart(4, "0")}`;

  return (
    <div className="print-page mx-auto flex w-full max-w-[210mm] flex-col bg-white text-slate-800 p-6 print:flex print:min-h-[297mm] print:w-[210mm] print:flex-col print:p-[16mm_16mm_14mm]">
      {/* Header */}
      <div className="flex items-start justify-between border-b-2 pb-5" style={{ borderColor: HOTEL.primary }}>
        <div className="flex items-center gap-4">
          <Image src={HOTEL.logo} alt="Logo" width={104} height={104} className="h-28 w-28 object-contain" />
          <div>
            <h1 className="text-3xl font-extrabold" style={{ color: HOTEL.primary }}>{HOTEL.nom}</h1>
            <p className="text-sm text-slate-500">{HOTEL.adresse}</p>
            <p className="text-sm text-slate-500">Tél : {HOTEL.telephone} · {HOTEL.email}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="inline-block rounded-lg bg-slate-800 px-5 py-2.5 text-white">
            <div className="text-xl font-extrabold tracking-wide">RAPPORT FINANCIER INTERNE — LOCATION DE SALLE</div>
          </div>
          <div className="mt-3 text-sm text-slate-600">
            <div><span className="font-semibold">N° :</span> {docNo}</div>
            <div><span className="font-semibold">Date d&apos;impression :</span> {fmtDate(new Date())}</div>
          </div>
        </div>
      </div>

      {/* Client + Réservation */}
      <div className="mt-6 grid grid-cols-2 gap-5 text-sm">
        <div className="rounded-lg bg-slate-50 p-4">
          <div className="mb-1.5 text-xs font-bold uppercase text-slate-400">Client</div>
          <div className="font-bold text-slate-800">{client?.nom} {client?.prenom}</div>
          {client?.telephone && <div>Tél : {client.telephone}</div>}
          {client?.telephone2 && <div>Tél 2 : {client.telephone2}</div>}
          {client?.email && <div>{client.email}</div>}
          {(client?.ville || client?.wilaya) && <div>{client?.ville} {client?.wilaya}</div>}
        </div>
        <div className="rounded-lg bg-slate-50 p-4">
          <div className="mb-1.5 text-xs font-bold uppercase text-slate-400">Réservation</div>
          <div><span className="font-semibold">Réf. réservation :</span> {reservation.reference}</div>
          <div><span className="font-semibold">Salle réservée :</span> {salle?.nom ?? "—"}</div>
          <div><span className="font-semibold">Date de l&apos;événement :</span> {fmtDate(reservation.dateEvenement)}</div>
          <div><span className="font-semibold">Type d&apos;événement :</span> {reservation.typeEvenement}</div>
          <div><span className="font-semibold">Statut :</span> {reservation.statut}</div>
        </div>
      </div>

      {/* Revenus */}
      <div className="mt-6">
        <h4 className="mb-2 text-sm font-bold text-slate-700">Revenus</h4>
        <table className="w-full text-sm">
          <tbody>
            <tr className="border-b border-slate-100">
              <td className="px-3 py-2">Location de salle</td>
              <td className="px-3 py-2 text-right">{fmtMoney(p.revenuLocation)}</td>
            </tr>
            <tr className="border-b border-slate-100">
              <td className="px-3 py-2">Prestations supplémentaires</td>
              <td className="px-3 py-2 text-right">{fmtMoney(p.revenuPrestations)}</td>
            </tr>
            <tr className="font-bold text-slate-800">
              <td className="px-3 py-2">Total des revenus</td>
              <td className="px-3 py-2 text-right">{fmtMoney(p.totalRevenus)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Dépenses d'achats */}
      <div className="mt-6">
        <h4 className="mb-2 text-sm font-bold text-slate-700">Dépenses d&apos;achats</h4>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-white" style={{ background: "#1e293b" }}>
              <th className="px-3 py-2.5 text-left">Article</th>
              <th className="px-3 py-2.5 text-right">Quantité</th>
              <th className="px-3 py-2.5 text-right">Prix</th>
              <th className="px-3 py-2.5 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {resPurchases.length === 0 ? (
              <tr><td colSpan={4} className="px-3 py-3 text-center text-slate-400">Aucun achat enregistré.</td></tr>
            ) : resPurchases.map((a) => (
              <tr key={a.id} className="border-b border-slate-100">
                <td className="px-3 py-2">{a.nomArticle}</td>
                <td className="px-3 py-2 text-right">{num(a.quantite)}</td>
                <td className="px-3 py-2 text-right">{fmtMoney(a.prixUnitaire)}</td>
                <td className="px-3 py-2 text-right font-medium">{fmtMoney(a.prixTotal)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-bold text-slate-800">
              <td className="px-3 py-2" colSpan={3}>Total achats</td>
              <td className="px-3 py-2 text-right">{fmtMoney(p.totalAchats)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Personnel de l'événement */}
      <div className="mt-6">
        <h4 className="mb-2 text-sm font-bold text-slate-700">Personnel de l&apos;événement</h4>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-white" style={{ background: "#1e293b" }}>
              <th className="px-3 py-2.5 text-left">Type</th>
              <th className="px-3 py-2.5 text-left">Nom</th>
              <th className="px-3 py-2.5 text-right">Salaire</th>
              <th className="px-3 py-2.5 text-left">Statut</th>
            </tr>
          </thead>
          <tbody>
            {resStaff.length === 0 ? (
              <tr><td colSpan={4} className="px-3 py-3 text-center text-slate-400">Aucun employé enregistré.</td></tr>
            ) : resStaff.map((s) => (
              <tr key={s.id} className="border-b border-slate-100">
                <td className="px-3 py-2">{s.type}</td>
                <td className="px-3 py-2">{s.nom}</td>
                <td className="px-3 py-2 text-right">{fmtMoney(s.salaire)}</td>
                <td className="px-3 py-2">{s.statutPaiement}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-bold text-slate-800">
              <td className="px-3 py-2" colSpan={2}>Total salaires</td>
              <td className="px-3 py-2 text-right" colSpan={2}>{fmtMoney(p.totalSalaires)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Autres dépenses */}
      <div className="mt-6">
        <h4 className="mb-2 text-sm font-bold text-slate-700">Autres dépenses</h4>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-white" style={{ background: "#1e293b" }}>
              <th className="px-3 py-2.5 text-left">Libellé</th>
              <th className="px-3 py-2.5 text-right">Montant</th>
            </tr>
          </thead>
          <tbody>
            {resOthers.length === 0 ? (
              <tr><td colSpan={2} className="px-3 py-3 text-center text-slate-400">Aucune autre dépense enregistrée.</td></tr>
            ) : resOthers.map((o) => (
              <tr key={o.id} className="border-b border-slate-100">
                <td className="px-3 py-2">{o.libelle}</td>
                <td className="px-3 py-2 text-right font-medium">{fmtMoney(o.montant)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-bold text-slate-800">
              <td className="px-3 py-2">Total autres dépenses</td>
              <td className="px-3 py-2 text-right">{fmtMoney(p.totalAutres)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Résumé financier */}
      <div className="mt-6 flex justify-end">
        <div className="w-80 text-sm">
          <div className="mb-1.5 text-xs font-bold uppercase text-slate-400">Résumé financier</div>
          <SumRow label="Total des revenus" value={fmtMoney(p.totalRevenus)} />
          <SumRow label="Total des dépenses" value={`- ${fmtMoney(p.totalDepenses)}`} />
          <div
            className="my-1.5 flex justify-between rounded-md px-3 py-2 font-extrabold text-white"
            style={{ background: p.beneficeNet >= 0 ? "#16a34a" : "#dc2626" }}
          >
            <span>BÉNÉFICE NET</span>
            <span>{fmtMoney(p.beneficeNet)}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-10 print:mt-auto">
        <div className="mt-6 border-t border-slate-100 pt-2.5 text-center text-[10px] text-slate-400">
          {HOTEL.nom} · {HOTEL.telephone} · {HOTEL.email} · Document interne — ne pas remettre au client
        </div>
      </div>
    </div>
  );
}

function SumRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between px-2 py-0.5 text-slate-600">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
