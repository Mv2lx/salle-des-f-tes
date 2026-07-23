"use client";

import Image from "next/image";
import type { Client, Reservation, Salle } from "@/db/schema";
import { HOTEL, DOC_LABELS } from "@/lib/hotel";
import { REGLEMENT_ARTICLES } from "@/lib/reglement";
import { fmtDate } from "@/lib/format";

export default function ReglementDocument({
  reservation,
  client,
  salle,
}: {
  reservation: Reservation;
  client: Client | undefined;
  salle: Salle | undefined;
}) {
  const label = DOC_LABELS.reglement;
  const docNo = `${label.prefix}-${new Date().getFullYear()}-${String(reservation.id).padStart(4, "0")}`;

  return (
    // Same full-page, no-dead-space approach as the invoice (DocumentA4):
    // print:flex + the signature block's print:mt-auto pins it to the true
    // bottom margin regardless of how many articles fit above it.
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
          {client?.telephone && <div>Tél : {client.telephone}</div>}
        </div>
        <div className="rounded-lg bg-slate-50 p-4">
          <div className="mb-1.5 text-xs font-bold uppercase text-slate-400">Événement</div>
          <div><span className="font-semibold">Salle :</span> {salle?.nom}</div>
          <div><span className="font-semibold">Date :</span> {fmtDate(reservation.dateEvenement)}</div>
        </div>
      </div>

      {/* Articles du règlement */}
      <div className="mt-6 space-y-4">
        {REGLEMENT_ARTICLES.map((art, i) => (
          <div key={i} className="text-sm leading-relaxed">
            <p className="font-bold text-slate-800">
              Article {i + 1} — {art.titre}
            </p>
            <p className="text-slate-600">{art.texte}</p>
          </div>
        ))}
      </div>

      {/* Footer: acknowledgement + signature — pinned to the bottom margin
          of the page in print (print:mt-auto), same technique as the
          invoice, so the document always fills the page properly. */}
      <div className="mt-10 print:mt-auto">
        <p className="text-sm text-slate-600">
          Je soussigné(e) <span className="font-semibold">{client ? `${client.nom} ${client.prenom ?? ""}`.trim() : "……………………………"}</span>,
          déclare avoir pris connaissance du présent règlement intérieur et en accepter les termes.
        </p>

        <div className="mt-8 flex items-end justify-between">
          <div className="text-xs text-slate-400">
            <p>{HOTEL.rc} · {HOTEL.nif}</p>
          </div>
          <div className="text-center">
            <div className="mb-1 text-xs font-semibold text-slate-500">Signature du client (précédée de &quot;Lu et approuvé&quot;)</div>
            <div className="flex h-24 w-52 items-center justify-center rounded-lg border-2 border-dashed border-slate-200 text-xs text-slate-300">
              Signature
            </div>
          </div>
        </div>

        <div className="mt-6 border-t border-slate-100 pt-2.5 text-center text-[10px] text-slate-400">
          {HOTEL.nom} · {HOTEL.telephone} · {HOTEL.email}
          {HOTEL.siteweb ? ` · ${HOTEL.siteweb}` : ""}
        </div>
      </div>
    </div>
  );
}
