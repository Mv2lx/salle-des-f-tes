"use client";

import Image from "next/image";
import type { Client, Reservation, Salle, Payment } from "@/db/schema";
import { HOTEL, DOC_LABELS } from "@/lib/hotel";
import { computeTotals } from "@/lib/compute";
import { fmtMoney, fmtDate, fmtTime } from "@/lib/format";
import { resFinance } from "@/lib/finance";

export default function DocumentA4({
  type,
  reservation,
  client,
  salle,
  payments,
}: {
  type: string;
  reservation: Reservation;
  client: Client | undefined;
  salle: Salle | undefined;
  payments: Payment[];
}) {
  const label = DOC_LABELS[type] ?? DOC_LABELS.facture;
  const totals = computeTotals(reservation.items, reservation.remise, reservation.tvaTaux);
  const fin = resFinance(reservation, payments);
  const docNo = `${label.prefix}-${new Date().getFullYear()}-${String(reservation.id).padStart(4, "0")}`;

  const isRecu = type === "recu";
  const resPayments = payments.filter((p) => p.reservationId === reservation.id);

  return (
    // print:flex + print:flex-col together with the footer's print:mt-auto
    // below is what makes the document fill the full A4 page without an
    // awkward gap: instead of the content sitting bunched at the top with
    // empty space trailing after it, the footer is pinned to the true
    // bottom margin and the leftover space is absorbed naturally in between.
    <div className="print-page mx-auto flex w-full max-w-[210mm] flex-col bg-white text-slate-800 p-6 print:flex print:min-h-[297mm] print:w-[210mm] print:flex-col print:p-[16mm_16mm_14mm]">
      {/* Header */}
      <div className="flex items-start justify-between border-b-2 pb-5" style={{ borderColor: HOTEL.primary }}>
        <div className="flex items-center gap-4">
          <Image src={HOTEL.logo} alt="Logo" width={104} height={104} className="h-28 w-28 object-contain" />
          <div>
            <h1 className="text-3xl font-extrabold" style={{ color: HOTEL.primary }}>{HOTEL.nom}</h1>
            <p className="text-sm text-slate-500">{HOTEL.slogan}</p>
            <p className="mt-1 text-sm text-slate-500">{HOTEL.adresse}</p>
            <p className="text-sm text-slate-500">Tél : {HOTEL.telephone} · {HOTEL.email}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="inline-block rounded-lg px-5 py-2.5 text-white" style={{ background: HOTEL.primary }}>
            <div className="text-xl font-extrabold tracking-wide">{label.titre}</div>
          </div>
          <div className="mt-3 text-sm text-slate-600">
            <div><span className="font-semibold">N° :</span> {docNo}</div>
            <div><span className="font-semibold">Date :</span> {fmtDate(new Date())}</div>
            <div><span className="font-semibold">Réf. réservation :</span> {reservation.reference}</div>
          </div>
        </div>
      </div>

      {/* Parties */}
      <div className="mt-6 grid grid-cols-2 gap-5 text-sm">
        <div className="rounded-lg bg-slate-50 p-4">
          <div className="mb-1.5 text-xs font-bold uppercase text-slate-400">Client</div>
          <div className="font-bold text-slate-800">{client?.nom} {client?.prenom}</div>
          {client?.societe && <div>{client.societe}</div>}
          {client?.telephone && <div>Tél : {client.telephone}</div>}
          {client?.email && <div>{client.email}</div>}
          {(client?.ville || client?.wilaya) && <div>{client?.ville} {client?.wilaya}</div>}
          {client?.piece && <div>Pièce : {client.piece}</div>}
        </div>
        <div className="rounded-lg bg-slate-50 p-4">
          <div className="mb-1.5 text-xs font-bold uppercase text-slate-400">Détails de l&apos;événement</div>
          <div><span className="font-semibold">Type :</span> {reservation.typeEvenement}</div>
          <div><span className="font-semibold">Salle :</span> {salle?.nom}</div>
          <div><span className="font-semibold">Date :</span> {fmtDate(reservation.dateEvenement)}</div>
          <div><span className="font-semibold">Horaire :</span> {fmtTime(reservation.heureDebut)} – {fmtTime(reservation.heureFin)}</div>
          <div><span className="font-semibold">Invités :</span> {reservation.invites}</div>
        </div>
      </div>

      {/* Table prestations */}
      {!isRecu && (
        <table className="mt-6 w-full text-sm">
          <thead>
            <tr className="text-white" style={{ background: HOTEL.primary }}>
              <th className="px-3 py-2.5 text-left">Désignation</th>
              <th className="px-3 py-2.5 text-right">P.U. (DA)</th>
              <th className="px-3 py-2.5 text-center">Qté</th>
              <th className="px-3 py-2.5 text-right">Total (DA)</th>
            </tr>
          </thead>
          <tbody>
            {(reservation.items ?? []).map((it, i) => (
              <tr key={i} className="border-b border-slate-100">
                <td className="px-3 py-2.5">{it.nom}</td>
                <td className="px-3 py-2.5 text-right">{fmtMoney(it.prix)}</td>
                <td className="px-3 py-2.5 text-center">{it.qte}</td>
                <td className="px-3 py-2.5 text-right">{fmtMoney(it.prix * it.qte)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Reçu paiements */}
      {isRecu && (
        <table className="mt-6 w-full text-sm">
          <thead>
            <tr className="text-white" style={{ background: HOTEL.primary }}>
              <th className="px-3 py-2.5 text-left">Date</th>
              <th className="px-3 py-2.5 text-left">Mode</th>
              <th className="px-3 py-2.5 text-left">Référence</th>
              <th className="px-3 py-2.5 text-right">Montant (DA)</th>
            </tr>
          </thead>
          <tbody>
            {resPayments.length === 0 ? (
              <tr><td colSpan={4} className="px-3 py-3 text-center text-slate-400">Aucun paiement enregistré.</td></tr>
            ) : resPayments.map((p) => (
              <tr key={p.id} className="border-b border-slate-100">
                <td className="px-3 py-2.5">{fmtDate(p.datePaiement)}</td>
                <td className="px-3 py-2.5">{p.mode}</td>
                <td className="px-3 py-2.5">{p.reference || "—"}</td>
                <td className="px-3 py-2.5 text-right">{fmtMoney(p.montant)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Totaux */}
      <div className="mt-6 flex justify-end">
        <div className="w-80 text-sm">
          <TotRow label="Sous-total" value={fmtMoney(totals.sousTotal)} />
          {totals.remise > 0 && <TotRow label="Remise" value={`- ${fmtMoney(totals.remise)}`} />}
          <TotRow label="Total HT" value={fmtMoney(totals.totalHT)} />
          <TotRow label={`TVA (${reservation.tvaTaux}%)`} value={fmtMoney(totals.tva)} />
          <div className="my-1.5 flex justify-between rounded-md px-3 py-2 font-extrabold text-white" style={{ background: HOTEL.primary }}>
            <span>TOTAL TTC</span>
            <span>{fmtMoney(totals.totalTTC)}</span>
          </div>
          <TotRow label="Montant payé" value={fmtMoney(fin.paye)} />
          <div className="flex justify-between border-t border-slate-200 pt-1.5 font-bold" style={{ color: fin.solde > 0.5 ? "#dc2626" : "#16a34a" }}>
            <span>Solde restant</span>
            <span>{fmtMoney(Math.max(0, fin.solde))}</span>
          </div>
        </div>
      </div>

      {/* Footer: signature + mentions légales — pinned to the bottom margin
          of the page in print (print:mt-auto), regardless of how short the
          content above is, so the document always reads as a complete,
          properly composed full page rather than trailing off with a gap. */}
      <div className="mt-10 print:mt-auto">
        <div className="flex items-end justify-between">
          <div className="text-xs text-slate-400">
            <p>{HOTEL.rc} · {HOTEL.nif}</p>
          </div>
          <div className="text-center">
            <div className="mb-1 text-xs font-semibold text-slate-500">Cachet &amp; Signature</div>
            <div className="flex h-24 w-52 items-center justify-center rounded-lg border-2 border-dashed border-slate-200 text-xs text-slate-300">
              HOTEL EL FARES
            </div>
          </div>
        </div>

        <div className="mt-6 border-t border-slate-100 pt-2.5 text-center text-[10px] text-slate-400">
          Merci de votre confiance — {HOTEL.nom} · {HOTEL.telephone} · {HOTEL.email}
          {HOTEL.siteweb ? ` · ${HOTEL.siteweb}` : ""}
        </div>
      </div>
    </div>
  );
}

function TotRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between px-2 py-0.5 text-slate-600">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
