"use client";

import { useMemo, useState } from "react";
import type { Reservation, EventPurchase, EventStaff, EventOtherExpense } from "@/db/schema";
import { ACHAT_CATEGORIES, STAFF_TYPES, PAYMENT_STATUSES } from "@/db/schema";
import type { ErpData } from "@/lib/store";
import { apiSend } from "@/lib/store";
import { fmtMoney, fmtDate, num, todayISO } from "@/lib/format";
import {
  purchasesFor,
  staffFor,
  otherExpensesFor,
  purchasesTotal,
  staffTotal,
  otherExpensesTotal,
  reservationProfitability,
} from "@/lib/event-finance";
import { Field, Tabs, EmptyState } from "./ui";
import { IconPlus, IconTrash, IconEdit, IconAlert, IconCash } from "./icons";

// ---------------------------------------------------------------------------
// "Dépenses de l'événement" — embedded inside the reservation edit modal
// (Reservations.tsx), only once the reservation has been saved (needs a real
// reservationId to attach rows to). Three sub-sections (Achats / Personnel /
// Autres dépenses), each with unlimited entries and a running total, plus a
// live Total revenus / Total dépenses / Bénéfice net summary that updates
// immediately after any add/edit/delete (via the `refresh` callback that
// re-pulls all ERP data, same pattern as every other module in the app).
// ---------------------------------------------------------------------------

export default function EventExpenses({
  reservation,
  data,
  refresh,
}: {
  reservation: Reservation;
  data: ErpData;
  refresh: () => Promise<void>;
}) {
  const [tab, setTab] = useState<"achats" | "personnel" | "autres">("achats");

  const purchases = useMemo(() => purchasesFor(reservation.id, data.eventPurchases), [reservation.id, data.eventPurchases]);
  const staff = useMemo(() => staffFor(reservation.id, data.eventStaff), [reservation.id, data.eventStaff]);
  const others = useMemo(() => otherExpensesFor(reservation.id, data.eventOtherExpenses), [reservation.id, data.eventOtherExpenses]);

  const profit = useMemo(
    () => reservationProfitability(reservation, data.payments, data.eventPurchases, data.eventStaff, data.eventOtherExpenses),
    [reservation, data.payments, data.eventPurchases, data.eventStaff, data.eventOtherExpenses],
  );

  return (
    <div className="rounded-xl border border-slate-200 p-2.5">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-sm font-bold text-slate-700">Dépenses de l&apos;événement</h4>
        <span className="ef-badge bg-slate-100 text-slate-500">
          <IconCash className="h-3.5 w-3.5" /> Mis à jour automatiquement
        </span>
      </div>

      {/* Résumé financier en direct */}
      <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <SummaryBox label="Total des revenus" value={profit.totalRevenus} tone="neutral" />
        <SummaryBox label="Total des dépenses" value={profit.totalDepenses} tone="expense" />
        <SummaryBox label="Bénéfice net" value={profit.beneficeNet} tone={profit.beneficeNet >= 0 ? "positive" : "negative"} />
      </div>
      <p className="mb-3 text-xs text-slate-400">
        Revenu location {fmtMoney(profit.revenuLocation)} + Prestations {fmtMoney(profit.revenuPrestations)} = Revenus {fmtMoney(profit.totalRevenus)}
        {"  ·  "}
        Achats {fmtMoney(profit.totalAchats)} + Salaires {fmtMoney(profit.totalSalaires)} + Autres {fmtMoney(profit.totalAutres)} = Dépenses {fmtMoney(profit.totalDepenses)}
      </p>

      <Tabs
        tabs={[
          { key: "achats", label: `Achats (${fmtMoney(purchasesTotal(purchases))})` },
          { key: "personnel", label: `Personnel (${fmtMoney(staffTotal(staff))})` },
          { key: "autres", label: `Autres dépenses (${fmtMoney(otherExpensesTotal(others))})` },
        ]}
        active={tab}
        onChange={(k) => setTab(k as typeof tab)}
      />

      {tab === "achats" && <AchatsPanel reservationId={reservation.id} rows={purchases} refresh={refresh} />}
      {tab === "personnel" && <PersonnelPanel reservationId={reservation.id} rows={staff} refresh={refresh} />}
      {tab === "autres" && <AutresPanel reservationId={reservation.id} rows={others} refresh={refresh} />}
    </div>
  );
}

