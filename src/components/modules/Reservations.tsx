"use client";

import { useMemo, useState, type JSX, type SVGProps } from "react";
import type { Reservation, ReservationItem } from "@/db/schema";
import type { ErpData } from "@/lib/store";
import { apiSend } from "@/lib/store";
import { fmtMoney, fmtDate, fmtTime, num, todayISO } from "@/lib/format";
import { computeTotals, STATUTS, TYPES_EVENEMENT, statutColor, durationLabel, findSalleConflicts } from "@/lib/compute";
import { resFinance } from "@/lib/finance";
import { CRENEAU_KEYS, CRENEAU_LABELS, type CreneauKey, type CreneauxDefaults } from "@/lib/creneaux";
import { Modal, Field, PageHeader, EmptyState } from "../ui";
import { IconPlus, IconSearch, IconEdit, IconTrash, IconAlert, IconSun, IconMoon, IconSunMoon, IconCheck, IconPackage } from "../icons";
import EventExpenses from "../EventExpenses";

type FormState = {
  id?: number;
  clientId: number | "";
  salleId: number | "";
  typeEvenement: string;
  packId?: number;
  packNom: string;
  dateEvenement: string;
  heureDebut: string;
  heureFin: string;
  invites: number;
  statut: string;
  observations: string;
  items: ReservationItem[];
  remise: string;
  tvaTaux: string;
};

const CRENEAU_ICONS: Record<CreneauKey, (p: SVGProps<SVGSVGElement>) => JSX.Element> = {
  journee: IconSun,
  soiree: IconMoon,
  journeeComplete: IconSunMoon,
};

function newForm(creneaux: CreneauxDefaults): FormState {
  return {
    clientId: "",
    salleId: "",
    typeEvenement: "Mariage",
    packId: undefined,
    packNom: "",
    dateEvenement: todayISO(),
    heureDebut: creneaux.soiree.debut,
    heureFin: creneaux.soiree.fin,
    invites: 100,
    statut: "Option",
    observations: "",
    items: [],
    remise: "0",
    tvaTaux: "19",
  };
}

// Detects which créneau (if any) the current heureDebut/heureFin exactly
// matches, so the corresponding button is highlighted when editing an
// existing reservation. Returns null for a manually customized range.
function matchCreneau(creneaux: CreneauxDefaults, debut: string, fin: string): CreneauKey | null {
  return CRENEAU_KEYS.find((k) => creneaux[k].debut === debut && creneaux[k].fin === fin) ?? null;
}

