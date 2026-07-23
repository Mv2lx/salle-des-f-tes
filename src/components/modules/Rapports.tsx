"use client";

import { useMemo, useState } from "react";
import type { ErpData } from "@/lib/store";
import { fmtMoney, num } from "@/lib/format";
import { resFinance } from "@/lib/finance";
import { PageHeader } from "../ui";
import { IconPrint, IconTrend, IconDownload } from "../icons";
import { exportToExcel } from "@/lib/export";
import { exportTableToPdf } from "@/lib/pdf-export";

type Period = "jour" | "semaine" | "mois" | "annee";

function rangeFor(p: Period): { from: Date; to: Date; label: string } {
  const now = new Date();
  const to = new Date(now);
  to.setHours(23, 59, 59, 999);
  const from = new Date(now);
  from.setHours(0, 0, 0, 0);
  if (p === "semaine") from.setDate(from.getDate() - 6);
  else if (p === "mois") from.setDate(1);
  else if (p === "annee") { from.setMonth(0); from.setDate(1); }
  const labels: Record<Period, string> = {
    jour: "Journalier",
    semaine: "Hebdomadaire (7 j)",
    mois: "Mensuel",
    annee: "Annuel",
  };
  return { from, to, label: labels[p] };
}

export default function Rapports({ data }: { data: ErpData }) {
  const [period, setPeriod] = useState<Period>("mois");
  const { from, to, label } = rangeFor(period);

  const inRange = (dateStr: string) => {
    const d = new Date(dateStr);
    return d >= from && d <= to;
  };

  const report = useMemo(() => {
    const active = data.reservations.filter((r) => r.statut !== "Annulée" && inRange(r.dateEvenement));
    let ca = 0, tva = 0, paye = 0, solde = 0;
    const bySalle = new Map<number, number>();
    const prestCount = new Map<string, { qte: number; total: number }>();
    active.forEach((r) => {
      const f = resFinance(r, data.payments);
      ca += f.totalTTC;
      tva += f.tva;
      paye += f.paye;
      solde += Math.max(0, f.solde);
      bySalle.set(r.salleId, (bySalle.get(r.salleId) ?? 0) + f.totalTTC);
      (r.items ?? []).forEach((it) => {
        const e = prestCount.get(it.nom) ?? { qte: 0, total: 0 };
        e.qte += num(it.qte);
        e.total += num(it.prix) * num(it.qte);
        prestCount.set(it.nom, e);
      });
    });
    const depenses = data.expenses.filter((e) => inRange(e.dateDepense)).reduce((s, e) => s + num(e.montant), 0);

    // loyal clients (all-time count within active reservations of period? use all-time)
    const clientCount = new Map<number, { count: number; total: number }>();
    data.reservations.filter((r) => r.statut !== "Annulée").forEach((r) => {
      const f = resFinance(r, data.payments);
      const e = clientCount.get(r.clientId) ?? { count: 0, total: 0 };
      e.count += 1;
      e.total += f.totalTTC;
      clientCount.set(r.clientId, e);
    });

    const topPrest = [...prestCount.entries()].sort((a, b) => b[1].total - a[1].total).slice(0, 6);
    const topClients = [...clientCount.entries()].sort((a, b) => b[1].total - a[1].total).slice(0, 5);

    return {
      count: active.length,
      ca, tva, paye, solde, depenses,
      benefice: ca - depenses,
      bySalle,
      topPrest,
      topClients,
    };
  }, [period, data]);

  const clientName = (id: number) => {
    const c = data.clients.find((x) => x.id === id);
    return c ? `${c.nom} ${c.prenom ?? ""}`.trim() : "—";
  };
  const salleName = (id: number) => data.salles.find((s) => s.id === id)?.nom ?? "—";

  const maxSalle = Math.max(1, ...[...report.bySalle.values()]);
  const maxPrest = Math.max(1, ...report.topPrest.map(([, v]) => v.total));

  const salleRows = () =>
    data.salles.map((s) => ({ nom: s.nom, total: report.bySalle.get(s.id) ?? 0 }));
  const clientRows = () =>
    report.topClients.map(([id, v]) => ({ nom: clientName(id), count: v.count, total: v.total }));

  async function exportSallesPdf() {
    await exportTableToPdf({
      filename: `rapport_par_salle_${period}`,
      title: "Rapport — Chiffre d'affaires par salle",
      subtitle: `Période : ${label}`,
      columns: [
        { header: "Salle", value: (r: ReturnType<typeof salleRows>[number]) => r.nom, width: 2 },
        { header: "Chiffre d'affaires", value: (r) => fmtMoney(r.total), width: 1, align: "right" },
      ],
      rows: salleRows(),
      totalsRow: ["Total", fmtMoney([...report.bySalle.values()].reduce((s, v) => s + v, 0))],
    });
  }

  function exportSallesExcel() {
    exportToExcel(
      `rapport_par_salle_${period}`,
      [
        { header: "Salle", value: (r: ReturnType<typeof salleRows>[number]) => r.nom },
        { header: "Chiffre d'affaires (DA)", value: (r) => r.total.toFixed(2) },
      ],
      salleRows(),
    );
  }

  async function exportClientsPdf() {
    await exportTableToPdf({
      filename: `rapport_clients_fideles`,
      title: "Rapport — Clients fidèles",
      subtitle: "Toutes périodes confondues",
      columns: [
        { header: "Client", value: (r: ReturnType<typeof clientRows>[number]) => r.nom, width: 2 },
        { header: "Réservations", value: (r) => String(r.count), width: 1, align: "center" },
        { header: "CA total", value: (r) => fmtMoney(r.total), width: 1, align: "right" },
      ],
      rows: clientRows(),
    });
  }

  function exportClientsExcel() {
    exportToExcel(
      `rapport_clients_fideles`,
      [
        { header: "Client", value: (r: ReturnType<typeof clientRows>[number]) => r.nom },
        { header: "Réservations", value: (r) => r.count },
        { header: "CA total (DA)", value: (r) => r.total.toFixed(2) },
      ],
      clientRows(),
    );
  }

  return (
    <div className="ef-fade">
      <PageHeader
        title="Rapports & Statistiques"
        subtitle={`Rapport ${label.toLowerCase()}`}
        action={
          <button className="ef-btn ef-btn-ghost no-print" onClick={() => window.print()}>
            <IconPrint className="h-4 w-4" /> Imprimer
          </button>
        }
      />

      <div className="no-print mb-5 flex gap-2">
        {(["jour", "semaine", "mois", "annee"] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`ef-btn ${period === p ? "ef-btn-primary" : "ef-btn-ghost"}`}
          >
            {rangeFor(p).label}
          </button>
        ))}
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Réservations" value={String(report.count)} tint="#f5a623" />
        <Stat label="Chiffre d'affaires" value={fmtMoney(report.ca)} tint="#7c3aed" small />
        <Stat label="TVA collectée" value={fmtMoney(report.tva)} tint="#2560c9" small />
        <Stat label="Encaissé" value={fmtMoney(report.paye)} tint="#0d9488" small />
        <Stat label="Soldes à encaisser" value={fmtMoney(report.solde)} tint="#e74c3c" small />
        <Stat label="Dépenses" value={fmtMoney(report.depenses)} tint="#b45309" small />
        <Stat label="Bénéfice net" value={fmtMoney(report.benefice)} tint="#16a34a" small />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="ef-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-bold text-slate-800">
              <IconTrend className="h-5 w-5 text-[#f5a623]" /> CA par salle
            </h3>
            <div className="no-print flex gap-1">
              <button className="ef-btn ef-btn-ghost !px-2 !py-1 text-xs" onClick={exportSallesPdf} title="Exporter PDF">
                <IconDownload className="h-3.5 w-3.5" /> PDF
              </button>
              <button className="ef-btn ef-btn-ghost !px-2 !py-1 text-xs" onClick={exportSallesExcel} title="Exporter Excel">
                <IconDownload className="h-3.5 w-3.5" /> Excel
              </button>
            </div>
          </div>
          <div className="space-y-4">
            {data.salles.map((s) => {
              const v = report.bySalle.get(s.id) ?? 0;
              return (
                <div key={s.id}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-medium text-slate-700">{s.nom}</span>
                    <span className="font-bold text-slate-800">{fmtMoney(v)}</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full" style={{ width: `${(v / maxSalle) * 100}%`, background: s.couleur ?? "#f5a623" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="ef-card p-5">
          <h3 className="mb-4 font-bold text-slate-800">Prestations les plus vendues</h3>
          {report.topPrest.length === 0 ? (
            <p className="text-sm text-slate-400">Aucune donnée sur la période.</p>
          ) : (
            <div className="space-y-3">
              {report.topPrest.map(([nom, v]) => (
                <div key={nom}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="text-slate-700">{nom} <span className="text-xs text-slate-400">×{v.qte}</span></span>
                    <span className="font-semibold text-slate-700">{fmtMoney(v.total)}</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-[#f5a623]" style={{ width: `${(v.total / maxPrest) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="ef-card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-bold text-slate-800">Clients fidèles (toutes périodes)</h3>
            <div className="no-print flex gap-1">
              <button className="ef-btn ef-btn-ghost !px-2 !py-1 text-xs" onClick={exportClientsPdf} title="Exporter PDF">
                <IconDownload className="h-3.5 w-3.5" /> PDF
              </button>
              <button className="ef-btn ef-btn-ghost !px-2 !py-1 text-xs" onClick={exportClientsExcel} title="Exporter Excel">
                <IconDownload className="h-3.5 w-3.5" /> Excel
              </button>
            </div>
          </div>
          {report.topClients.length === 0 ? (
            <p className="text-sm text-slate-400">Aucune donnée.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase text-slate-400">
                  <th className="py-2">#</th>
                  <th>Client</th>
                  <th className="text-center">Réservations</th>
                  <th className="text-right">CA total</th>
                </tr>
              </thead>
              <tbody>
                {report.topClients.map(([id, v], i) => (
                  <tr key={id} className="border-b border-slate-50">
                    <td className="py-2 font-bold text-[#e08600]">{i + 1}</td>
                    <td className="font-medium text-slate-700">{clientName(id)}</td>
                    <td className="text-center text-slate-600">{v.count}</td>
                    <td className="text-right font-bold text-slate-800">{fmtMoney(v.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      <p className="mt-4 text-xs text-slate-400">Réf. salles : {[...report.bySalle.keys()].map(salleName).join(", ")}</p>
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
