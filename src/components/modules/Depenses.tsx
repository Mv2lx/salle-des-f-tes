"use client";

import { useState } from "react";
import type { ErpData } from "@/lib/store";
import { apiSend } from "@/lib/store";
import { fmtMoney, fmtDate, num, todayISO } from "@/lib/format";
import { MODES_PAIEMENT } from "@/lib/compute";
import { Modal, Field, PageHeader, EmptyState } from "../ui";
import { IconPlus, IconTrash, IconEdit, IconAlert } from "../icons";

type EForm = {
  id?: number;
  fournisseur: string;
  nature: string;
  dateDepense: string;
  montant: string;
  mode: string;
  observation: string;
  reservationId: number | "";
};

function emptyForm(): EForm {
  return { fournisseur: "", nature: "", dateDepense: todayISO(), montant: "", mode: "Espèces", observation: "", reservationId: "" };
}

export default function Depenses({
  data,
  refresh,
}: {
  data: ErpData;
  refresh: () => Promise<void>;
}) {
  const [form, setForm] = useState<EForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const total = data.expenses.reduce((s, e) => s + num(e.montant), 0);

  const reservationLabel = (id: number | null) => {
    if (!id) return "";
    const r = data.reservations.find((x) => x.id === id);
    if (!r) return "";
    const c = data.clients.find((x) => x.id === r.clientId);
    return `${r.reference} — ${c ? `${c.nom} ${c.prenom ?? ""}`.trim() : ""}`.trim();
  };

  function openCreate() {
    setError("");
    setForm(emptyForm());
  }
  function openEdit(id: number) {
    const e = data.expenses.find((x) => x.id === id);
    if (!e) return;
    setError("");
    setForm({
      id: e.id,
      fournisseur: e.fournisseur ?? "",
      nature: e.nature ?? "",
      dateDepense: e.dateDepense,
      montant: String(num(e.montant)),
      mode: e.mode,
      observation: e.observation ?? "",
      reservationId: e.reservationId ?? "",
    });
  }

  async function save() {
    if (!form) return;
    const montant = Number(form.montant);
    if (!Number.isFinite(montant) || montant <= 0) {
      setError("Le montant doit être un nombre positif.");
      return;
    }
    setSaving(true);
    setError("");
    const payload = { ...form, reservationId: form.reservationId === "" ? null : form.reservationId };
    const res = await apiSend("/api/expenses", form.id ? "PUT" : "POST", payload);
    setSaving(false);
    if (!res.ok) {
      setError(res.error ?? "Erreur lors de l'enregistrement.");
      return;
    }
    await refresh();
    setForm(null);
  }
  async function remove(id: number) {
    if (!confirm("Supprimer cette dépense ?")) return;
    const res = await apiSend(`/api/expenses?id=${id}`, "DELETE");
    if (!res.ok) {
      alert(res.error ?? "Erreur lors de la suppression.");
      return;
    }
    await refresh();
  }

  return (
    <div className="ef-fade">
      <PageHeader
        title="Dépenses"
        subtitle={`Total : ${fmtMoney(total)}`}
        action={
          <button className="ef-btn ef-btn-primary" onClick={openCreate}>
            <IconPlus className="h-4 w-4" /> Nouvelle dépense
          </button>
        }
      />

      {data.expenses.length === 0 ? (
        <EmptyState text="Aucune dépense enregistrée." />
      ) : (
        <div className="ef-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-xs uppercase text-slate-400">
                  <th className="px-4 py-3">Date</th>
                  <th>Fournisseur</th>
                  <th>Nature</th>
                  <th>Mode</th>
                  <th>Réservation liée</th>
                  <th>Observation</th>
                  <th className="text-right">Montant</th>
                  <th className="px-4" />
                </tr>
              </thead>
              <tbody>
                {data.expenses.map((e) => (
                  <tr key={e.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                    <td className="px-4 py-3 text-slate-500">{fmtDate(e.dateDepense)}</td>
                    <td className="font-medium text-slate-700">{e.fournisseur || "—"}</td>
                    <td className="text-slate-600">{e.nature || "—"}</td>
                    <td><span className="ef-badge bg-slate-100 text-slate-600">{e.mode}</span></td>
                    <td className="text-xs text-slate-500">
                      {e.reservationId ? (
                        <span className="ef-badge bg-[#fff4e0] text-[#b56a00]">{reservationLabel(e.reservationId) || `#${e.reservationId}`}</span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="text-slate-500">{e.observation || "—"}</td>
                    <td className="text-right font-bold text-red-600">{fmtMoney(e.montant)}</td>
                    <td className="px-4">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEdit(e.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                          <IconEdit className="h-4 w-4" />
                        </button>
                        <button onClick={() => remove(e.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600">
                          <IconTrash className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? "Modifier la dépense" : "Nouvelle dépense"}>
        {form && (
          <div className="space-y-3">
            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <IconAlert className="h-4 w-4 shrink-0" /> {error}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Fournisseur">
                <input className="ef-input" value={form.fournisseur} onChange={(e) => setForm({ ...form, fournisseur: e.target.value })} />
              </Field>
              <Field label="Nature">
                <input className="ef-input" value={form.nature} onChange={(e) => setForm({ ...form, nature: e.target.value })} />
              </Field>
              <Field label="Date">
                <input type="date" className="ef-input" value={form.dateDepense} onChange={(e) => setForm({ ...form, dateDepense: e.target.value })} />
              </Field>
              <Field label="Montant (DA)">
                <input type="number" className="ef-input" value={form.montant} onChange={(e) => setForm({ ...form, montant: e.target.value })} />
              </Field>
              <Field label="Mode de paiement">
                <select className="ef-input" value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })}>
                  {MODES_PAIEMENT.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </Field>
              <Field label="Réservation liée (optionnel)">
                <select
                  className="ef-input"
                  value={form.reservationId}
                  onChange={(e) => setForm({ ...form, reservationId: e.target.value ? Number(e.target.value) : "" })}
                >
                  <option value="">— Dépense générale —</option>
                  {data.reservations.map((r) => (
                    <option key={r.id} value={r.id}>{r.reference} — {reservationLabel(r.id) || r.typeEvenement}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Observation">
              <textarea className="ef-input" rows={2} value={form.observation} onChange={(e) => setForm({ ...form, observation: e.target.value })} />
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
