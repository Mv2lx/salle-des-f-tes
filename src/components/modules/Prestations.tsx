"use client";

import { useMemo, useState } from "react";
import type { Prestation } from "@/db/schema";
import type { ErpData } from "@/lib/store";
import { apiSend } from "@/lib/store";
import { fmtMoney } from "@/lib/format";
import { CATEGORIES_PRESTATION } from "@/lib/compute";
import { Modal, Field, PageHeader } from "../ui";
import { IconPlus, IconEdit, IconTrash, IconTag, IconAlert } from "../icons";

const blank: Partial<Prestation> = {
  nom: "",
  categorie: "Autres",
  unite: "unité",
  prix: "0",
  actif: 1,
};

export default function Prestations({
  data,
  refresh,
}: {
  data: ErpData;
  refresh: () => Promise<void>;
}) {
  const [form, setForm] = useState<Partial<Prestation> | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const grouped = useMemo(() => {
    const map = new Map<string, Prestation[]>();
    for (const p of data.prestations) {
      const arr = map.get(p.categorie ?? "Autres") ?? [];
      arr.push(p);
      map.set(p.categorie ?? "Autres", arr);
    }
    return [...map.entries()];
  }, [data.prestations]);

  const set = (k: keyof Prestation, v: string | number) =>
    setForm((f) => ({ ...(f ?? {}), [k]: v }));

  async function save() {
    if (!form?.nom?.trim()) {
      setError("Le nom de la prestation est obligatoire.");
      return;
    }
    setSaving(true);
    setError("");
    const res = await apiSend("/api/prestations", form.id ? "PUT" : "POST", form);
    setSaving(false);
    if (!res.ok) {
      setError(res.error ?? "Erreur lors de l'enregistrement.");
      return;
    }
    await refresh();
    setForm(null);
  }

  async function remove(id: number) {
    if (!confirm("Supprimer cette prestation ?")) return;
    const res = await apiSend(`/api/prestations?id=${id}`, "DELETE");
    if (!res.ok) {
      alert(res.error ?? "Erreur lors de la suppression.");
      return;
    }
    await refresh();
  }

  return (
    <div className="ef-fade">
      <PageHeader
        title="Catalogue des prestations"
        subtitle={`${data.prestations.length} prestation(s) — tarifs modifiables`}
        action={
          <button className="ef-btn ef-btn-primary" onClick={() => { setError(""); setForm({ ...blank }); }}>
            <IconPlus className="h-4 w-4" /> Nouvelle prestation
          </button>
        }
      />

      <div className="space-y-5">
        {grouped.map(([cat, list]) => (
          <div key={cat} className="ef-card overflow-hidden">
            <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/60 px-4 py-2.5">
              <IconTag className="h-4 w-4 text-[#f5a623]" />
              <h3 className="text-sm font-bold text-slate-700">{cat}</h3>
              <span className="ml-auto text-xs text-slate-400">{list.length}</span>
            </div>
            <table className="w-full text-sm">
              <tbody>
                {list.map((p) => (
                  <tr key={p.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                    <td className="px-4 py-2.5 font-medium text-slate-700">{p.nom}</td>
                    <td className="text-slate-500">/ {p.unite}</td>
                    <td className="text-right font-bold text-slate-800">{fmtMoney(p.prix)}</td>
                    <td className="w-24 px-4">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => { setError(""); setForm(p); }} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                          <IconEdit className="h-4 w-4" />
                        </button>
                        <button onClick={() => remove(p.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600">
                          <IconTrash className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? "Modifier la prestation" : "Nouvelle prestation"}>
        {form && (
          <div className="space-y-3">
            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <IconAlert className="h-4 w-4 shrink-0" /> {error}
              </div>
            )}
            <Field label="Nom *">
              <input className="ef-input" value={form.nom ?? ""} onChange={(e) => set("nom", e.target.value)} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Catégorie">
                <select className="ef-input" value={form.categorie ?? "Autres"} onChange={(e) => set("categorie", e.target.value)}>
                  {CATEGORIES_PRESTATION.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <Field label="Unité">
                <input className="ef-input" value={form.unite ?? ""} onChange={(e) => set("unite", e.target.value)} />
              </Field>
            </div>
            <Field label="Prix unitaire (DA)">
              <input type="number" className="ef-input" value={form.prix ?? "0"} onChange={(e) => set("prix", e.target.value)} />
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
