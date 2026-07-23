"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { Reservation, Expense, ExpenseCategory, Role } from "@/db/schema";
import type { ErpData } from "@/lib/store";
import { apiSend } from "@/lib/store";
import { fmtMoney, fmtDate, fmtTime, todayISO } from "@/lib/format";
import { statutColor } from "@/lib/compute";
import { resProfit, expensesFor } from "@/lib/finance";
import { Modal, Field, EmptyState, useToast, ToastViewport } from "./ui";
import { IconPlus, IconEdit, IconTrash, IconAlert } from "./icons";
import { useLocale } from "@/lib/i18n";

const WAGE_CATEGORIES = ["أجور العمال", "أجور الطباخ", "أجور المنظفين"];

export default function ReservationDetail({
  reservation,
  onClose,
  data,
  refresh,
  role,
}: {
  reservation: Reservation | null;
  onClose: () => void;
  data: ErpData;
  refresh: () => Promise<void>;
  role?: Role;
}) {
  const { t } = useLocale();
  const { toast, showToast } = useToast();
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [expenseForm, setExpenseForm] = useState<Partial<Expense> | null>(null);

  useEffect(() => {
    if (!reservation) return;
    (async () => {
      const r = await fetch("/api/expense-categories", { cache: "no-store" });
      if (r.ok) setCategories(await r.json());
    })();
  }, [reservation]);

  if (!reservation) return null;

  const canSeeFinance = role === "admin" || role === "accountant";
  const client = data.clients.find((c) => c.id === reservation.clientId);
  const salle = data.salles.find((s) => s.id === reservation.salleId);
  const c = statutColor(reservation.statut);
  const fin = resProfit(reservation, data.payments, data.expenses);
  const linkedExpenses = expensesFor(reservation.id, data.expenses);
  const workerCount = linkedExpenses.filter((e) => {
    const cat = categories.find((cat) => cat.id === e.categoryId);
    return cat && WAGE_CATEGORIES.includes(cat.name);
  }).length;

  async function saveExpense(payload: Partial<Expense>) {
    const isEdit = !!payload.id;
    const res = isEdit
      ? await apiSend(`/api/expenses/${payload.id}`, "PUT", payload)
      : await apiSend("/api/expenses", "POST", { ...payload, reservationId: reservation!.id });
    if (!res.ok) {
      showToast({ type: "error", text: res.error || t("expenses.saveError") });
      return false;
    }
    await refresh();
    showToast({ type: "success", text: isEdit ? t("expenses.updated") : t("expenses.created") });
    return true;
  }

  async function deleteExpense(id: number) {
    if (!confirm(t("expenses.deleteConfirm"))) return;
    const res = await apiSend(`/api/expenses?id=${id}`, "DELETE");
    if (!res.ok) {
      showToast({ type: "error", text: res.error || t("expenses.saveError") });
      return;
    }
    await refresh();
    showToast({ type: "success", text: t("expenses.deleted") });
  }

  return (
    <Modal open onClose={onClose} title={`${t("resDetail.title")} — ${reservation.reference}`} wide>
      <div className="flex flex-col gap-5">
        {/* Informations */}
        <div>
          <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">{t("resDetail.info")}</h4>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <InfoItem label={t("resDetail.client")} value={client ? `${client.nom} ${client.prenom ?? ""}`.trim() : "—"} />
            <InfoItem label={t("resDetail.salle")} value={salle?.nom ?? "—"} />
            <InfoItem
              label={t("resDetail.date")}
              value={`${fmtDate(reservation.dateEvenement)} · ${fmtTime(reservation.heureDebut)}–${fmtTime(reservation.heureFin)}`}
            />
            <InfoItem label={t("resDetail.guests")} value={String(reservation.invites)} />
            <InfoItem
              label={t("resDetail.status")}
              value={
                <span className="ef-badge" style={{ background: c.bg, color: c.fg }}>
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: c.dot }} />
                  {reservation.statut}
                </span>
              }
            />
          </div>
        </div>

        {/* Revenue breakdown */}
        <div className="rounded-xl border border-slate-200 p-3">
          <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">{t("resDetail.revenue")}</h4>
          <Row label={t("resDetail.subtotal")} value={fmtMoney(fin.sousTotal)} />
          <Row label={t("resDetail.discount")} value={`- ${fmtMoney(fin.remise)}`} />
          <Row label={t("resDetail.tax")} value={fmtMoney(fin.tva)} />
          <div className="mt-1 flex justify-between border-t border-slate-200 pt-1 font-bold text-slate-800">
            <span>{t("resDetail.totalRevenue")}</span>
            <span>{fmtMoney(fin.totalTTC)}</span>
          </div>
          <div className="mt-1 flex justify-between text-slate-500">
            <span>{t("resDetail.paid")}</span>
            <span>{fmtMoney(fin.paye)}</span>
          </div>
          <div className="flex justify-between font-semibold" style={{ color: fin.solde > 0.5 ? "#dc2626" : "#16a34a" }}>
            <span>{t("resDetail.balance")}</span>
            <span>{fmtMoney(fin.solde)}</span>
          </div>
        </div>

        {!canSeeFinance ? (
          <p className="rounded-lg bg-slate-50 p-3 text-center text-xs text-slate-400">{t("expenses.adminOnlyNotice")}</p>
        ) : (
          <>
            {/* Finance card */}
            <div>
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">{t("finance.title")}</h4>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <StatBox label={t("finance.totalRevenue")} value={fmtMoney(fin.totalTTC)} />
                <StatBox label={t("finance.totalExpenses")} value={fmtMoney(fin.expenseTotal)} tint="#dc2626" />
                <StatBox
                  label={fin.profit >= 0 ? t("finance.netProfit") : t("finance.netLoss")}
                  value={fmtMoney(Math.abs(fin.profit))}
                  tint={fin.profit >= 0 ? "#16a34a" : "#dc2626"}
                />
                <StatBox label={t("finance.profitMargin")} value={`${fin.profitPct.toFixed(1)}%`} tint={fin.profit >= 0 ? "#16a34a" : "#dc2626"} />
                <StatBox label={t("finance.workerCount")} value={String(workerCount)} />
                <StatBox label={t("finance.expenseCount")} value={String(fin.expenseCount)} />
              </div>
            </div>

            {/* Expenses table */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wide text-slate-400">{t("expenses.sectionTitle")}</h4>
                <button
                  className="ef-btn ef-btn-primary px-2.5 py-1.5 text-xs"
                  onClick={() =>
                    setExpenseForm({ nature: "", dateDepense: todayISO(), montant: "0", observation: "", categoryId: null })
                  }
                >
                  <IconPlus className="h-3.5 w-3.5" /> {t("expenses.add")}
                </button>
              </div>

              {linkedExpenses.length === 0 ? (
                <EmptyState text={t("expenses.none")} />
              ) : (
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-xs uppercase text-slate-400">
                        <th className="px-3 py-2">{t("expenses.date")}</th>
                        <th>{t("expenses.name")}</th>
                        <th>{t("expenses.category")}</th>
                        <th>{t("expenses.addedBy")}</th>
                        <th className="text-right">{t("expenses.amount")}</th>
                        <th className="px-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {linkedExpenses.map((e) => {
                        const cat = categories.find((cc) => cc.id === e.categoryId);
                        return (
                          <tr key={e.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                            <td className="px-3 py-2 text-slate-500">{fmtDate(e.dateDepense)}</td>
                            <td className="font-medium text-slate-700">{e.nature || "—"}</td>
                            <td>
                              {cat ? (
                                <span className="ef-badge bg-slate-100 text-slate-600">{cat.name}</span>
                              ) : (
                                <span className="text-slate-400">{t("expenses.category.none")}</span>
                              )}
                            </td>
                            <td className="text-slate-500">{e.recordedByName || "—"}</td>
                            <td className="text-right font-bold text-red-600">{fmtMoney(e.montant)}</td>
                            <td className="px-3">
                              {role === "admin" && (
                                <div className="flex justify-end gap-1">
                                  <button
                                    onClick={() => setExpenseForm(e)}
                                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                  >
                                    <IconEdit className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => deleteExpense(e.id)}
                                    className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                                  >
                                    <IconTrash className="h-4 w-4" />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {expenseForm && (
        <ExpenseFormModal
          expense={expenseForm}
          categories={categories}
          onClose={() => setExpenseForm(null)}
          onSave={async (payload) => {
            const ok = await saveExpense(payload);
            if (ok) setExpenseForm(null);
          }}
        />
      )}
      <ToastViewport toast={toast} />
    </Modal>
  );
}

function InfoItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className="text-sm font-medium text-slate-700">{value}</div>
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

function StatBox({ label, value, tint }: { label: string; value: string; tint?: string }) {
  return (
    <div className="ef-card p-3">
      <div className="text-lg font-extrabold" style={{ color: tint ?? "#1f2430" }}>
        {value}
      </div>
      <div className="text-xs font-medium text-slate-500">{label}</div>
    </div>
  );
}

function ExpenseFormModal({
  expense,
  categories,
  onClose,
  onSave,
}: {
  expense: Partial<Expense>;
  categories: ExpenseCategory[];
  onClose: () => void;
  onSave: (payload: Partial<Expense>) => Promise<void>;
}) {
  const { t } = useLocale();
  const isEdit = !!expense.id;
  const [nature, setNature] = useState(expense.nature ?? "");
  const [categoryId, setCategoryId] = useState<number | "">(expense.categoryId ?? "");
  const [montant, setMontant] = useState(String(expense.montant ?? ""));
  const [dateDepense, setDateDepense] = useState(expense.dateDepense ?? todayISO());
  const [observation, setObservation] = useState(expense.observation ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    const amount = Number(montant);
    if (!nature.trim()) {
      setError(t("expenses.errorName"));
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setError(t("expenses.errorAmount"));
      return;
    }
    setSaving(true);
    setError("");
    await onSave({
      id: expense.id,
      nature: nature.trim(),
      categoryId: categoryId === "" ? null : Number(categoryId),
      montant: String(amount),
      dateDepense,
      observation,
    });
    setSaving(false);
  }

  return (
    <Modal open onClose={onClose} title={isEdit ? t("expenses.editTitle") : t("expenses.addTitle")}>
      <div className="flex flex-col gap-3">
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <IconAlert className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}
        <Field label={t("expenses.name")}>
          <input className="ef-input" value={nature} onChange={(e) => setNature(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("expenses.category")}>
            <select className="ef-input" value={categoryId} onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : "")}>
              <option value="">{t("expenses.category.none")}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>
          <Field label={t("expenses.amount")}>
            <input type="number" className="ef-input" value={montant} onChange={(e) => setMontant(e.target.value)} />
          </Field>
        </div>
        <Field label={t("expenses.date")}>
          <input type="date" className="ef-input" value={dateDepense} onChange={(e) => setDateDepense(e.target.value)} />
        </Field>
        <Field label={t("expenses.notes")}>
          <textarea className="ef-input" rows={2} value={observation} onChange={(e) => setObservation(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2 pt-1">
          <button className="ef-btn ef-btn-ghost" onClick={onClose}>{t("expenses.cancel")}</button>
          <button className="ef-btn ef-btn-primary" disabled={saving} onClick={submit}>
            {saving ? "…" : t("expenses.save")}
          </button>
        </div>
      </div>
    </Modal>
  );
}
