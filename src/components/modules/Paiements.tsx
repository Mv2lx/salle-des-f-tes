"use client";

import { useMemo, useState } from "react";
import type { ErpData } from "@/lib/store";
import { apiSend } from "@/lib/store";
import { fmtMoney, fmtDate, todayISO, num } from "@/lib/format";
import { MODES_PAIEMENT } from "@/lib/compute";
import { resFinance } from "@/lib/finance";
import { exportToExcel, printHtmlDocument, buildPrintTable } from "@/lib/export";
import { exportTableToPdf } from "@/lib/pdf-export";
import { Modal, Field, PageHeader, EmptyState } from "../ui";
import { IconPlus, IconTrash, IconEdit, IconCash, IconAlert, IconSearch, IconPrint, IconDownload } from "../icons";
import type { Payment, Reservation } from "@/db/schema";

type PForm = {
  id?: number;
  reservationId: number | "";
  montant: string;
  mode: string;
  datePaiement: string;
  reference: string;
  note: string;
};

function paymentStatusFor(res: Reservation | undefined, payments: Payment[]) {
  if (!res) return { label: "—", tint: "#94a3b8" };
  const f = resFinance(res, payments);
  if (f.paye <= 0) return { label: "Non payé", tint: "#e74c3c" };
  if (f.solde > 0.5) return { label: "Payé partiellement", tint: "#f5a623" };
  return { label: "Payé intégralement", tint: "#22a35a" };
}

