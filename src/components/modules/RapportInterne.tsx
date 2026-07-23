"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { Reservation } from "@/db/schema";
import type { ErpData } from "@/lib/store";
import { fmtMoney, fmtDate } from "@/lib/format";
import { reservationProfitability } from "@/lib/event-finance";
import { PageHeader, EmptyState } from "../ui";
import { IconLock, IconPrint, IconClose, IconSearch } from "../icons";
import RapportInterneDocument from "../RapportInterneDocument";

// ---------------------------------------------------------------------------
// وحدة إدارية بحتة (adminOnly في Sidebar / ErpApp): تعرض لكل حجز كراء قاعة
// صافي ربحه الحقيقي (الكراء - المصاريف المرتبطة به)، وتتيح طباعة/حفظ تقرير
// PDF داخلي منفصل تمامًا عن وحدة "Facturation" المخصصة لمستندات العميل —
// هذا التقرير لا يظهر ولا يُقترح أبدًا هناك.
// ---------------------------------------------------------------------------

export default function RapportInterne({ data }: { data: ErpData }) {
  const [q, setQ] = useState("");
  const [preview, setPreview] = useState<Reservation | null>(null);

  const clientName = (id: number) => {
    const c = data.clients.find((x) => x.id === id);
    return c ? `${c.nom} ${c.prenom ?? ""}`.trim() : "—";
  };
  const salleName = (id: number) => data.salles.find((s) => s.id === id)?.nom ?? "—";

  const rows = useMemo(() => {
    return data.reservations.map((r) => {
      const p = reservationProfitability(r, data.payments, data.eventPurchases, data.eventStaff, data.eventOtherExpenses);
      return { r, loyer: p.totalRevenus, depenses: p.totalDepenses, profit: p.beneficeNet };
    });
  }, [data.reservations, data.payments, data.eventPurchases, data.eventStaff, data.eventOtherExpenses]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter(({ r }) =>
      !s || [r.reference, clientName(r.clientId), r.typeEvenement, salleName(r.salleId)].join(" ").toLowerCase().includes(s),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, rows, data.clients, data.salles]);

  return (
    <div className="ef-fade">
      <div className={preview ? "no-print" : ""}>
        <PageHeader
          title="Rapport financier interne — Location de salle"
          subtitle="Rentabilité réelle par réservation (loyer − dépenses). Réservé aux administrateurs, jamais visible du client."
          action={
            <span className="ef-badge bg-red-100 text-red-700">
              <IconLock className="h-3.5 w-3.5" /> Usage interne uniquement
            </span>
          }
        />

        <div className="relative mb-4 max-w-md">
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="ef-input pl-9" placeholder="Rechercher une réservation…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>

        {filtered.length === 0 ? (
          <EmptyState text="Aucune réservation." />
        ) : (
          <div className="ef-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-xs uppercase text-slate-400">
                    <th className="px-4 py-3">Réf.</th>
                    <th>Client</th>
                    <th>Salle</th>
                    <th>Date</th>
                    <th className="text-right">Loyer salle</th>
                    <th className="text-right">Dépenses</th>
                    <th className="text-right">Profit net</th>
                    <th className="px-4" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(({ r, loyer, depenses, profit }) => (
                    <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{r.reference}</td>
                      <td className="font-medium text-slate-700">{clientName(r.clientId)}</td>
                      <td className="text-slate-600">{salleName(r.salleId)}</td>
                      <td className="text-slate-500">{fmtDate(r.dateEvenement)}</td>
                      <td className="text-right text-slate-700">{fmtMoney(loyer)}</td>
                      <td className="text-right text-red-600">{fmtMoney(depenses)}</td>
                      <td className="text-right font-bold" style={{ color: profit >= 0 ? "#16a34a" : "#dc2626" }}>
                        {fmtMoney(profit)}
                      </td>
                      <td className="px-4">
                        <button
                          onClick={() => setPreview(r)}
                          className="ef-btn ef-btn-ghost px-2.5 py-1.5 text-xs"
                        >
                          Rapport
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {preview && <DocumentPreview reservation={preview} onClose={() => setPreview(null)} data={data} />}
    </div>
  );
}

function DocumentPreview({
  reservation,
  onClose,
  data,
}: {
  reservation: Reservation;
  onClose: () => void;
  data: ErpData;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return createPortal(
    <div className="print-modal fixed inset-0 z-50 overflow-y-auto bg-slate-800/60">
      <div className="no-print sticky top-0 z-10 flex items-center justify-between bg-white px-5 py-3 shadow">
        <h3 className="font-bold text-slate-800">
          Rapport financier interne — {reservation.reference}
        </h3>
        <div className="flex gap-2">
          <button className="ef-btn ef-btn-primary" onClick={() => window.print()}>
            <IconPrint className="h-4 w-4" /> Imprimer / PDF
          </button>
          <button className="ef-btn ef-btn-ghost" onClick={onClose}>
            <IconClose className="h-4 w-4" /> Fermer
          </button>
        </div>
      </div>
      <div className="print-modal-inner flex justify-center p-6">
        <div className="print-modal-doc shadow-xl">
          <RapportInterneDocument
            reservation={reservation}
            client={data.clients.find((c) => c.id === reservation.clientId)}
            salle={data.salles.find((s) => s.id === reservation.salleId)}
            payments={data.payments}
            purchases={data.eventPurchases}
            staff={data.eventStaff}
            otherExpenses={data.eventOtherExpenses}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
