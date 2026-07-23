"use client";

import { useState } from "react";
import type { Pack, PackPrestation } from "@/db/schema";
import type { ErpData } from "@/lib/store";
import { apiSend } from "@/lib/store";
import { fmtMoney } from "@/lib/format";
import { TYPES_EVENEMENT } from "@/lib/compute";
import { Modal, Field, PageHeader, EmptyState } from "../ui";
import { IconPlus, IconEdit, IconTrash, IconAlert } from "../icons";

type PackForm = {
  id?: number;
  nom: string;
  typeEvenement: string;
  prix: string;
  description: string;
  prestations: PackPrestation[];
  actif: number;
};

const blank: PackForm = {
  nom: "",
  typeEvenement: "",
  prix: "0",
  description: "",
  prestations: [],
  actif: 1,
};

export default function Packs({
  data,
  refresh,
}: {
  data: ErpData;
  refresh: () => Promise<void>;
}) {
  const [form, setForm] = useState<PackForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = <K extends keyof PackForm>(k: K, v: PackForm[K]) =>
    setForm((f) => (f ? { ...f, [k]: v } : f));

  function openCreate() {
    setError("");
    setForm({ ...blank, prestations: [] });
  }

  function openEdit(p: Pack) {
    setError("");
    setForm({
      id: p.id,
      nom: p.nom,
      typeEvenement: p.typeEvenement ?? "",
      prix: String(p.prix),
      description: p.description ?? "",
      prestations: (p.prestations ?? []).map((x) => ({ ...x })),
      actif: p.actif,
    });
  }

  function toggleInclus(prestationId: number, nom: string) {
    if (!form) return;
    const exists = form.prestations.find((x) => x.prestationId === prestationId);
    if (exists) {
      set("prestations", form.prestations.filter((x) => x.prestationId !== prestationId));
    } else {
      set("prestations", [...form.prestations, { prestationId, nom, qte: 1 }]);
    }
  }

  function setQte(prestationId: number, qte: number) {
    if (!form) return;
    set(
      "prestations",
      form.prestations.map((x) => (x.prestationId === prestationId ? { ...x, qte } : x)),
    );
  }

  async function save() {
    if (!form?.nom?.trim()) {
      setError("Le nom du pack est obligatoire.");
      return;
    }
    setSaving(true);
    setError("");
    const res = await apiSend("/api/packs", form.id ? "PUT" : "POST", form);
    setSaving(false);
    if (!res.ok) {
      setError(res.error ?? "Erreur lors de l'enregistrement.");
      return;
    }
    await refresh();
    setForm(null);
  }

  async function remove(id: number) {
    if (!confirm("Supprimer ce pack ? Les réservations qui l'utilisent garderont leur ligne de facturation mais perdront le lien vers ce pack.")) return;
    const res = await apiSend(`/api/packs?id=${id}`, "DELETE");
    if (!res.ok) {
      alert(res.error ?? "Erreur lors de la suppression.");
      return;
    }
    await refresh();
  }

  return (
    <div className="ef-fade">
      <PageHeader
        title="Packs & Baguettes"
        subtitle={`${data.packs.length} pack(s) — prix fixe, indépendant du prix unitaire des prestations`}
        action={
          <button className="ef-btn ef-btn-primary" onClick={openCreate}>
            <IconPlus className="h-4 w-4" /> Nouveau pack
          </button>
        }
      />

      {data.packs.length === 0 ? (
        <EmptyState text="Aucun pack. Créez des baguettes prêtes à l'emploi (ex. Pack Mariage Prestige) à prix fixe." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.packs.map((p) => (
            <div key={p.id} className="ef-card flex flex-col gap-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">{p.nom}</h3>
                  <p className="text-xs text-slate-400">{p.typeEvenement || "Tous types d'événement"}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(p)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                    <IconEdit className="h-4 w-4" />
                  </button>
                  <button onClick={() => remove(p.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600">
                    <IconTrash className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="text-lg font-extrabold text-[#b56a00]">{fmtMoney(p.prix)}</div>
              {p.description && <p className="text-xs text-slate-500">{p.description}</p>}
              {p.prestations.length > 0 && (
                <ul className="mt-1 space-y-0.5 border-t border-slate-100 pt-2 text-xs text-slate-600">
                  {p.prestations.map((x, i) => (
                    <li key={i}>• {x.nom}{x.qte > 1 ? ` ×${x.qte}` : ""}</li>
                  ))}
                </ul>
              )}
              {!p.actif && <span className="mt-1 w-fit rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">Inactif</span>}
            </div>
          ))}
        </div>
      )}

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? "Modifier le pack" : "Nouveau pack"}>
        {form && (
          <div className="space-y-3">
            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <IconAlert className="h-4 w-4 shrink-0" /> {error}
              </div>
            )}
            <Field label="Nom *">
              <input className="ef-input" value={form.nom} onChange={(e) => set("nom", e.target.value)} placeholder="Pack Mariage Prestige" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Type d'événement">
                <select className="ef-input" value={form.typeEvenement} onChange={(e) => set("typeEvenement", e.target.value)}>
                  <option value="">Tous types</option>
                  {TYPES_EVENEMENT.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </Field>
              <Field label="Prix fixe du pack (DA)">
                <input type="number" className="ef-input" value={form.prix} onChange={(e) => set("prix", e.target.value)} />
              </Field>
            </div>
            <Field label="Description">
              <textarea className="ef-input" rows={2} value={form.description} onChange={(e) => set("description", e.target.value)} />
            </Field>

            <div className="rounded-xl border border-slate-200 p-2.5">
              <h4 className="mb-2 text-sm font-bold text-slate-700">Prestations incluses (informatif — non recalculé dans le prix)</h4>
              <div className="max-h-48 space-y-1 overflow-y-auto">
                {data.prestations.map((p) => {
                  const inclus = form.prestations.find((x) => x.prestationId === p.id);
                  return (
                    <label key={p.id} className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm hover:bg-slate-50">
                      <input type="checkbox" checked={!!inclus} onChange={() => toggleInclus(p.id, p.nom)} />
                      <span className="flex-1">{p.nom}</span>
                      {inclus && (
                        <input
                          type="number"
                          min={1}
                          className="ef-input w-16 py-0.5 text-xs"
                          value={inclus.qte}
                          onChange={(e) => setQte(p.id, Number(e.target.value) || 1)}
                        />
                      )}
                    </label>
                  );
                })}
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={!!form.actif} onChange={(e) => set("actif", e.target.checked ? 1 : 0)} /> Pack actif (proposable lors d'une réservation)
            </label>

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
