"use client";

import { useMemo, useState } from "react";
import type { ErpData } from "@/lib/store";
import { fmtMoney, fmtDate, todayISO, num } from "@/lib/format";
import { resFinance } from "@/lib/finance";
import { exportToExcel, printHtmlDocument, buildPrintTable } from "@/lib/export";
import { exportTableToPdf } from "@/lib/pdf-export";
import { PageHeader } from "../ui";
import { IconPrint, IconDownload, IconHistory } from "../icons";

type Period = "jour" | "semaine" | "mois" | "annee" | "custom";

function rangeFor(p: Period, custom: { from: string; to: string }): { from: string; to: string; label: string } {
  const now = new Date();
  const toD = new Date(now);
  const fromD = new Date(now);
  if (p === "semaine") fromD.setDate(fromD.getDate() - 6);
  else if (p === "mois") fromD.setDate(1);
  else if (p === "annee") {
    fromD.setMonth(0);
    fromD.setDate(1);
  } else if (p === "custom") {
    return { from: custom.from || todayISO(), to: custom.to || todayISO(), label: "Période personnalisée" };
  }
  const labels: Record<Exclude<Period, "custom">, string> = {
    jour: "Journalier",
    semaine: "Hebdomadaire (7 j)",
    mois: "Mensuel",
    annee: "Annuel",
  };
  return {
    from: fromD.toISOString().slice(0, 10),
    to: toD.toISOString().slice(0, 10),
    label: labels[p as Exclude<Period, "custom">] ?? "",
  };
}