export default function Paiements({
  data,
  refresh,
}: {
  data: ErpData;
  refresh: () => Promise<void>;
}) {
  const [form, setForm] = useState<PForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [modeFilter, setModeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const clientName = (id: number) => {
    const c = data.clients.find((x) => x.id === id);
    return c ? `${c.nom} ${c.prenom ?? ""}`.trim() : "—";
  };
  const clientPhone = (id: number) => data.clients.find((x) => x.id === id)?.telephone || "—";
  const salleName = (id: number) => data.salles.find((s) => s.id === id)?.nom ?? "—";
  const resByPay = (rid: number) => data.reservations.find((r) => r.id === rid);

  const totals = useMemo(() => {
    let ttc = 0, paye = 0;
    data.reservations
      .filter((r) => r.statut !== "Annulée")
      .forEach((r) => {
        const f = resFinance(r, data.payments);
        ttc += f.totalTTC;
        paye += f.paye;
      });
    return { ttc, paye, solde: ttc - paye };
  }, [data.reservations, data.payments]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.payments.filter((p) => {
      const r = resByPay(p.reservationId);
      if (modeFilter && p.mode !== modeFilter) return false;
      if (fromDate && p.datePaiement < fromDate) return false;
      if (toDate && p.datePaiement > toDate) return false;
      if (statusFilter) {
        const st = paymentStatusFor(r, data.payments).label;
        if (st !== statusFilter) return false;
      }
      if (!q) return true;
      const haystack = [
        r?.reference,
        r ? clientName(r.clientId) : "",
        r ? clientPhone(r.clientId) : "",
        r ? salleName(r.salleId) : "",
        r?.typeEvenement,
        p.mode,
        p.reference,
        p.montant,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.payments, data.reservations, query, modeFilter, statusFilter, fromDate, toDate]);

  async function save() {
    if (!form || !form.reservationId) {
      setError("Veuillez choisir une réservation.");
      return;
    }
    const montant = Number(form.montant);
    if (!Number.isFinite(montant) || montant <= 0) {
      setError("Le montant doit être un nombre positif.");
      return;
    }
    setSaving(true);
    setError("");
    const res = form.id
      ? await apiSend("/api/payments", "PUT", form)
      : await apiSend("/api/payments", "POST", form);
    setSaving(false);
    if (!res.ok) {
      setError(res.error ?? "Erreur lors de l'enregistrement.");
      return;
    }
    await refresh();
    setForm(null);
  }

  async function remove(id: number) {
    if (!confirm("Supprimer ce paiement ?")) return;
    const res = await apiSend(`/api/payments?id=${id}`, "DELETE");
    if (!res.ok) {
      alert(res.error ?? "Erreur lors de la suppression.");
      return;
    }
    await refresh();
  }

  function openEdit(p: Payment) {
    setError("");
    setForm({
      id: p.id,
      reservationId: p.reservationId,
      montant: String(num(p.montant)),
      mode: p.mode,
      datePaiement: p.datePaiement,
      reference: p.reference ?? "",
      note: p.note ?? "",
    });
  }

  function rowsForExport() {
    return filtered.map((p) => {
      const r = resByPay(p.reservationId);
      const f = r ? resFinance(r, data.payments) : null;
      return { p, r, f };
    });
  }

  function doExportExcel() {
    exportToExcel(
      `paiements_${todayISO()}`,
      [
        { header: "N° Réservation", value: ({ r }) => r?.reference ?? "—" },
        { header: "Client", value: ({ r }) => (r ? clientName(r.clientId) : "—") },
        { header: "Téléphone", value: ({ r }) => (r ? clientPhone(r.clientId) : "—") },
        { header: "Salle", value: ({ r }) => (r ? salleName(r.salleId) : "—") },
        { header: "Événement", value: ({ r }) => r?.typeEvenement ?? "—" },
        { header: "Date événement", value: ({ r }) => (r ? fmtDate(r.dateEvenement) : "—") },
        { header: "Date paiement", value: ({ p }) => fmtDate(p.datePaiement) },
        { header: "Montant payé (DA)", value: ({ p }) => num(p.montant) },
        { header: "Total contrat (DA)", value: ({ f }) => (f ? f.totalTTC.toFixed(2) : "0") },
        { header: "Solde restant (DA)", value: ({ f }) => (f ? f.solde.toFixed(2) : "0") },
        { header: "Mode de paiement", value: ({ p }) => p.mode },
        { header: "Enregistré par", value: ({ p }) => p.recordedByName || "—" },
      ],
      rowsForExport(),
    );
  }

  async function doExportPdf() {
    await exportTableToPdf({
      filename: `paiements_${todayISO()}`,
      title: "Registre des paiements",
      subtitle: `${filtered.length} paiement(s)`,
      columns: [
        { header: "Réf.", value: ({ r }) => r?.reference ?? "—", width: 1.1 },
        { header: "Client", value: ({ r }) => (r ? clientName(r.clientId) : "—"), width: 1.6 },
        { header: "Salle", value: ({ r }) => (r ? salleName(r.salleId) : "—"), width: 1.2 },
        { header: "Date", value: ({ p }) => fmtDate(p.datePaiement), width: 1 },
        { header: "Mode", value: ({ p }) => p.mode, width: 1 },
        { header: "Enregistré par", value: ({ p }) => p.recordedByName || "—", width: 1.3 },
        { header: "Montant", value: ({ p }) => fmtMoney(p.montant), width: 1, align: "right" },
        { header: "Solde restant", value: ({ f }) => fmtMoney(f?.solde ?? 0), width: 1.1, align: "right" },
      ],
      rows: rowsForExport(),
      totalsRow: [
        "Total",
        "",
        "",
        "",
        "",
        "",
        fmtMoney(filtered.reduce((s, p) => s + num(p.montant), 0)),
        "",
      ],
    });
  }

  function doPrint() {
    const html = buildPrintTable(
      [
        { header: "Réf.", value: ({ r }: ReturnType<typeof rowsForExport>[number]) => r?.reference ?? "—" },
        { header: "Client", value: ({ r }) => (r ? clientName(r.clientId) : "—") },
        { header: "Salle", value: ({ r }) => (r ? salleName(r.salleId) : "—") },
        { header: "Date paiement", value: ({ p }) => fmtDate(p.datePaiement) },
        { header: "Montant", value: ({ p }) => fmtMoney(p.montant) },
        { header: "Solde restant", value: ({ f }) => fmtMoney(f?.solde ?? 0) },
        { header: "Mode", value: ({ p }) => p.mode },
        { header: "Enregistré par", value: ({ p }) => p.recordedByName || "—" },
      ],
      rowsForExport(),
      {
        totalsRow: [
          "Total",
          "",
          "",
          "",
          fmtMoney(filtered.reduce((s, p) => s + num(p.montant), 0)),
          "",
          "",
          "",
        ],
      },
    );
    printHtmlDocument("Registre des paiements — HOTEL EL FARES", html);
  }

  return (
    <div className="ef-fade">
      <PageHeader
        title="Paiements"
        subtitle="Encaissements et suivi des soldes"
        action={
          <div className="flex flex-wrap gap-2">
            <button className="ef-btn ef-btn-ghost no-print" onClick={doPrint}>
              <IconPrint className="h-4 w-4" /> Imprimer
            </button>
            <button className="ef-btn ef-btn-ghost no-print" onClick={doExportPdf}>
              <IconDownload className="h-4 w-4" /> Exporter PDF
            </button>
            <button className="ef-btn ef-btn-ghost no-print" onClick={doExportExcel}>
              <IconDownload className="h-4 w-4" /> Exporter Excel
            </button>
            <button
              className="ef-btn ef-btn-primary"
              onClick={() => {
                setError("");
                setForm({
                  reservationId: "",
                  montant: "",
                  mode: "Espèces",
                  datePaiement: todayISO(),
                  reference: "",
                  note: "",
                });
              }}
            >
              <IconPlus className="h-4 w-4" /> Enregistrer un paiement
            </button>
          </div>
        }
      />

      <div className="mb-2 max-w-xs">
        <Kpi label="Total encaissé" value={fmtMoney(totals.paye)} tint="#0d9488" />
      </div>

      <p className="mb-4 text-xs text-slate-400">
        Le total à facturer et le solde restant s&apos;affichent par client dans le tableau ci-dessous.
      </p>

      {/* Search & filters */}
      <div className="no-print mb-4 flex flex-wrap items-center gap-2">
        <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
          <IconSearch className="h-4 w-4 text-slate-400" />
          <input
            className="w-full text-sm outline-none"
            placeholder="Client, téléphone, réf. réservation, salle, mode…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select className="ef-input w-auto" value={modeFilter} onChange={(e) => setModeFilter(e.target.value)}>
          <option value="">Tous les modes</option>
          {MODES_PAIEMENT.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
        <select className="ef-input w-auto" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">Tous les statuts</option>
          <option>Non payé</option>
          <option>Payé partiellement</option>
          <option>Payé intégralement</option>
        </select>
        <input type="date" className="ef-input w-auto" value={fromDate} onChange={(e) => setFromDate(e.target.value)} title="Du" />
        <input type="date" className="ef-input w-auto" value={toDate} onChange={(e) => setToDate(e.target.value)} title="Au" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState text="Aucun paiement ne correspond aux critères." />
      ) : (
        <div className="ef-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-xs uppercase text-slate-400">
                  <th className="px-4 py-3">Date paiement</th>
                  <th>Réservation</th>
                  <th>Client</th>
                  <th>Téléphone</th>
                  <th>Salle</th>
                  <th>Événement</th>
                  <th>Statut</th>
                  <th>Mode</th>
                  <th>Enregistré par</th>
                  <th className="text-right">Montant payé</th>
                  <th className="text-right">Total contrat</th>
                  <th className="text-right">Solde restant</th>
                  <th className="px-4" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const r = resByPay(p.reservationId);
                  const f = r ? resFinance(r, data.payments) : null;
                  const status = paymentStatusFor(r, data.payments);
                  return (
                    <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                      <td className="px-4 py-3 text-slate-500">{fmtDate(p.datePaiement)}</td>
                      <td className="font-mono text-xs text-slate-500">{r?.reference ?? "—"}</td>
                      <td className="font-medium text-slate-700">{r ? clientName(r.clientId) : "—"}</td>
                      <td className="text-slate-500">{r ? clientPhone(r.clientId) : "—"}</td>
                      <td className="text-slate-500">{r ? salleName(r.salleId) : "—"}</td>
                      <td className="text-slate-500">{r?.typeEvenement ?? "—"}</td>
                      <td>
                        <span className="ef-badge" style={{ background: `${status.tint}1a`, color: status.tint }}>
                          {status.label}
                        </span>
                      </td>
                      <td>
                        <span className="ef-badge bg-emerald-50 text-emerald-700">{p.mode}</span>
                      </td>
                      <td className="text-slate-500">{p.recordedByName || "—"}</td>
                      <td className="text-right font-bold text-slate-800">{fmtMoney(p.montant)}</td>
                      <td className="text-right text-slate-500">{f ? fmtMoney(f.totalTTC) : "—"}</td>
                      <td className="text-right font-bold" style={{ color: (f?.solde ?? 0) > 0.5 ? "#dc2626" : "#16a34a" }}>
                        {f ? fmtMoney(f.solde) : "—"}
                      </td>
                      <td className="px-4">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEdit(p)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                            <IconEdit className="h-4 w-4" />
                          </button>
                          <button onClick={() => remove(p.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600">
                            <IconTrash className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? "Modifier le paiement" : "Nouveau paiement"}>
        {form && (
          <div className="space-y-3">
            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <IconAlert className="h-4 w-4 shrink-0" /> {error}
              </div>
            )}
            <Field label="Réservation *">
              <select
                className="ef-input"
                disabled={!!form.id}
                value={form.reservationId}
                onChange={(e) => setForm({ ...form, reservationId: Number(e.target.value) })}
              >
                <option value="">— Choisir —</option>
                {data.reservations
                  .filter((r) => r.statut !== "Annulée")
                  .map((r) => {
                    const f = resFinance(r, data.payments);
                    return (
                      <option key={r.id} value={r.id}>
                        {r.reference} · {clientName(r.clientId)} · solde {fmtMoney(f.solde)}
                      </option>
                    );
                  })}
              </select>
            </Field>
            {form.reservationId ? (
              <ResSummary res={resByPay(Number(form.reservationId))!} data={data} />
            ) : null}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Montant (DA) *">
                <input type="number" className="ef-input" value={form.montant} onChange={(e) => setForm({ ...form, montant: e.target.value })} />
              </Field>
              <Field label="Mode de paiement">
                <select className="ef-input" value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })}>
                  {MODES_PAIEMENT.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </Field>
              <Field label="Date">
                <input type="date" className="ef-input" value={form.datePaiement} onChange={(e) => setForm({ ...form, datePaiement: e.target.value })} />
              </Field>
              <Field label="Référence">
                <input className="ef-input" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
              </Field>
            </div>
            <Field label="Note">
              <input className="ef-input" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
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

function ResSummary({ res, data }: { res: Reservation; data: ErpData }) {
  const f = resFinance(res, data.payments);
  return (
    <div className="grid grid-cols-3 gap-2 rounded-lg bg-slate-50 p-3 text-center text-xs">
      <div>
        <div className="text-slate-400">Total TTC</div>
        <div className="font-bold text-slate-700">{fmtMoney(f.totalTTC)}</div>
      </div>
      <div>
        <div className="text-slate-400">Déjà payé</div>
        <div className="font-bold text-emerald-600">{fmtMoney(f.paye)}</div>
      </div>
      <div>
        <div className="text-slate-400">Solde</div>
        <div className="font-bold text-red-600">{fmtMoney(f.solde)}</div>
      </div>
    </div>
  );
}

function Kpi({ label, value, tint }: { label: string; value: string; tint: string }) {
  return (
    <div className="ef-card flex items-center gap-3 p-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ background: `${tint}1a`, color: tint }}>
        <IconCash className="h-5 w-5" />
      </div>
      <div>
        <div className="text-base font-extrabold text-slate-800">{value}</div>
        <div className="text-xs text-slate-500">{label}</div>
      </div>
    </div>
  );
}
