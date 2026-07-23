"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { Reservation } from "@/db/schema";
import type { ErpData } from "@/lib/store";
import { fmtMoney, fmtDate } from "@/lib/format";
import { resFinance } from "@/lib/finance";
import { DOC_LABELS } from "@/lib/hotel";
import { PageHeader, EmptyState } from "../ui";
import { IconInvoice, IconPrint, IconClose, IconSearch } from "../icons";
import DocumentA4 from "../DocumentA4";
import ReglementDocument from "../ReglementDocument";

const DOC_TYPES = [
  { key: "devis", label: "Devis" },
  { key: "facture", label: "Facture" },
  { key: "recu", label: "Reçu" },
  { key: "bon", label: "Bon de réservation" },
  { key: "confirmation", label: "Confirmation" },
  { key: "reglement", label: "Règlement intérieur" },
];

export default function Facturation({ data }: { data: ErpData }) {
  const [q, setQ] = useState("");
  const [preview, setPreview] = useState<{ res: Reservation; type: string } | null>(null);

  const clientName = (id: number) => {
    const c = data.clients.find((x) => x.id === id);
    return c ? `${c.nom} ${c.prenom ?? ""}`.trim() : "—";
  };

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return data.reservations.filter((r) =>
      !s || [r.reference, clientName(r.clientId), r.typeEvenement].join(" ").toLowerCase().includes(s),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, data.reservations, data.clients]);

  return (
    <div className="ef-fade">
      <div className={preview ? "no-print" : ""}>
        <PageHeader
          title="Facturation"
          subtitle="Générez devis, factures, reçus, bons, confirmations et règlement intérieur au format A4"
        />

        <div className="relative mb-4 max-w-md">
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="ef-input pl-9" placeholder="Rechercher une réservation…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>

        {filtered.length === 0 ? (
          <EmptyState text="Aucune réservation à facturer." />
        ) : (
          <div className="space-y-3">
            {filtered.map((r) => {
              const f = resFinance(r, data.payments);
              return (
                <div key={r.id} className="ef-card flex flex-wrap items-center gap-4 p-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#fff4e0] text-[#b56a00]">
                    <IconInvoice className="h-5 w-5" />
                  </div>
                  <div className="min-w-[180px] flex-1">
                    <p className="font-bold text-slate-800">{clientName(r.clientId)}</p>
                    <p className="text-xs text-slate-500">
                      {r.reference} · {r.typeEvenement} · {fmtDate(r.dateEvenement)}
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-bold text-slate-800">{fmtMoney(f.totalTTC)}</p>
                    <p className="text-xs text-slate-500">Solde : {fmtMoney(f.solde)}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {DOC_TYPES.map((d) => (
                      <button
                        key={d.key}
                        onClick={() => setPreview({ res: r, type: d.key })}
                        className="ef-btn ef-btn-ghost px-2.5 py-1.5 text-xs"
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {preview && (
        <DocumentPreview
          preview={preview}
          setPreview={setPreview}
          data={data}
        />
      )}
    </div>
  );
}

function DocumentPreview({
  preview,
  setPreview,
  data,
}: {
  preview: { res: Reservation; type: string };
  setPreview: (p: { res: Reservation; type: string } | null) => void;
  data: ErpData;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  // Portal : évite que .ef-fade (parent animé) ne devienne un containing block
  // pour ce "fixed", ce qui casserait le centrage/plein écran de l'aperçu.
  return createPortal(
    <div className="print-modal fixed inset-0 z-50 overflow-y-auto bg-slate-800/60">
      <div className="no-print sticky top-0 z-10 flex items-center justify-between bg-white px-5 py-3 shadow">
        <div className="flex items-center gap-3">
          <h3 className="font-bold text-slate-800">
            {DOC_LABELS[preview.type].titre} — {preview.res.reference}
          </h3>
          <select
            className="ef-input max-w-[200px]"
            value={preview.type}
            onChange={(e) => setPreview({ ...preview, type: e.target.value })}
          >
            {DOC_TYPES.map((d) => (
              <option key={d.key} value={d.key}>{d.label}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button className="ef-btn ef-btn-primary" onClick={() => window.print()}>
            <IconPrint className="h-4 w-4" /> Imprimer / PDF
          </button>
          <button className="ef-btn ef-btn-ghost" onClick={() => setPreview(null)}>
            <IconClose className="h-4 w-4" /> Fermer
          </button>
        </div>
      </div>
      <div className="print-modal-inner flex justify-center p-6">
        <div className="print-modal-doc shadow-xl">
          {preview.type === "reglement" ? (
            <ReglementDocument
              reservation={preview.res}
              client={data.clients.find((c) => c.id === preview.res.clientId)}
              salle={data.salles.find((s) => s.id === preview.res.salleId)}
            />
          ) : (
            <DocumentA4
              type={preview.type}
              reservation={preview.res}
              client={data.clients.find((c) => c.id === preview.res.clientId)}
              salle={data.salles.find((s) => s.id === preview.res.salleId)}
              payments={data.payments}
            />
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}