function SummaryBox({ label, value, tone }: { label: string; value: number; tone: "neutral" | "expense" | "positive" | "negative" }) {
  const colors: Record<typeof tone, { bg: string; fg: string }> = {
    neutral: { bg: "#eef2f7", fg: "#334155" },
    expense: { bg: "#fdeaea", fg: "#c0392b" },
    positive: { bg: "#e7f6ec", fg: "#16a34a" },
    negative: { bg: "#fdeaea", fg: "#dc2626" },
  };
  const c = colors[tone];
  return (
    <div className="rounded-lg px-3 py-2" style={{ background: c.bg }}>
      <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: c.fg, opacity: 0.75 }}>{label}</div>
      <div className="text-base font-extrabold" style={{ color: c.fg }}>{fmtMoney(value)}</div>
    </div>
  );
}

function ErrorBox({ error }: { error: string }) {
  if (!error) return null;
  return (
    <div className="mb-2 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700">
      <IconAlert className="h-4 w-4 shrink-0" /> {error}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Achats
// ---------------------------------------------------------------------------

type AchatForm = {
  id?: number;
  nomArticle: string;
  categorie: string;
  fournisseur: string;
  quantite: string;
  prixUnitaire: string;
  dateAchat: string;
  observations: string;
};

function emptyAchat(): AchatForm {
  return { nomArticle: "", categorie: "Autre", fournisseur: "", quantite: "1", prixUnitaire: "0", dateAchat: todayISO(), observations: "" };
}

function AchatsPanel({ reservationId, rows, refresh }: { reservationId: number; rows: EventPurchase[]; refresh: () => Promise<void> }) {
  const [form, setForm] = useState<AchatForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function openEdit(p: EventPurchase) {
    setError("");
    setForm({
      id: p.id,
      nomArticle: p.nomArticle,
      categorie: p.categorie,
      fournisseur: p.fournisseur ?? "",
      quantite: String(num(p.quantite)),
      prixUnitaire: String(num(p.prixUnitaire)),
      dateAchat: p.dateAchat,
      observations: p.observations ?? "",
    });
  }

  async function save() {
    if (!form) return;
    if (!form.nomArticle.trim()) {
      setError("Le nom de l'article est obligatoire.");
      return;
    }
    setSaving(true);
    setError("");
    const res = await apiSend("/api/event-purchases", form.id ? "PUT" : "POST", { ...form, reservationId });
    setSaving(false);
    if (!res.ok) {
      setError(res.error ?? "Erreur lors de l'enregistrement.");
      return;
    }
    await refresh();
    setForm(null);
  }

  async function remove(id: number) {
    if (!confirm("Supprimer cet achat ?")) return;
    const res = await apiSend(`/api/event-purchases?id=${id}`, "DELETE");
    if (!res.ok) {
      alert(res.error ?? "Erreur lors de la suppression.");
      return;
    }
    await refresh();
  }

  const total = purchasesTotal(rows);
  const previewTotal = form ? (num(form.quantite) * num(form.prixUnitaire)) : 0;

  return (
    <div>
      {!form ? (
        <button type="button" className="ef-btn ef-btn-ghost mb-2 text-xs" onClick={() => { setError(""); setForm(emptyAchat()); }}>
          <IconPlus className="h-3.5 w-3.5" /> Ajouter un achat
        </button>
      ) : (
        <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
          <ErrorBox error={error} />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Field label="Nom de l'article *">
              <input className="ef-input" value={form.nomArticle} onChange={(e) => setForm({ ...form, nomArticle: e.target.value })} />
            </Field>
            <Field label="Catégorie">
              <select className="ef-input" value={form.categorie} onChange={(e) => setForm({ ...form, categorie: e.target.value })}>
                {ACHAT_CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="Fournisseur">
              <input className="ef-input" value={form.fournisseur} onChange={(e) => setForm({ ...form, fournisseur: e.target.value })} />
            </Field>
            <Field label="Quantité *">
              <input type="number" className="ef-input" value={form.quantite} onChange={(e) => setForm({ ...form, quantite: e.target.value })} />
            </Field>
            <Field label="Prix unitaire (DA) *">
              <input type="number" className="ef-input" value={form.prixUnitaire} onChange={(e) => setForm({ ...form, prixUnitaire: e.target.value })} />
            </Field>
            <Field label="Date">
              <input type="date" className="ef-input" value={form.dateAchat} onChange={(e) => setForm({ ...form, dateAchat: e.target.value })} />
            </Field>
          </div>
          <Field label="Observations">
            <input className="ef-input" value={form.observations} onChange={(e) => setForm({ ...form, observations: e.target.value })} />
          </Field>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Prix total : {fmtMoney(previewTotal)}</span>
            <div className="flex gap-2">
              <button className="ef-btn ef-btn-ghost text-xs" onClick={() => setForm(null)}>Annuler</button>
              <button className="ef-btn ef-btn-primary text-xs" disabled={saving} onClick={save}>{saving ? "…" : "Enregistrer"}</button>
            </div>
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState text="Aucun achat enregistré pour cette réservation." />
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-slate-400">
              <th className="py-1">Article</th>
              <th>Catégorie</th>
              <th>Fournisseur</th>
              <th className="text-right">Qté</th>
              <th className="text-right">P.U.</th>
              <th className="text-right">Total</th>
              <th>Date</th>
              <th className="w-16" />
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-t border-slate-100">
                <td className="py-1.5 pr-2 font-medium text-slate-700">{p.nomArticle}</td>
                <td className="text-slate-500">{p.categorie}</td>
                <td className="text-slate-500">{p.fournisseur || "—"}</td>
                <td className="text-right text-slate-600">{num(p.quantite)}</td>
                <td className="text-right text-slate-600">{fmtMoney(p.prixUnitaire)}</td>
                <td className="text-right font-semibold text-slate-700">{fmtMoney(p.prixTotal)}</td>
                <td className="text-slate-500">{fmtDate(p.dateAchat)}</td>
                <td>
                  <div className="flex justify-end gap-1">
                    <button onClick={() => openEdit(p)} className="rounded p-1 text-slate-400 hover:text-slate-700"><IconEdit className="h-3.5 w-3.5" /></button>
                    <button onClick={() => remove(p.id)} className="rounded p-1 text-slate-400 hover:text-red-600"><IconTrash className="h-3.5 w-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-200 font-bold text-slate-800">
              <td className="py-1.5" colSpan={5}>Total des achats</td>
              <td className="text-right">{fmtMoney(total)}</td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Personnel de l'événement
// ---------------------------------------------------------------------------

type StaffForm = {
  id?: number;
  type: string;
  nom: string;
  telephone: string;
  nombreHeures: string;
  salaire: string;
  statutPaiement: string;
  datePaiement: string;
  observations: string;
};

function emptyStaff(): StaffForm {
  return { type: "Serveur", nom: "", telephone: "", nombreHeures: "0", salaire: "0", statutPaiement: "Non payé", datePaiement: todayISO(), observations: "" };
}

function PersonnelPanel({ reservationId, rows, refresh }: { reservationId: number; rows: EventStaff[]; refresh: () => Promise<void> }) {
  const [form, setForm] = useState<StaffForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function openEdit(s: EventStaff) {
    setError("");
    setForm({
      id: s.id,
      type: s.type,
      nom: s.nom,
      telephone: s.telephone ?? "",
      nombreHeures: String(num(s.nombreHeures)),
      salaire: String(num(s.salaire)),
      statutPaiement: s.statutPaiement,
      datePaiement: s.datePaiement || todayISO(),
      observations: s.observations ?? "",
    });
  }

  async function save() {
    if (!form) return;
    if (!form.nom.trim()) {
      setError("Le nom de l'employé est obligatoire.");
      return;
    }
    setSaving(true);
    setError("");
    const res = await apiSend("/api/event-staff", form.id ? "PUT" : "POST", { ...form, reservationId });
    setSaving(false);
    if (!res.ok) {
      setError(res.error ?? "Erreur lors de l'enregistrement.");
      return;
    }
    await refresh();
    setForm(null);
  }

  async function remove(id: number) {
    if (!confirm("Supprimer cet employé ?")) return;
    const res = await apiSend(`/api/event-staff?id=${id}`, "DELETE");
    if (!res.ok) {
      alert(res.error ?? "Erreur lors de la suppression.");
      return;
    }
    await refresh();
  }

  const total = staffTotal(rows);

  return (
    <div>
      {!form ? (
        <button type="button" className="ef-btn ef-btn-ghost mb-2 text-xs" onClick={() => { setError(""); setForm(emptyStaff()); }}>
          <IconPlus className="h-3.5 w-3.5" /> Ajouter un employé
        </button>
      ) : (
        <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
          <ErrorBox error={error} />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Field label="Type *">
              <select className="ef-input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {STAFF_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </Field>
            <Field label="Nom *">
              <input className="ef-input" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} />
            </Field>
            <Field label="Téléphone (optionnel)">
              <input className="ef-input" value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} />
            </Field>
            <Field label="Nombre d'heures">
              <input type="number" className="ef-input" value={form.nombreHeures} onChange={(e) => setForm({ ...form, nombreHeures: e.target.value })} />
            </Field>
            <Field label="Salaire convenu (DA) *">
              <input type="number" className="ef-input" value={form.salaire} onChange={(e) => setForm({ ...form, salaire: e.target.value })} />
            </Field>
            <Field label="Statut de paiement">
              <select className="ef-input" value={form.statutPaiement} onChange={(e) => setForm({ ...form, statutPaiement: e.target.value })}>
                {PAYMENT_STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
            {form.statutPaiement === "Payé" && (
              <Field label="Date de paiement">
                <input type="date" className="ef-input" value={form.datePaiement} onChange={(e) => setForm({ ...form, datePaiement: e.target.value })} />
              </Field>
            )}
          </div>
          <Field label="Observations">
            <input className="ef-input" value={form.observations} onChange={(e) => setForm({ ...form, observations: e.target.value })} />
          </Field>
          <div className="mt-2 flex justify-end gap-2">
            <button className="ef-btn ef-btn-ghost text-xs" onClick={() => setForm(null)}>Annuler</button>
            <button className="ef-btn ef-btn-primary text-xs" disabled={saving} onClick={save}>{saving ? "…" : "Enregistrer"}</button>
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState text="Aucun employé enregistré pour cette réservation." />
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-slate-400">
              <th className="py-1">Type</th>
              <th>Nom</th>
              <th>Téléphone</th>
              <th className="text-right">Heures</th>
              <th className="text-right">Salaire</th>
              <th>Statut</th>
              <th className="w-16" />
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id} className="border-t border-slate-100">
                <td className="py-1.5 pr-2 text-slate-600">{s.type}</td>
                <td className="font-medium text-slate-700">{s.nom}</td>
                <td className="text-slate-500">{s.telephone || "—"}</td>
                <td className="text-right text-slate-600">{num(s.nombreHeures)}</td>
                <td className="text-right font-semibold text-slate-700">{fmtMoney(s.salaire)}</td>
                <td>
                  <span
                    className="ef-badge"
                    style={
                      s.statutPaiement === "Payé"
                        ? { background: "#e7f6ec", color: "#137a3b" }
                        : { background: "#fdeaea", color: "#c0392b" }
                    }
                  >
                    {s.statutPaiement}
                  </span>
                </td>
                <td>
                  <div className="flex justify-end gap-1">
                    <button onClick={() => openEdit(s)} className="rounded p-1 text-slate-400 hover:text-slate-700"><IconEdit className="h-3.5 w-3.5" /></button>
                    <button onClick={() => remove(s.id)} className="rounded p-1 text-slate-400 hover:text-red-600"><IconTrash className="h-3.5 w-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-200 font-bold text-slate-800">
              <td className="py-1.5" colSpan={4}>Total des salaires</td>
              <td className="text-right">{fmtMoney(total)}</td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Autres dépenses
// ---------------------------------------------------------------------------

type AutreForm = {
  id?: number;
  libelle: string;
  montant: string;
  dateDepense: string;
  observations: string;
};

function emptyAutre(): AutreForm {
  return { libelle: "", montant: "", dateDepense: todayISO(), observations: "" };
}

function AutresPanel({ reservationId, rows, refresh }: { reservationId: number; rows: EventOtherExpense[]; refresh: () => Promise<void> }) {
  const [form, setForm] = useState<AutreForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function openEdit(o: EventOtherExpense) {
    setError("");
    setForm({ id: o.id, libelle: o.libelle, montant: String(num(o.montant)), dateDepense: o.dateDepense, observations: o.observations ?? "" });
  }

  async function save() {
    if (!form) return;
    const montant = Number(form.montant);
    if (!form.libelle.trim() || !Number.isFinite(montant) || montant <= 0) {
      setError("Le libellé et un montant positif sont obligatoires.");
      return;
    }
    setSaving(true);
    setError("");
    const res = await apiSend("/api/event-other-expenses", form.id ? "PUT" : "POST", { ...form, reservationId });
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
    const res = await apiSend(`/api/event-other-expenses?id=${id}`, "DELETE");
    if (!res.ok) {
      alert(res.error ?? "Erreur lors de la suppression.");
      return;
    }
    await refresh();
  }

  const total = otherExpensesTotal(rows);

  return (
    <div>
      {!form ? (
        <button type="button" className="ef-btn ef-btn-ghost mb-2 text-xs" onClick={() => { setError(""); setForm(emptyAutre()); }}>
          <IconPlus className="h-3.5 w-3.5" /> Ajouter une dépense
        </button>
      ) : (
        <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
          <ErrorBox error={error} />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Field label="Libellé *">
              <input className="ef-input" value={form.libelle} onChange={(e) => setForm({ ...form, libelle: e.target.value })} />
            </Field>
            <Field label="Montant (DA) *">
              <input type="number" className="ef-input" value={form.montant} onChange={(e) => setForm({ ...form, montant: e.target.value })} />
            </Field>
            <Field label="Date">
              <input type="date" className="ef-input" value={form.dateDepense} onChange={(e) => setForm({ ...form, dateDepense: e.target.value })} />
            </Field>
          </div>
          <Field label="Observations">
            <input className="ef-input" value={form.observations} onChange={(e) => setForm({ ...form, observations: e.target.value })} />
          </Field>
          <div className="mt-2 flex justify-end gap-2">
            <button className="ef-btn ef-btn-ghost text-xs" onClick={() => setForm(null)}>Annuler</button>
            <button className="ef-btn ef-btn-primary text-xs" disabled={saving} onClick={save}>{saving ? "…" : "Enregistrer"}</button>
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState text="Aucune autre dépense enregistrée pour cette réservation." />
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-slate-400">
              <th className="py-1">Libellé</th>
              <th>Observations</th>
              <th>Date</th>
              <th className="text-right">Montant</th>
              <th className="w-16" />
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => (
              <tr key={o.id} className="border-t border-slate-100">
                <td className="py-1.5 pr-2 font-medium text-slate-700">{o.libelle}</td>
                <td className="text-slate-500">{o.observations || "—"}</td>
                <td className="text-slate-500">{fmtDate(o.dateDepense)}</td>
                <td className="text-right font-semibold text-slate-700">{fmtMoney(o.montant)}</td>
                <td>
                  <div className="flex justify-end gap-1">
                    <button onClick={() => openEdit(o)} className="rounded p-1 text-slate-400 hover:text-slate-700"><IconEdit className="h-3.5 w-3.5" /></button>
                    <button onClick={() => remove(o.id)} className="rounded p-1 text-slate-400 hover:text-red-600"><IconTrash className="h-3.5 w-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-200 font-bold text-slate-800">
              <td className="py-1.5" colSpan={3}>Total autres dépenses</td>
              <td className="text-right">{fmtMoney(total)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      )}
    </div>
  );
}