export default function RevenueHistory({ data }: { data: ErpData }) {
  const [period, setPeriod] = useState<Period>("mois");
  const [custom, setCustom] = useState({ from: todayISO(), to: todayISO() });
  const { from, to, label } = rangeFor(period, custom);

  const paymentsInRange = useMemo(
    () => data.payments.filter((p) => p.datePaiement >= from && p.datePaiement <= to),
    [data.payments, from, to],
  );

  const reservationsInRange = useMemo(
    () =>
      data.reservations.filter(
        (r) => r.statut !== "Annulée" && r.dateEvenement >= from && r.dateEvenement <= to,
      ),
    [data.reservations, from, to],
  );

  const totalEncaisse = paymentsInRange.reduce((s, p) => s + num(p.montant), 0);

  const soldeRestant = reservationsInRange.reduce((s, r) => {
    const f = resFinance(r, data.payments);
    return s + Math.max(0, f.solde);
  }, 0);

  const totalContrats = reservationsInRange.reduce((s, r) => {
    const f = resFinance(r, data.payments);
    return s + f.totalTTC;
  }, 0);

  // Group payments by day within the range for the table/chart
  const byDay = useMemo(() => {
    const m = new Map<string, { total: number; count: number }>();
    paymentsInRange.forEach((p) => {
      const e = m.get(p.datePaiement) ?? { total: 0, count: 0 };
      e.total += num(p.montant);
      e.count += 1;
      m.set(p.datePaiement, e);
    });
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [paymentsInRange]);
  const maxDay = Math.max(1, ...byDay.map(([, v]) => v.total));

  function doExportExcel() {
    exportToExcel(
      `historique_recettes_${from}_${to}`,
      [
        { header: "Date", value: ([date]: (typeof byDay)[number]) => fmtDate(date) },
        { header: "Nombre de paiements", value: ([, v]) => v.count },
        { header: "Montant encaissé (DA)", value: ([, v]) => v.total.toFixed(2) },
      ],
      byDay,
    );
  }

  async function doExportPdf() {
    await exportTableToPdf({
      filename: `historique_recettes_${from}_${to}`,
      title: "Historique des recettes",
      subtitle: `${label} — du ${fmtDate(from)} au ${fmtDate(to)}`,
      columns: [
        { header: "Date", value: ([date]: (typeof byDay)[number]) => fmtDate(date), width: 1.4 },
        { header: "Nombre de paiements", value: ([, v]) => String(v.count), width: 1, align: "center" },
        { header: "Montant encaissé", value: ([, v]) => fmtMoney(v.total), width: 1.4, align: "right" },
      ],
      rows: byDay,
      totalsRow: ["Total", String(paymentsInRange.length), fmtMoney(totalEncaisse)],
    });
  }

  function doPrint() {
    const html =
      `<p><strong>Période :</strong> ${fmtDate(from)} → ${fmtDate(to)}</p>` +
      buildPrintTable(
        [
          { header: "Date", value: ([date]: (typeof byDay)[number]) => fmtDate(date) },
          { header: "Nombre de paiements", value: ([, v]) => v.count },
          { header: "Montant encaissé", value: ([, v]) => fmtMoney(v.total) },
        ],
        byDay,
        { totalsRow: ["Total", String(paymentsInRange.length), fmtMoney(totalEncaisse)] },
      );
    printHtmlDocument(`Historique des recettes — ${label}`, html);
  }

  return (
    <div className="ef-fade">
      <PageHeader
        title="Historique des recettes"
        subtitle={`Rapport ${label.toLowerCase()} — du ${fmtDate(from)} au ${fmtDate(to)}`}
        action={
          <div className="flex flex-wrap gap-2 no-print">
            <button className="ef-btn ef-btn-ghost" onClick={doPrint}>
              <IconPrint className="h-4 w-4" /> Imprimer
            </button>
            <button className="ef-btn ef-btn-ghost" onClick={doExportPdf}>
              <IconDownload className="h-4 w-4" /> Exporter PDF
            </button>
            <button className="ef-btn ef-btn-ghost" onClick={doExportExcel}>
              <IconDownload className="h-4 w-4" /> Exporter Excel
            </button>
          </div>
        }
      />

      <div className="no-print mb-5 flex flex-wrap items-center gap-2">
        {(["jour", "semaine", "mois", "annee"] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`ef-btn ${period === p ? "ef-btn-primary" : "ef-btn-ghost"}`}
          >
            {rangeFor(p, custom).label}
          </button>
        ))}
        <button
          onClick={() => setPeriod("custom")}
          className={`ef-btn ${period === "custom" ? "ef-btn-primary" : "ef-btn-ghost"}`}
        >
          <IconHistory className="h-4 w-4" /> Période personnalisée
        </button>
        {period === "custom" && (
          <>
            <input
              type="date"
              className="ef-input w-auto"
              value={custom.from}
              onChange={(e) => setCustom({ ...custom, from: e.target.value })}
            />
            <span className="text-sm text-slate-400">→</span>
            <input
              type="date"
              className="ef-input w-auto"
              value={custom.to}
              onChange={(e) => setCustom({ ...custom, to: e.target.value })}
            />
          </>
        )}
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Réservations" value={String(reservationsInRange.length)} tint="#f5a623" />
        <Stat label="Nombre de paiements" value={String(paymentsInRange.length)} tint="#2560c9" small />
        <Stat label="Montant encaissé" value={fmtMoney(totalEncaisse)} tint="#0d9488" small />
        <Stat label="Total contrats" value={fmtMoney(totalContrats)} tint="#7c3aed" small />
        <Stat label="Soldes restants" value={fmtMoney(soldeRestant)} tint="#e74c3c" small />
      </div>

      <div className="ef-card p-5">
        <h3 className="mb-4 font-bold text-slate-800">Encaissement par jour</h3>
        {byDay.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">Aucun paiement sur cette période.</p>
        ) : (
          <>
            <div className="mb-6 flex items-end gap-1 overflow-x-auto" style={{ height: 110 }}>
              {byDay.map(([date, v]) => (
                <div key={date} className="flex min-w-[22px] flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t bg-[#f5a623]/80"
                    style={{ height: `${Math.max(4, (v.total / maxDay) * 90)}px` }}
                    title={`${fmtDate(date)} : ${fmtMoney(v.total)}`}
                  />
                  <span className="text-[9px] text-slate-400">{date.slice(8, 10)}</span>
                </div>
              ))}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-400">
                    <th className="py-2">Date</th>
                    <th className="text-center">Paiements</th>
                    <th className="text-right">Montant encaissé</th>
                  </tr>
                </thead>
                <tbody>
                  {byDay.map(([date, v]) => (
                    <tr key={date} className="border-b border-slate-50">
                      <td className="py-2 text-slate-600">{fmtDate(date)}</td>
                      <td className="text-center text-slate-600">{v.count}</td>
                      <td className="text-right font-bold text-slate-800">{fmtMoney(v.total)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-200 font-bold text-slate-800">
                    <td className="py-2">Total</td>
                    <td className="text-center">{paymentsInRange.length}</td>
                    <td className="text-right">{fmtMoney(totalEncaisse)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, tint, small }: { label: string; value: string; tint: string; small?: boolean }) {
  return (
    <div className="ef-card p-4">
      <div className={`font-extrabold text-slate-800 ${small ? "text-base" : "text-2xl"}`} style={{ color: tint }}>
        {value}
      </div>
      <div className="mt-0.5 text-xs font-medium text-slate-500">{label}</div>
    </div>
  );
}
