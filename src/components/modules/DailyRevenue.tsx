"use client";

import { useMemo, useState } from "react";
import type { ErpData } from "@/lib/store";
import { fmtMoney, fmtDate, todayISO, num } from "@/lib/format";
import { resFinance } from "@/lib/finance";
import { PageHeader } from "../ui";
import { IconSun, IconCash, IconCalendarPlus, IconTrend, IconDownload } from "../icons";
import { exportToExcel } from "@/lib/export";
import { exportTableToPdf } from "@/lib/pdf-export";

export default function DailyRevenue({ data }: { data: ErpData }) {
  const [day, setDay] = useState(todayISO());

  const paymentsOfDay = useMemo(
    () => data.payments.filter((p) => p.datePaiement === day),
    [data.payments, day],
  );

  const resOfDay = useMemo(
    () =>
      data.reservations.filter(
        (r) => r.statut !== "Annulée" && r.dateEvenement === day,
      ),
    [data.reservations, day],
  );

  const totalEncaisse = paymentsOfDay.reduce((s, p) => s + num(p.montant), 0);

  // Remaining balances of reservations whose event is happening today (context: money still owed for today's events)
  const soldeEvenements = resOfDay.reduce((s, r) => {
    const f = resFinance(r, data.payments);
    return s + Math.max(0, f.solde);
  }, 0);

  const byMode = useMemo(() => {
    const m = new Map<string, number>();
    paymentsOfDay.forEach((p) => m.set(p.mode, (m.get(p.mode) ?? 0) + num(p.montant)));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [paymentsOfDay]);

  // Last 7 days trend for the mini bar chart
  const trend = useMemo(() => {
    const days: { date: string; total: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(day);
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const total = data.payments
        .filter((p) => p.datePaiement === iso)
        .reduce((s, p) => s + num(p.montant), 0);
      days.push({ date: iso, total });
    }
    return days;
  }, [data.payments, day]);
  const maxTrend = Math.max(1, ...trend.map((d) => d.total));

  const clientName = (id: number) => {
    const c = data.clients.find((x) => x.id === id);
    return c ? `${c.nom} ${c.prenom ?? ""}`.trim() : "—";
  };
  const salleName = (id: number) => data.salles.find((s) => s.id === id)?.nom ?? "—";

  function paymentRows() {
    return paymentsOfDay.map((p) => ({
      p,
      r: data.reservations.find((x) => x.id === p.reservationId),
    }));
  }

  async function exportPdf() {
    await exportTableToPdf({
      filename: `recettes_du_jour_${day}`,
      title: "Recettes du jour",
      subtitle: fmtDate(day),
      columns: [
        { header: "Réservation", value: ({ r }: ReturnType<typeof paymentRows>[number]) => r?.reference ?? "—", width: 1 },
        { header: "Client", value: ({ r }) => (r ? clientName(r.clientId) : "—"), width: 1.6 },
        { header: "Mode", value: ({ p }) => p.mode, width: 1 },
        { header: "Enregistré par", value: ({ p }) => p.recordedByName || "—", width: 1.3 },
        { header: "Montant", value: ({ p }) => fmtMoney(p.montant), width: 1, align: "right" },
      ],
      rows: paymentRows(),
      totalsRow: ["Total", "", "", "", fmtMoney(totalEncaisse)],
    });
  }

  function exportExcel() {
    exportToExcel(
      `recettes_du_jour_${day}`,
      [
        { header: "Réservation", value: ({ r }: ReturnType<typeof paymentRows>[number]) => r?.reference ?? "—" },
        { header: "Client", value: ({ r }) => (r ? clientName(r.clientId) : "—") },
        { header: "Mode", value: ({ p }) => p.mode },
        { header: "Enregistré par", value: ({ p }) => p.recordedByName || "—" },
        { header: "Montant (DA)", value: ({ p }) => num(p.montant) },
      ],
      paymentRows(),
    );
  }

  return (
    <div className="ef-fade">
      <PageHeader
        title="Recettes du jour"
        subtitle="Suivi en temps réel de l'encaissement quotidien"
        action={
          <div className="flex flex-wrap items-center gap-2 no-print">
            <input
              type="date"
              className="ef-input w-auto"
              value={day}
              onChange={(e) => setDay(e.target.value)}
            />
            <button className="ef-btn ef-btn-ghost" onClick={exportPdf}>
              <IconDownload className="h-4 w-4" /> PDF
            </button>
            <button className="ef-btn ef-btn-ghost" onClick={exportExcel}>
              <IconDownload className="h-4 w-4" /> Excel
            </button>
          </div>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat icon={IconSun} label="Total encaissé aujourd'hui" value={fmtMoney(totalEncaisse)} tint="#f5a623" />
        <Stat icon={IconCash} label="Nombre de paiements" value={String(paymentsOfDay.length)} tint="#0d9488" />
        <Stat icon={IconCalendarPlus} label="Événements du jour" value={String(resOfDay.length)} tint="#2560c9" />
        <Stat icon={IconTrend} label="Soldes restants (événements du jour)" value={fmtMoney(soldeEvenements)} tint="#e74c3c" />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="ef-card p-5 lg:col-span-2">
          <h3 className="mb-4 font-bold text-slate-800">Paiements de la journée — {fmtDate(day)}</h3>
          {paymentsOfDay.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">Aucun paiement enregistré pour cette date.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-400">
                    <th className="py-2">Réservation</th>
                    <th>Client</th>
                    <th>Mode</th>
                    <th>Enregistré par</th>
                    <th className="text-right">Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentsOfDay.map((p) => {
                    const r = data.reservations.find((x) => x.id === p.reservationId);
                    return (
                      <tr key={p.id} className="border-b border-slate-50">
                        <td className="py-2 font-mono text-xs text-slate-500">{r?.reference ?? "—"}</td>
                        <td className="font-medium text-slate-700">{r ? clientName(r.clientId) : "—"}</td>
                        <td className="text-slate-500">{p.mode}</td>
                        <td className="text-slate-500">{p.recordedByName || "—"}</td>
                        <td className="text-right font-bold text-slate-800">{fmtMoney(p.montant)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-200 font-bold text-slate-800">
                    <td className="py-2" colSpan={4}>Total</td>
                    <td className="text-right">{fmtMoney(totalEncaisse)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        <div className="ef-card p-5">
          <h3 className="mb-4 font-bold text-slate-800">Répartition par mode de paiement</h3>
          {byMode.length === 0 ? (
            <p className="text-sm text-slate-400">Aucune donnée.</p>
          ) : (
            <div className="space-y-3">
              {byMode.map(([mode, total]) => (
                <div key={mode}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="text-slate-700">{mode}</span>
                    <span className="font-semibold text-slate-700">{fmtMoney(total)}</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-[#f5a623]"
                      style={{ width: `${(total / totalEncaisse) * 100 || 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <h3 className="mb-3 mt-6 font-bold text-slate-800">7 derniers jours</h3>
          <div className="flex items-end gap-2" style={{ height: 90 }}>
            {trend.map((d) => (
              <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t bg-[#f5a623]/80"
                  style={{ height: `${Math.max(4, (d.total / maxTrend) * 70)}px` }}
                  title={`${fmtDate(d.date)} : ${fmtMoney(d.total)}`}
                />
                <span className="text-[9px] text-slate-400">{d.date.slice(8, 10)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {resOfDay.length > 0 && (
        <div className="ef-card mt-5 p-5">
          <h3 className="mb-4 font-bold text-slate-800">Événements prévus aujourd&apos;hui</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-400">
                  <th className="py-2">Réf.</th>
                  <th>Client</th>
                  <th>Salle</th>
                  <th>Événement</th>
                  <th className="text-right">Total TTC</th>
                  <th className="text-right">Solde</th>
                </tr>
              </thead>
              <tbody>
                {resOfDay.map((r) => {
                  const f = resFinance(r, data.payments);
                  return (
                    <tr key={r.id} className="border-b border-slate-50">
                      <td className="py-2 font-mono text-xs text-slate-500">{r.reference}</td>
                      <td className="font-medium text-slate-700">{clientName(r.clientId)}</td>
                      <td className="text-slate-500">{salleName(r.salleId)}</td>
                      <td className="text-slate-500">{r.typeEvenement}</td>
                      <td className="text-right text-slate-600">{fmtMoney(f.totalTTC)}</td>
                      <td className="text-right font-bold text-red-600">{fmtMoney(f.solde)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  tint,
}: {
  icon: typeof IconSun;
  label: string;
  value: string;
  tint: string;
}) {
  return (
    <div className="ef-card p-4">
      <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: `${tint}1a`, color: tint }}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="text-base font-extrabold text-slate-800">{value}</div>
      <div className="mt-0.5 text-xs font-medium text-slate-500">{label}</div>
    </div>
  );
}
