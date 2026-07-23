"use client";

import type { ErpData } from "@/lib/store";
import { fmtMoney, fmtDate, fmtTime, num } from "@/lib/format";
import { resFinance } from "@/lib/finance";
import { statutColor } from "@/lib/compute";
import {
  IconCalendarPlus,
  IconCash,
  IconTrend,
  IconAlert,
  IconHall,
  IconCheck,
  IconUsers,
} from "../icons";
import { useLocale } from "@/lib/i18n";

function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}

export default function Dashboard({
  data,
  go,
}: {
  data: ErpData;
  go: (tab: string) => void;
}) {
  const { reservations, payments, salles, clients, expenses } = data;
  const { t } = useLocale();
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const weekStart = startOfWeek(today);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const monthStr = todayStr.slice(0, 7);

  const active = reservations.filter((r) => r.statut !== "Annulée");
  const resToday = active.filter((r) => r.dateEvenement === todayStr);
  const resWeek = active.filter((r) => {
    const d = new Date(r.dateEvenement);
    return d >= weekStart && d <= weekEnd;
  });
  const resMonth = active.filter((r) => r.dateEvenement.startsWith(monthStr));
  const resUpcoming = active.filter((r) => r.dateEvenement >= todayStr);
  const resTerminees = reservations.filter((r) => r.statut === "Terminée");
  const resConfirmees = reservations.filter((r) => r.statut === "Confirmée");
  const resAnnulees = reservations.filter((r) => r.statut === "Annulée");

  let ca = 0;
  let encaisse = 0;
  let solde = 0;
  const caParSalle = new Map<number, number>();
  active.forEach((r) => {
    const f = resFinance(r, payments);
    ca += f.totalTTC;
    encaisse += f.paye;
    solde += Math.max(0, f.solde);
    caParSalle.set(r.salleId, (caParSalle.get(r.salleId) ?? 0) + f.totalTTC);
  });
  const bestSalleEntry = [...caParSalle.entries()].sort((a, b) => b[1] - a[1])[0];
  const bestSalle = bestSalleEntry ? salles.find((s) => s.id === bestSalleEntry[0]) : undefined;

  const depensesMois = expenses
    .filter((e) => e.dateDepense.startsWith(monthStr))
    .reduce((s, e) => s + num(e.montant), 0);

  // occupation (30 jours à venir)
  const horizon = 30;
  const occ = salles.map((s) => {
    const days = active.filter((r) => {
      const d = new Date(r.dateEvenement);
      const diff = (d.getTime() - today.getTime()) / 86400000;
      return r.salleId === s.id && diff >= -1 && diff <= horizon;
    }).length;
    return { salle: s, days, taux: Math.min(100, Math.round((days / horizon) * 100)) };
  });

  const upcoming = active
    .filter((r) => new Date(r.dateEvenement) >= new Date(todayStr))
    .sort((a, b) => a.dateEvenement.localeCompare(b.dateEvenement))
    .slice(0, 6);

  // alertes soldes
  const alertesSolde = active
    .map((r) => ({ r, f: resFinance(r, payments) }))
    .filter((x) => x.f.solde > 0.5 && new Date(x.r.dateEvenement) >= new Date(todayStr))
    .sort((a, b) => a.r.dateEvenement.localeCompare(b.r.dateEvenement))
    .slice(0, 5);

  // conflits
  const conflicts: string[] = [];
  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const a = active[i];
      const b = active[j];
      if (
        a.salleId === b.salleId &&
        a.dateEvenement === b.dateEvenement &&
        (a.heureDebut ?? "") < (b.heureFin ?? "") &&
        (b.heureDebut ?? "") < (a.heureFin ?? "")
      ) {
        conflicts.push(`${a.reference} ↔ ${b.reference}`);
      }
    }
  }

  const clientName = (id: number) => {
    const c = clients.find((x) => x.id === id);
    return c ? `${c.nom} ${c.prenom ?? ""}`.trim() : "—";
  };
  const salleName = (id: number) => salles.find((s) => s.id === id)?.nom ?? "—";

  const stats = [
    { label: t("dashboard.resToday"), value: resToday.length, icon: IconCalendarPlus, tint: "#f5a623", tab: "reservations" },
    { label: t("dashboard.resWeek"), value: resWeek.length, icon: IconCalendarPlus, tint: "#2560c9", tab: "calendrier" },
    { label: t("dashboard.resMonth"), value: resMonth.length, icon: IconCalendarPlus, tint: "#22a35a", tab: "reservations" },
    { label: t("dashboard.revenue"), value: fmtMoney(ca), icon: IconTrend, tint: "#7c3aed", tab: "rapports", small: true },
    { label: t("dashboard.collected"), value: fmtMoney(encaisse), icon: IconCash, tint: "#0d9488", tab: "paiements", small: true },
    { label: t("dashboard.remaining"), value: fmtMoney(solde), icon: IconCash, tint: "#e74c3c", tab: "paiements", small: true },
  ];

  const stats2 = [
    { label: t("dashboard.totalRes"), value: reservations.length, icon: IconCalendarPlus, tint: "#4a5162", tab: "reservations" },
    { label: t("dashboard.upcomingRes"), value: resUpcoming.length, icon: IconCalendarPlus, tint: "#2560c9", tab: "reservations" },
    { label: t("dashboard.confirmedRes"), value: resConfirmees.length, icon: IconCheck, tint: "#22a35a", tab: "reservations" },
    { label: t("dashboard.finishedRes"), value: resTerminees.length, icon: IconCheck, tint: "#3b82f6", tab: "reservations" },
    { label: t("dashboard.cancelledRes"), value: resAnnulees.length, icon: IconAlert, tint: "#e74c3c", tab: "reservations" },
    { label: t("dashboard.clientCount"), value: clients.length, icon: IconUsers, tint: "#7c3aed", tab: "clients" },
    {
      label: t("dashboard.bestSalle"),
      value: bestSalle ? bestSalle.nom : "—",
      icon: IconHall,
      tint: "#f5a623",
      tab: "salles",
      small: true,
    },
  ];

  return (
    <div className="ef-fade space-y-6">
      <div>
        <h1 className="text-xl font-extrabold tracking-tight text-slate-800">
          {t("dashboard.title")}
        </h1>
        <p className="text-sm text-slate-500">
          {t("dashboard.subtitle", { date: fmtDate(today) })}
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {stats.map((s) => {
          const Ic = s.icon;
          return (
            <button
              key={s.label}
              onClick={() => go(s.tab)}
              className="ef-card group p-4 text-left transition hover:-translate-y-0.5"
            >
              <div
                className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg"
                style={{ background: `${s.tint}1a`, color: s.tint }}
              >
                <Ic className="h-5 w-5" />
              </div>
              <div className={`font-extrabold text-slate-800 ${s.small ? "text-base" : "text-2xl"}`}>
                {s.value}
              </div>
              <div className="mt-0.5 text-xs font-medium text-slate-500">{s.label}</div>
            </button>
          );
        })}
      </div>

      {/* Additional overview cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        {stats2.map((s) => {
          const Ic = s.icon;
          return (
            <button
              key={s.label}
              onClick={() => go(s.tab)}
              className="ef-card group p-3.5 text-left transition hover:-translate-y-0.5"
            >
              <div
                className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg"
                style={{ background: `${s.tint}1a`, color: s.tint }}
              >
                <Ic className="h-4 w-4" />
              </div>
              <div className={`font-extrabold text-slate-800 ${s.small ? "text-sm" : "text-xl"}`}>
                {s.value}
              </div>
              <div className="mt-0.5 text-[11px] font-medium text-slate-500">{s.label}</div>
            </button>
          );
        })}
      </div>

      {/* Alerts */}
      {conflicts.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <IconAlert className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-bold">Conflits de réservation détectés</p>
            <p>{conflicts.join(" · ")}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Occupation */}
        <div className="ef-card p-5 lg:col-span-1">
          <div className="mb-4 flex items-center gap-2">
            <IconHall className="h-5 w-5 text-[#f5a623]" />
            <h2 className="font-bold text-slate-800">{t("dashboard.occupancy")}</h2>
          </div>
          <div className="space-y-4">
            {occ.map((o) => (
              <div key={o.salle.id}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">{o.salle.nom}</span>
                  <span className="font-bold" style={{ color: o.salle.couleur ?? "#f5a623" }}>
                    {o.taux}%
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${o.taux}%`, background: o.salle.couleur ?? "#f5a623" }}
                  />
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  {o.days} événement(s) programmé(s)
                </p>
              </div>
            ))}
            <div className="mt-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
              Dépenses du mois :{" "}
              <span className="font-bold text-slate-700">{fmtMoney(depensesMois)}</span>
            </div>
          </div>
        </div>

        {/* Upcoming events */}
        <div className="ef-card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold text-slate-800">Événements à venir</h2>
            <button onClick={() => go("reservations")} className="text-xs font-semibold text-[#e08600] hover:underline">
              Voir tout →
            </button>
          </div>
          {upcoming.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">Aucun événement à venir.</p>
          ) : (
            <div className="space-y-2">
              {upcoming.map((r) => {
                const c = statutColor(r.statut);
                return (
                  <div
                    key={r.id}
                    className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 hover:bg-slate-50"
                  >
                    <div className="flex h-11 w-11 flex-col items-center justify-center rounded-lg bg-[#fff4e0] text-[#b56a00]">
                      <span className="text-sm font-extrabold leading-none">
                        {new Date(r.dateEvenement).getDate()}
                      </span>
                      <span className="text-[10px] font-semibold uppercase">
                        {new Date(r.dateEvenement).toLocaleDateString("fr-FR", { month: "short" })}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-800">
                        {r.typeEvenement} — {clientName(r.clientId)}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {salleName(r.salleId)} · {fmtTime(r.heureDebut)}–{fmtTime(r.heureFin)} · {r.invites} invités
                      </p>
                    </div>
                    <span
                      className="ef-badge"
                      style={{ background: c.bg, color: c.fg }}
                    >
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: c.dot }} />
                      {r.statut}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Payment alerts */}
      <div className="ef-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <IconCash className="h-5 w-5 text-red-500" />
          <h2 className="font-bold text-slate-800">Alertes de paiement — soldes à encaisser</h2>
        </div>
        {alertesSolde.length === 0 ? (
          <p className="flex items-center gap-2 py-3 text-sm text-emerald-600">
            <IconCheck className="h-4 w-4" /> Aucun solde en attente. Tout est à jour.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-400">
                  <th className="py-2">Réf.</th>
                  <th>Client</th>
                  <th>Événement</th>
                  <th className="text-right">Total TTC</th>
                  <th className="text-right">Payé</th>
                  <th className="text-right">Solde</th>
                </tr>
              </thead>
              <tbody>
                {alertesSolde.map(({ r, f }) => (
                  <tr key={r.id} className="border-b border-slate-50">
                    <td className="py-2 font-mono text-xs text-slate-500">{r.reference}</td>
                    <td className="font-medium text-slate-700">{clientName(r.clientId)}</td>
                    <td className="text-slate-500">{fmtDate(r.dateEvenement)}</td>
                    <td className="text-right text-slate-600">{fmtMoney(f.totalTTC)}</td>
                    <td className="text-right text-emerald-600">{fmtMoney(f.paye)}</td>
                    <td className="text-right font-bold text-red-600">{fmtMoney(f.solde)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
