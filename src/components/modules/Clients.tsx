"use client";

import { useMemo, useState } from "react";
import type { Client } from "@/db/schema";
import type { ErpData } from "@/lib/store";
import { apiSend } from "@/lib/store";
import { fmtDate } from "@/lib/format";
import { resFinance } from "@/lib/finance";
import { fmtMoney } from "@/lib/format";
import { Modal, Field, PageHeader, EmptyState } from "../ui";
import { IconPlus, IconSearch, IconEdit, IconTrash, IconAlert } from "../icons";

const blank: Partial<Client> = {
  nom: "",
  prenom: "",
  societe: "",
  telephone: "",
  telephone2: "",
  email: "",
  adresse: "",
  ville: "",
  wilaya: "",
  pays: "Algérie",
  piece: "",
  commentaires: "",
};

export default function Clients({
  data,
  refresh,
}: {
  data: ErpData;
  refresh: () => Promise<void>;
}) {
  const [q, setQ] = useState("");
  const [form, setForm] = useState<Partial<Client> | null>(null);
  const [detail, setDetail] = useState<Client | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return data.clients;
    return data.clients.filter((c) =>
      [c.nom, c.prenom, c.societe, c.telephone, c.email, c.ville, c.wilaya]
        .join(" ")
        .toLowerCase()
        .includes(s),
    );
  }, [q, data.clients]);

  const set = (k: keyof Client, v: string) =>
    setForm((f) => ({ ...(f ?? {}), [k]: v }));

  async function save() {
    if (!form?.nom?.trim()) {
      setError("Le nom est obligatoire.");
      return;
    }
    setSaving(true);
    setError("");
    const res = form.id
      ? await apiSend(`/api/clients/${form.id}`, "PUT", form)
      : await apiSend("/api/clients", "POST", form);
    setSaving(false);
    if (!res.ok) {
      setError(res.error ?? "Erreur lors de l'enregistrement.");
      return;
    }
    await refresh();
    setForm(null);
  }

  async function remove(id: number) {
    if (!confirm("Supprimer ce client ?")) return;
    const res = await apiSend(`/api/clients/${id}`, "DELETE");
    if (!res.ok) {
      alert(res.error ?? "Erreur lors de la suppression.");
      return;
    }
    await refresh();
  }

  const clientRes = (id: number) => data.reservations.filter((r) => r.clientId === id);

  return (
    <div className="ef-fade">
      <PageHeader
        title="CRM — Clients"
        subtitle={`${data.clients.length} client(s) enregistré(s)`}
        action={
          <button className="ef-btn ef-btn-primary" onClick={() => { setError(""); setForm({ ...blank }); }}>
            <IconPlus className="h-4 w-4" /> Nouveau client
          </button>
        }
      />

      <div className="relative mb-4 max-w-md">
        <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          className="ef-input pl-9"
          placeholder="Recherche instantanée (nom, société, tél, ville…)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState text="Aucun client trouvé." />
      ) : (
        <div className="ef-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-xs uppercase text-slate-400">
                  <th className="px-4 py-3">ID</th>
                  <th>Client</th>
                  <th>Société</th>
                  <th>Téléphone</th>
                  <th>Ville / Wilaya</th>
                  <th>Inscrit le</th>
                  <th className="px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">
                      CLI-{String(c.id).padStart(4, "0")}
                    </td>
                    <td>
                      <button
                        onClick={() => setDetail(c)}
                        className="font-semibold text-slate-800 hover:text-[#e08600]"
                      >
                        {c.nom} {c.prenom}
                      </button>
                      <div className="text-xs text-slate-400">{c.email}</div>
                    </td>
                    <td className="text-slate-600">{c.societe || "—"}</td>
                    <td className="text-slate-600">{c.telephone || "—"}</td>
                    <td className="text-slate-600">
                      {c.ville || "—"}
                      {c.wilaya ? ` (${c.wilaya})` : ""}
                    </td>
                    <td className="text-slate-500">{fmtDate(c.createdAt)}</td>
                    <td className="px-4">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => { setError(""); setForm(c); }}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        >
                          <IconEdit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => remove(c.id)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        >
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

      {/* Form modal */}
      <Modal
        open={!!form}
        onClose={() => setForm(null)}
        title={form?.id ? "Modifier le client" : "Nouveau client"}
        wide
        extraWide
      >
        {form && (
          <>
            {error && (
              <div className="mb-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <IconAlert className="h-4 w-4 shrink-0" /> {error}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Field label="Nom *">
                <input className="ef-input" value={form.nom ?? ""} onChange={(e) => set("nom", e.target.value)} />
              </Field>
              <Field label="Prénom">
                <input className="ef-input" value={form.prenom ?? ""} onChange={(e) => set("prenom", e.target.value)} />
              </Field>
              <Field label="Société">
                <input className="ef-input" value={form.societe ?? ""} onChange={(e) => set("societe", e.target.value)} />
              </Field>
              <Field label="Pièce d'identité">
                <input className="ef-input" value={form.piece ?? ""} onChange={(e) => set("piece", e.target.value)} />
              </Field>
              <Field label="Téléphone">
                <input className="ef-input" value={form.telephone ?? ""} onChange={(e) => set("telephone", e.target.value)} />
              </Field>
              <Field label="Téléphone secondaire">
                <input className="ef-input" value={form.telephone2 ?? ""} onChange={(e) => set("telephone2", e.target.value)} />
              </Field>
              <Field label="Email">
                <input className="ef-input" value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} />
              </Field>
              <Field label="Adresse">
                <input className="ef-input" value={form.adresse ?? ""} onChange={(e) => set("adresse", e.target.value)} />
              </Field>
              <Field label="Ville">
                <input className="ef-input" value={form.ville ?? ""} onChange={(e) => set("ville", e.target.value)} />
              </Field>
              <Field label="Wilaya">
                <input className="ef-input" value={form.wilaya ?? ""} onChange={(e) => set("wilaya", e.target.value)} />
              </Field>
              <Field label="Pays">
                <input className="ef-input" value={form.pays ?? ""} onChange={(e) => set("pays", e.target.value)} />
              </Field>
            </div>
            <div className="mt-3">
              <Field label="Commentaires">
                <textarea
                  className="ef-input"
                  rows={2}
                  value={form.commentaires ?? ""}
                  onChange={(e) => set("commentaires", e.target.value)}
                />
              </Field>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button className="ef-btn ef-btn-ghost" onClick={() => setForm(null)}>
                Annuler
              </button>
              <button className="ef-btn ef-btn-primary" disabled={saving} onClick={save}>
                {saving ? "Enregistrement…" : "Enregistrer"}
              </button>
            </div>
          </>
        )}
      </Modal>

      {/* Detail modal */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title="Fiche client & historique" wide extraWide>
        {detail && (
          <div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
              <Info label="Nom complet" value={`${detail.nom} ${detail.prenom ?? ""}`} />
              <Info label="Société" value={detail.societe || "—"} />
              <Info label="Téléphone" value={detail.telephone || "—"} />
              <Info label="Email" value={detail.email || "—"} />
              <Info label="Ville" value={detail.ville || "—"} />
              <Info label="Wilaya" value={detail.wilaya || "—"} />
              <Info label="Pièce d'identité" value={detail.piece || "—"} />
              <Info label="Pays" value={detail.pays || "—"} />
              <Info label="Inscrit le" value={fmtDate(detail.createdAt)} />
            </div>
            {detail.commentaires && (
              <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                {detail.commentaires}
              </p>
            )}
            <h4 className="mb-2 mt-5 text-sm font-bold text-slate-700">
              Historique des réservations
            </h4>
            {clientRes(detail.id).length === 0 ? (
              <p className="text-sm text-slate-400">Aucune réservation.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase text-slate-400">
                    <th className="py-1.5">Réf.</th>
                    <th>Événement</th>
                    <th>Date</th>
                    <th>Statut</th>
                    <th className="text-right">Total TTC</th>
                    <th className="text-right">Solde</th>
                  </tr>
                </thead>
                <tbody>
                  {clientRes(detail.id).map((r) => {
                    const f = resFinance(r, data.payments);
                    return (
                      <tr key={r.id} className="border-b border-slate-50">
                        <td className="py-1.5 font-mono text-xs text-slate-500">{r.reference}</td>
                        <td>{r.typeEvenement}</td>
                        <td className="text-slate-500">{fmtDate(r.dateEvenement)}</td>
                        <td>{r.statut}</td>
                        <td className="text-right">{fmtMoney(f.totalTTC)}</td>
                        <td className="text-right font-semibold text-red-600">{fmtMoney(f.solde)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-semibold text-slate-400">{label}</div>
      <div className="text-slate-700">{value}</div>
    </div>
  );
}