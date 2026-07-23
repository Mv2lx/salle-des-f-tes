"use client";

import { useState } from "react";
import type { Salle } from "@/db/schema";
import type { ErpData } from "@/lib/store";
import { apiSend } from "@/lib/store";
import { fmtMoney, fmtDate, fmtTime } from "@/lib/format";
import { statutColor } from "@/lib/compute";
import { Modal, Field, PageHeader } from "../ui";
import { IconEdit, IconHall, IconAlert } from "../icons";

export default function Salles({
  data,
  refresh,
}: {
  data: ErpData;
  refresh: () => Promise<void>;
}) {
  const [form, setForm] = useState<Salle | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k: keyof Salle, v: string | number) =>
    setForm((f) => (f ? { ...f, [k]: v } : f));

  async function save() {
    if (!form) return;
    if (!form.nom?.trim()) {
      setError("Le nom de la salle est obligatoire.");
      return;
    }
    setSaving(true);
    setError("");
    const res = await apiSend("/api/salles", "PUT", form);
    setSaving(false);
    if (!res.ok) {
      setError(res.error ?? "Erreur lors de l'enregistrement.");
      return;
    }
    await refresh();
    setForm(null);
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="ef-fade">
      <PageHeader
        title="Gestion des salles"
        subtitle="Les deux salles de réception de HOTEL EL FARES"
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {data.salles.map((s) => {
          const planning = data.reservations
            .filter((r) => r.salleId === s.id && r.statut !== "Annulée" && r.dateEvenement >= today)
            .sort((a, b) => a.dateEvenement.localeCompare(b.dateEvenement))
            .slice(0, 6);
          const total = data.reservations.filter((r) => r.salleId === s.id).length;
          return (
            <div key={s.id} className="ef-card overflow-hidden">
              <div
                className="flex items-center justify-between p-5 text-white"
                style={{ background: `linear-gradient(135deg, ${s.couleur}, ${s.couleur}cc)` }}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20">
                    <IconHall className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold leading-tight">{s.nom}</h3>
                    <p className="text-sm text-white/85">Capacité : {s.capacite} personnes</p>
                  </div>
                </div>
                <button
                  onClick={() => { setError(""); setForm(s); }}
                  className="rounded-lg bg-white/20 p-2 hover:bg-white/30"
                >
                  <IconEdit className="h-4 w-4" />
                </button>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg bg-slate-50 p-3">
                    <div className="text-xs text-slate-400">Tarif location / journée</div>
                    <div className="font-bold text-slate-800">{fmtMoney(s.tarif)}</div>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <div className="text-xs text-slate-400">Total réservations</div>
                    <div className="font-bold text-slate-800">{total}</div>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-xs font-semibold text-slate-400">Équipements</div>
                  <p className="text-sm text-slate-600">{s.equipements || "—"}</p>
                </div>
                {s.description && (
                  <p className="mt-2 text-sm text-slate-500">{s.description}</p>
                )}
                <h4 className="mb-2 mt-4 text-sm font-bold text-slate-700">Planning à venir</h4>
                {planning.length === 0 ? (
                  <p className="text-sm text-slate-400">Aucun événement programmé.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {planning.map((r) => {
                      const c = statutColor(r.statut);
                      return (
                        <li key={r.id} className="flex items-center gap-2 text-sm">
                          <span className="h-2 w-2 rounded-full" style={{ background: c.dot }} />
                          <span className="font-medium text-slate-600">{fmtDate(r.dateEvenement)}</span>
                          <span className="text-slate-400">·</span>
                          <span className="text-slate-500">{r.typeEvenement}</span>
                          <span className="ml-auto text-xs text-slate-400">{fmtTime(r.heureDebut)}–{fmtTime(r.heureFin)}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Modal open={!!form} onClose={() => setForm(null)} title="Modifier la salle">
        {form && (
          <div className="space-y-3">
            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <IconAlert className="h-4 w-4 shrink-0" /> {error}
              </div>
            )}
            <Field label="Nom">
              <input className="ef-input" value={form.nom} onChange={(e) => set("nom", e.target.value)} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Capacité">
                <input type="number" className="ef-input" value={form.capacite} onChange={(e) => set("capacite", Number(e.target.value))} />
              </Field>
              <Field label="Tarif (DA)">
                <input type="number" className="ef-input" value={form.tarif} onChange={(e) => set("tarif", e.target.value)} />
              </Field>
            </div>
            <Field label="Couleur">
              <input type="color" className="ef-input h-10" value={form.couleur ?? "#F5A623"} onChange={(e) => set("couleur", e.target.value)} />
            </Field>
            <Field label="Équipements">
              <textarea className="ef-input" rows={2} value={form.equipements ?? ""} onChange={(e) => set("equipements", e.target.value)} />
            </Field>
            <Field label="Description">
              <textarea className="ef-input" rows={2} value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} />
            </Field>
            <div className="flex justify-end gap-2 pt-1">
              <button className="ef-btn ef-btn-ghost" onClick={() => setForm(null)}>Annuler</button>
              <button className="ef-btn ef-btn-primary" disabled={saving} onClick={save}>
                {saving ? "…" : "Enregistrer"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