export default function Reservations({
  data,
  refresh,
}: {
  data: ErpData;
  refresh: () => Promise<void>;
}) {
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("Tous");
  const [form, setForm] = useState<FormState | null>(null);
  const [activeCreneau, setActiveCreneau] = useState<CreneauKey | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const clientName = (id: number) => {
    const c = data.clients.find((x) => x.id === id);
    return c ? `${c.nom} ${c.prenom ?? ""}`.trim() : "—";
  };
  const clientPhone = (id: number) => data.clients.find((x) => x.id === id)?.telephone || "";
  const salleName = (id: number) => data.salles.find((s) => s.id === id)?.nom ?? "—";

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return data.reservations.filter((r) => {
      if (statusFilter !== "Tous" && r.statut !== statusFilter) return false;
      if (!s) return true;
      const f = resFinance(r, data.payments);
      return [
        r.reference,
        clientName(r.clientId),
        clientPhone(r.clientId),
        r.typeEvenement,
        salleName(r.salleId),
        fmtDate(r.dateEvenement),
        r.dateEvenement,
        f.totalTTC.toFixed(2),
        f.paye.toFixed(2),
        f.solde.toFixed(2),
      ]
        .join(" ")
        .toLowerCase()
        .includes(s);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, statusFilter, data.reservations, data.clients, data.salles, data.payments]);

  function openCreate() {
    setForm(newForm(data.creneaux));
    setActiveCreneau("soiree");
    setError("");
  }

  function openEdit(r: Reservation) {
    const heureDebut = fmtTime(r.heureDebut) || "18:00";
    const heureFin = fmtTime(r.heureFin) || "23:59";
    setForm({
      id: r.id,
      clientId: r.clientId,
      salleId: r.salleId,
      typeEvenement: r.typeEvenement,
      packId: r.packId ?? undefined,
      packNom: r.packNom ?? "",
      dateEvenement: r.dateEvenement,
      heureDebut,
      heureFin,
      invites: r.invites,
      statut: r.statut,
      observations: r.observations ?? "",
      items: (r.items ?? []).map((i) => ({ ...i })),
      remise: String(r.remise),
      tvaTaux: String(r.tvaTaux),
    });
    setActiveCreneau(matchCreneau(data.creneaux, heureDebut, heureFin));
    setError("");
  }

  function applyCreneau(key: CreneauKey) {
    if (!form) return;
    setForm({ ...form, heureDebut: data.creneaux[key].debut, heureFin: data.creneaux[key].fin });
    setActiveCreneau(key);
  }

  const totals = form ? computeTotals(form.items, form.remise, form.tvaTaux) : null;

  // Real-time availability, recomputed on every relevant form change — same
  // overlap rule as the authoritative check in the API (findConflict in
  // src/app/api/reservations/route.ts), so what's shown here matches what
  // will actually be accepted on save.
  const availability = useMemo(() => {
    if (!form || !form.dateEvenement || !form.heureDebut || !form.heureFin) return null;
    const otherSalles = data.salles
      .filter((s) => s.id !== form.salleId)
      .map((s) => ({
        salle: s,
        conflicts: findSalleConflicts(data.reservations, s.id, form.dateEvenement, form.heureDebut, form.heureFin, form.id),
      }));
    const selectedConflicts = form.salleId
      ? findSalleConflicts(data.reservations, Number(form.salleId), form.dateEvenement, form.heureDebut, form.heureFin, form.id)
      : [];
    return { otherSalles, selectedConflicts };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form?.salleId, form?.dateEvenement, form?.heureDebut, form?.heureFin, form?.id, data.salles, data.reservations]);

  function addItem(prestationId: number) {
    const p = data.prestations.find((x) => x.id === prestationId);
    if (!p || !form) return;
    setForm({
      ...form,
      items: [
        ...form.items,
        { prestationId: p.id, nom: p.nom, prix: num(p.prix), qte: 1 },
      ],
    });
  }
  function updateItem(idx: number, k: "prix" | "qte" | "nom", v: string) {
    if (!form) return;
    const items = form.items.map((it, i) =>
      i === idx ? { ...it, [k]: k === "nom" ? v : num(v) } : it,
    );
    setForm({ ...form, items });
  }
  function removeItem(idx: number) {
    if (!form) return;
    const removed = form.items[idx];
    const items = form.items.filter((_, i) => i !== idx);
    // The pack's billing line is tagged prestationId: 0 (sentinel — never a
    // real prestation id, which autoincrements from 1). Deleting that line
    // also clears packId/packNom so the reservation isn't left "linked" to a
    // pack that no longer has a corresponding charge.
    if (removed?.prestationId === 0) {
      setForm({ ...form, items, packId: undefined, packNom: "" });
    } else {
      setForm({ ...form, items });
    }
  }

  // Selecting a pack adds/replaces a single fixed-price billing line (prix =
  // pack.prix, independent of its included prestations' individual prices —
  // see the "Pack" section design decision in chat). The pack's included
  // prestations are shown separately as an informational breakdown, never
  // summed into the total.
  function selectPack(packId: number) {
    if (!form) return;
    const pack = data.packs.find((x) => x.id === packId);
    if (!pack) return;
    const withoutOldPack = form.items.filter((it) => it.prestationId !== 0);
    setForm({
      ...form,
      packId: pack.id,
      packNom: pack.nom,
      items: [
        { prestationId: 0, nom: `Pack : ${pack.nom}`, prix: num(pack.prix), qte: 1 },
        ...withoutOldPack,
      ],
    });
  }
  function removePack() {
    if (!form) return;
    setForm({
      ...form,
      packId: undefined,
      packNom: "",
      items: form.items.filter((it) => it.prestationId !== 0),
    });
  }

  async function save() {
    if (!form) return;
    if (!form.clientId || !form.salleId || !form.dateEvenement) {
      setError("Client, salle et date sont obligatoires.");
      return;
    }
    setSaving(true);
    setError("");
    const res = await apiSend("/api/reservations", form.id ? "PUT" : "POST", form);
    setSaving(false);
    if (!res.ok) {
      setError(res.error ?? "Erreur lors de l'enregistrement.");
      return;
    }
    await refresh();
    setForm(null);
  }

  async function remove(id: number) {
    if (!confirm("Supprimer cette réservation ?")) return;
    const res = await apiSend(`/api/reservations?id=${id}`, "DELETE");
    if (!res.ok) {
      alert(res.error ?? "Erreur lors de la suppression.");
      return;
    }
    await refresh();
  }

  return (
    <div className="ef-fade">
      <PageHeader
        title="Réservations"
        subtitle={`${data.reservations.length} réservation(s)`}
        action={
          <button
            className="ef-btn ef-btn-primary"
            onClick={openCreate}
          >
            <IconPlus className="h-4 w-4" /> Nouvelle réservation
          </button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative max-w-xs flex-1">
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="ef-input pl-9" placeholder="Client, téléphone, réf., salle, événement, date, montant…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="ef-input max-w-[160px]" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option>Tous</option>
          {STATUTS.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState text="Aucune réservation." />
      ) : (
        <div className="ef-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-xs uppercase text-slate-400">
                  <th className="px-4 py-3">Réf.</th>
                  <th>Client</th>
                  <th>Salle</th>
                  <th>Événement</th>
                  <th>Date / Heure</th>
                  <th className="text-right">Total TTC</th>
                  <th className="text-right">Solde</th>
                  <th>Statut</th>
                  <th className="px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const f = resFinance(r, data.payments);
                  const c = statutColor(r.statut);
                  return (
                    <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{r.reference}</td>
                      <td className="font-medium text-slate-700">{clientName(r.clientId)}</td>
                      <td className="text-slate-600">{salleName(r.salleId)}</td>
                      <td className="text-slate-600">{r.typeEvenement}</td>
                      <td className="text-slate-500">
                        {fmtDate(r.dateEvenement)}
                        <span className="block text-xs text-slate-400">{fmtTime(r.heureDebut)}–{fmtTime(r.heureFin)}</span>
                      </td>
                      <td className="text-right text-slate-700">{fmtMoney(f.totalTTC)}</td>
                      <td className="text-right font-semibold" style={{ color: f.solde > 0.5 ? "#dc2626" : "#16a34a" }}>
                        {fmtMoney(f.solde)}
                      </td>
                      <td>
                        <span className="ef-badge" style={{ background: c.bg, color: c.fg }}>
                          <span className="h-1.5 w-1.5 rounded-full" style={{ background: c.dot }} />
                          {r.statut}
                        </span>
                      </td>
                      <td className="px-4">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => openEdit(r)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                            <IconEdit className="h-4 w-4" />
                          </button>
                          <button onClick={() => remove(r.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600">
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

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? "Modifier la réservation" : "Nouvelle réservation"} wide extraWide>
        {form && (
          <div className="space-y-3">
            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <IconAlert className="h-4 w-4 shrink-0" /> {error}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Field label="Client *">
                <select className="ef-input" value={form.clientId} onChange={(e) => setForm({ ...form, clientId: Number(e.target.value) })}>
                  <option value="">— Choisir —</option>
                  {data.clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.nom} {c.prenom}</option>
                  ))}
                </select>
              </Field>
              <Field label="Salle *">
                <select className="ef-input" value={form.salleId} onChange={(e) => setForm({ ...form, salleId: Number(e.target.value) })}>
                  <option value="">— Choisir —</option>
                  {data.salles.map((s) => (
                    <option key={s.id} value={s.id}>{s.nom}</option>
                  ))}
                </select>
              </Field>
              <Field label="Type d'événement">
                <select className="ef-input" value={form.typeEvenement} onChange={(e) => setForm({ ...form, typeEvenement: e.target.value })}>
                  {TYPES_EVENEMENT.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </Field>
              <Field label="Statut">
                <select className="ef-input" value={form.statut} onChange={(e) => setForm({ ...form, statut: e.target.value })}>
                  {STATUTS.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
              <Field label="Date de l'événement *">
                <input type="date" className="ef-input" value={form.dateEvenement} onChange={(e) => setForm({ ...form, dateEvenement: e.target.value })} />
              </Field>
              <Field label="Nombre d'invités">
                <input type="number" className="ef-input" value={form.invites} onChange={(e) => setForm({ ...form, invites: Number(e.target.value) })} />
              </Field>
            </div>

            {/* Disponibilité des salles — même date / mêmes horaires */}
            {availability && form.dateEvenement && (
              <div className="rounded-xl border border-slate-200 p-2.5">
                <div className="mb-2 text-sm font-bold text-slate-700">Salles additionnelles (même date / créneau)</div>
                <div className="mb-2 flex items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#22a35a]" /> Libre</span>
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#e74c3c]" /> Occupée</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {availability.otherSalles.map(({ salle, conflicts }) => {
                    const free = conflicts.length === 0;
                    return (
                      <span
                        key={salle.id}
                        className="ef-badge"
                        style={{ background: free ? "#e7f6ec" : "#fdeaea", color: free ? "#137a3b" : "#c0392b" }}
                        title={free ? "Libre à cet horaire" : `Occupée : ${conflicts.map((c) => c.reference).join(", ")}`}
                      >
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: free ? "#22a35a" : "#e74c3c" }} />
                        {salle.nom} ({salle.capacite} pers.)
                      </span>
                    );
                  })}
                </div>

                {form.salleId && (
                  availability.selectedConflicts.length === 0 ? (
                    <div className="mt-3 flex items-center gap-2 rounded-lg bg-[#e7f6ec] px-3 py-2 text-sm font-medium text-[#137a3b]">
                      <IconCheck className="h-4 w-4 shrink-0" /> Salle disponible à cette date
                    </div>
                  ) : (
                    <div className="mt-3 flex items-center gap-2 rounded-lg bg-[#fdeaea] px-3 py-2 text-sm font-medium text-[#c0392b]">
                      <IconAlert className="h-4 w-4 shrink-0" />
                      Conflit : déjà réservée ({availability.selectedConflicts.map((c) => c.reference).join(", ")})
                    </div>
                  )
                )}
              </div>
            )}

            {/* Créneau */}
            <div className="rounded-xl border border-slate-200 p-2.5">
              <div className="mb-2 text-sm font-bold text-slate-700">Créneau *</div>
              <div className="grid grid-cols-3 gap-2">
                {CRENEAU_KEYS.map((key) => {
                  const Ic = CRENEAU_ICONS[key];
                  const range = data.creneaux[key];
                  const active = activeCreneau === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => applyCreneau(key)}
                      className={`flex flex-col items-center gap-1 rounded-lg border-2 px-3 py-3 text-center transition ${
                        active ? "border-[#f5a623] bg-[#fff4e0]" : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <Ic className={`h-5 w-5 ${active ? "text-[#b56a00]" : "text-slate-400"}`} />
                      <span className={`text-sm font-semibold ${active ? "text-[#b56a00]" : "text-slate-700"}`}>{CRENEAU_LABELS[key]}</span>
                      <span className="text-xs text-slate-400">{range.debut} – {range.fin}</span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-slate-400">
                Une salle peut être réservée à la fois en journée et en soirée par 2 clients différents. Horaires par défaut configurables dans Paramètres.
              </p>

              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Field label="Heure début *">
                  <input type="time" className="ef-input" value={form.heureDebut} onChange={(e) => { setForm({ ...form, heureDebut: e.target.value }); setActiveCreneau(matchCreneau(data.creneaux, e.target.value, form.heureFin)); }} />
                </Field>
                <Field label="Heure fin *">
                  <input type="time" className="ef-input" value={form.heureFin} onChange={(e) => { setForm({ ...form, heureFin: e.target.value }); setActiveCreneau(matchCreneau(data.creneaux, form.heureDebut, e.target.value)); }} />
                </Field>
                <div className="flex items-end justify-between gap-2 pb-1.5 text-xs">
                  <span className="text-slate-500">Durée : <span className="font-semibold text-slate-700">{durationLabel(form.heureDebut, form.heureFin)}</span></span>
                  {activeCreneau && (
                    <button type="button" className="text-[#b56a00] hover:underline" onClick={() => applyCreneau(activeCreneau)}>
                      ↺ Horaires par défaut
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Pack (optional fixed-price bundle) */}
            <div className="rounded-xl border border-slate-200 p-2.5">
              <div className="mb-2 flex items-center justify-between">
                <h4 className="flex items-center gap-1.5 text-sm font-bold text-slate-700">
                  <IconPackage className="h-4 w-4 text-[#f5a623]" /> Pack (optionnel)
                </h4>
                {!form.packId ? (
                  <select
                    className="ef-input max-w-[220px] text-xs"
                    value=""
                    onChange={(e) => e.target.value && selectPack(Number(e.target.value))}
                  >
                    <option value="">+ Choisir un pack…</option>
                    {data.packs
                      .filter((p) => p.actif && (!p.typeEvenement || p.typeEvenement === form.typeEvenement))
                      .map((p) => (
                        <option key={p.id} value={p.id}>{p.nom} — {fmtMoney(p.prix)}</option>
                      ))}
                  </select>
                ) : (
                  <button type="button" className="text-xs text-red-600 hover:underline" onClick={removePack}>
                    Retirer le pack
                  </button>
                )}
              </div>
              {form.packId ? (
                (() => {
                  const pack = data.packs.find((x) => x.id === form.packId);
                  return pack?.prestations?.length ? (
                    <div className="text-xs text-slate-500">
                      <span className="text-[11px] font-semibold uppercase text-slate-400">Ce pack comprend :</span>
                      <ul className="mt-0.5 space-y-0.5">
                        {pack.prestations.map((x, i) => (
                          <li key={i}>• {x.nom}{x.qte > 1 ? ` ×${x.qte}` : ""}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null;
                })()
              ) : (
                <p className="py-1 text-center text-xs text-slate-400">Aucun pack sélectionné — facturation à la prestation.</p>
              )}
            </div>

            {/* Items */}
            <div className="rounded-xl border border-slate-200 p-2.5">
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-700">Prestations</h4>
                <select
                  className="ef-input max-w-[220px] text-xs"
                  value=""
                  onChange={(e) => e.target.value && addItem(Number(e.target.value))}
                >
                  <option value="">+ Ajouter une prestation…</option>
                  {data.prestations.map((p) => (
                    <option key={p.id} value={p.id}>{p.nom} — {fmtMoney(p.prix)}</option>
                  ))}
                </select>
              </div>
              {form.items.length === 0 ? (
                <p className="py-2 text-center text-xs text-slate-400">Aucune prestation ajoutée.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase text-slate-400">
                      <th className="py-1">Désignation</th>
                      <th className="w-24">P.U.</th>
                      <th className="w-20">Qté</th>
                      <th className="w-28 text-right">Total</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {form.items.map((it, idx) => (
                      <tr key={idx} className="border-t border-slate-100">
                        <td className="py-1.5 pr-2">
                          <input className="ef-input py-1 text-sm" value={it.nom} onChange={(e) => updateItem(idx, "nom", e.target.value)} />
                        </td>
                        <td className="pr-2">
                          <input type="number" className="ef-input py-1 text-sm" value={it.prix} onChange={(e) => updateItem(idx, "prix", e.target.value)} />
                        </td>
                        <td className="pr-2">
                          <input type="number" className="ef-input py-1 text-sm" value={it.qte} onChange={(e) => updateItem(idx, "qte", e.target.value)} />
                        </td>
                        <td className="text-right font-medium text-slate-700">{fmtMoney(it.prix * it.qte)}</td>
                        <td>
                          <button onClick={() => removeItem(idx)} className="rounded p-1 text-slate-400 hover:text-red-600">
                            <IconTrash className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Dépenses de l'événement — nécessite une réservation déjà enregistrée
                (les achats/personnel/autres dépenses sont liés à un reservationId réel). */}
            {form.id ? (
              (() => {
                const savedReservation = data.reservations.find((r) => r.id === form.id);
                return savedReservation ? (
                  <EventExpenses reservation={savedReservation} data={data} refresh={refresh} />
                ) : null;
              })()
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 p-3 text-center text-xs text-slate-400">
                Enregistrez d&apos;abord la réservation pour pouvoir y ajouter des dépenses d&apos;événement (achats, personnel, autres dépenses).
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Observations">
                <textarea className="ef-input" rows={2} value={form.observations} onChange={(e) => setForm({ ...form, observations: e.target.value })} />
              </Field>
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Remise (DA)">
                    <input type="number" className="ef-input" value={form.remise} onChange={(e) => setForm({ ...form, remise: e.target.value })} />
                  </Field>
                  <Field label="TVA (%)">
                    <input type="number" className="ef-input" value={form.tvaTaux} onChange={(e) => setForm({ ...form, tvaTaux: e.target.value })} />
                  </Field>
                </div>
                {totals && (
                  <div className="rounded-lg bg-slate-50 p-3 text-sm">
                    <Row label="Sous-total" value={fmtMoney(totals.sousTotal)} />
                    <Row label="Remise" value={`- ${fmtMoney(totals.remise)}`} />
                    <Row label="Total HT" value={fmtMoney(totals.totalHT)} />
                    <Row label={`TVA (${form.tvaTaux}%)`} value={fmtMoney(totals.tva)} />
                    <div className="mt-1 flex justify-between border-t border-slate-200 pt-1 font-bold text-slate-800">
                      <span>Total TTC</span>
                      <span>{fmtMoney(totals.totalTTC)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button className="ef-btn ef-btn-ghost" onClick={() => setForm(null)}>Annuler</button>
              <button className="ef-btn ef-btn-primary" disabled={saving} onClick={save}>
                {saving ? "Vérification…" : "Enregistrer"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-slate-600">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}