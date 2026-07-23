"use client";

import { useMemo, useState } from "react";
import type { ErpData } from "@/lib/store";
import { statutColor } from "@/lib/compute";
import { fmtDate, fmtTime } from "@/lib/format";
import { PageHeader } from "../ui";
import { IconAlert } from "../icons";

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

export default function Calendrier({ data }: { data: ErpData }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selected, setSelected] = useState<string | null>(null);

  const clientName = (id: number) => {
    const c = data.clients.find((x) => x.id === id);
    return c ? `${c.nom} ${c.prenom ?? ""}`.trim() : "—";
  };
  const salleName = (id: number) => data.salles.find((s) => s.id === id)?.nom ?? "—";

  const resByDate = useMemo(() => {
    const map = new Map<string, typeof data.reservations>();
    for (const r of data.reservations) {
      const key = r.dateEvenement.slice(0, 10);
      const arr = map.get(key) ?? [];
      arr.push(r);
      map.set(key, arr);
    }
    return map;
  }, [data.reservations]);

  // conflicts set of dates
  const conflictDates = useMemo(() => {
    const set = new Set<string>();
    resByDate.forEach((list, date) => {
      const active = list.filter((r) => r.statut !== "Annulée");
      for (let i = 0; i < active.length; i++)
        for (let j = i + 1; j < active.length; j++)
          if (
            active[i].salleId === active[j].salleId &&
            (active[i].heureDebut ?? "") < (active[j].heureFin ?? "") &&
            (active[j].heureDebut ?? "") < (active[i].heureFin ?? "")
          )
            set.add(date);
    });
    return set;
  }, [resByDate]);

  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const prev = () => {
    if (month === 0) { setMonth(11); setYear(year - 1); } else setMonth(month - 1);
  };
  const next = () => {
    if (month === 11) { setMonth(0); setYear(year + 1); } else setMonth(month + 1);
  };

  const key = (d: number) => `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const todayKey = new Date().toISOString().slice(0, 10);

  const selList = selected ? (resByDate.get(selected) ?? []) : [];

  return (
    <div className="ef-fade">
      <PageHeader title="Calendrier" subtitle="Planning des deux salles avec détection des conflits" />

      <div className="mb-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <button className="ef-btn ef-btn-ghost" onClick={prev}>←</button>
          <div className="w-44 text-center text-lg font-bold text-slate-800">
            {MONTHS[month]} {year}
          </div>
          <button className="ef-btn ef-btn-ghost" onClick={next}>→</button>
          <button className="ef-btn ef-btn-ghost" onClick={() => { setMonth(now.getMonth()); setYear(now.getFullYear()); }}>
            Aujourd'hui
          </button>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-3 text-xs text-slate-500">
          <Legend color="#22a35a" label="Disponible / Confirmée" />
          <Legend color="#f5a623" label="Option" />
          <Legend color="#e74c3c" label="Annulée" />
          <Legend color="#3b82f6" label="Terminée" />
        </div>
      </div>

      <div className="ef-card overflow-hidden p-3">
        <div className="grid grid-cols-7 gap-1.5">
          {WEEKDAYS.map((w) => (
            <div key={w} className="py-1 text-center text-xs font-bold uppercase text-slate-400">{w}</div>
          ))}
          {cells.map((d, i) => {
            if (d === null) return <div key={i} />;
            const k = key(d);
            const list = (resByDate.get(k) ?? []).filter((r) => r.statut !== "Annulée");
            const hasConflict = conflictDates.has(k);
            const isToday = k === todayKey;
            return (
              <button
                key={i}
                onClick={() => setSelected(k)}
                className={`min-h-[84px] rounded-lg border p-1.5 text-left transition hover:border-[#f5a623] ${
                  isToday ? "border-[#f5a623] bg-[#fff9ef]" : "border-slate-100 bg-white"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold ${isToday ? "text-[#e08600]" : "text-slate-500"}`}>{d}</span>
                  {hasConflict && <IconAlert className="h-3.5 w-3.5 text-red-500" />}
                </div>
                <div className="mt-1 space-y-0.5">
                  {list.slice(0, 3).map((r) => {
                    const c = statutColor(r.statut);
                    return (
                      <div key={r.id} className="truncate rounded px-1 py-0.5 text-[10px] font-semibold" style={{ background: c.bg, color: c.fg }}>
                        {salleName(r.salleId).replace(/^Salle \d+ — /, "")} · {r.typeEvenement}
                      </div>
                    );
                  })}
                  {list.length > 3 && <div className="text-[10px] text-slate-400">+{list.length - 3}…</div>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selected && (
        <div className="ef-card mt-4 p-4">
          <h3 className="mb-3 font-bold text-slate-800">Événements du {fmtDate(selected)}</h3>
          {selList.length === 0 ? (
            <p className="text-sm text-slate-400">Aucun événement. Journée disponible.</p>
          ) : (
            <div className="space-y-2">
              {selList.map((r) => {
                const c = statutColor(r.statut);
                return (
                  <div key={r.id} className="flex items-center gap-3 rounded-lg border border-slate-100 p-3 text-sm">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.dot }} />
                    <div className="flex-1">
                      <p className="font-semibold text-slate-700">{r.typeEvenement} — {clientName(r.clientId)}</p>
                      <p className="text-xs text-slate-500">{salleName(r.salleId)} · {fmtTime(r.heureDebut)}–{fmtTime(r.heureFin)} · {r.invites} invités</p>
                    </div>
                    <span className="ef-badge" style={{ background: c.bg, color: c.fg }}>{r.statut}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} /> {label}
    </span>
  );
}
