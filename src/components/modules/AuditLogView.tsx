"use client";

import { useEffect, useState } from "react";
import type { AuditLogEntry } from "@/db/schema";
import { PageHeader, EmptyState } from "../ui";
import { IconLog, IconSearch } from "../icons";

const ACTION_LABELS: Record<string, { label: string; tint: string }> = {
  create: { label: "Création", tint: "#22a35a" },
  update: { label: "Modification", tint: "#2560c9" },
  delete: { label: "Suppression", tint: "#e74c3c" },
};

const MODULE_LABELS: Record<string, string> = {
  reservations: "Réservations",
  paiements: "Paiements",
  clients: "Clients",
  depenses: "Dépenses",
  salles: "Salles",
  prestations: "Prestations",
  "company-settings": "Paramètres de l'entreprise",
  users: "Utilisateurs",
};

export default function AuditLogView() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [moduleFilter, setModuleFilter] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/audit", { cache: "no-store" });
        if (r.ok) setEntries(await r.json());
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const modules = [...new Set(entries.map((e) => e.module))];
  const filtered = entries.filter((e) => {
    if (moduleFilter && e.module !== moduleFilter) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [e.userName, e.entityLabel, e.details, e.module]
      .join(" ")
      .toLowerCase()
      .includes(q);
  });

  return (
    <div className="ef-fade">
      <PageHeader
        title="Journal d'activité"
        subtitle="Historique des créations, modifications et suppressions (accès administrateur)"
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
          <IconSearch className="h-4 w-4 text-slate-400" />
          <input
            className="w-full text-sm outline-none"
            placeholder="Utilisateur, élément, détails…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select className="ef-input w-auto" value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)}>
          <option value="">Tous les modules</option>
          {modules.map((m) => (
            <option key={m} value={m}>
              {MODULE_LABELS[m] ?? m}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center text-slate-400">Chargement…</div>
      ) : filtered.length === 0 ? (
        <EmptyState text="Aucune activité enregistrée." />
      ) : (
        <div className="ef-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-xs uppercase text-slate-400">
                  <th className="px-4 py-3">Date &amp; heure</th>
                  <th>Utilisateur</th>
                  <th>Action</th>
                  <th>Module</th>
                  <th>Élément</th>
                  <th>Détails</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => {
                  const action = ACTION_LABELS[e.action] ?? { label: e.action, tint: "#94a3b8" };
                  return (
                    <tr key={e.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                      <td className="px-4 py-3 text-slate-500">
                        {new Date(e.createdAt).toLocaleString("fr-FR")}
                      </td>
                      <td className="flex items-center gap-2 font-medium text-slate-700">
                        <IconLog className="h-3.5 w-3.5 text-slate-300" /> {e.userName || "—"}
                      </td>
                      <td>
                        <span className="ef-badge" style={{ background: `${action.tint}1a`, color: action.tint }}>
                          {action.label}
                        </span>
                      </td>
                      <td className="text-slate-500">{MODULE_LABELS[e.module] ?? e.module}</td>
                      <td className="font-mono text-xs text-slate-500">{e.entityLabel || "—"}</td>
                      <td className="text-slate-500">{e.details || "—"}</td>
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
