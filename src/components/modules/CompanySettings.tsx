"use client";

import { useEffect, useState, type ReactNode } from "react";
import { PageHeader, Tabs, Field, Modal, Toggle, EmptyState, useToast, ToastViewport } from "../ui";
import {
  IconUpload,
  IconEye,
  IconEyeOff,
  IconKey,
  IconEdit,
  IconPlus,
} from "../icons";
import { apiSend } from "@/lib/store";
import { useLocale } from "@/lib/i18n";
import type { Role } from "@/db/schema";

type SettingsForm = {
  logoUrl: string;
  name: string;
  salleName: string;
  description: string;
  address: string;
  city: string;
  wilaya: string;
  country: string;
  phone: string;
  phone2: string;
  email: string;
  website: string;
  rc: string;
  nif: string;
  nis: string;
  currency: string;
  defaultTaxRate: string;
  defaultLanguage: "fr" | "ar";
  creneauJourneeDebut: string;
  creneauJourneeFin: string;
  creneauSoireeDebut: string;
  creneauSoireeFin: string;
  creneauJourneeCompleteDebut: string;
  creneauJourneeCompleteFin: string;
};

const EMPTY_FORM: SettingsForm = {
  logoUrl: "",
  name: "",
  salleName: "",
  description: "",
  address: "",
  city: "",
  wilaya: "",
  country: "Algérie",
  phone: "",
  phone2: "",
  email: "",
  website: "",
  rc: "",
  nif: "",
  nis: "",
  currency: "DA",
  defaultTaxRate: "19",
  defaultLanguage: "fr",
  creneauJourneeDebut: "10:00",
  creneauJourneeFin: "17:00",
  creneauSoireeDebut: "18:00",
  creneauSoireeFin: "02:00",
  creneauJourneeCompleteDebut: "10:00",
  creneauJourneeCompleteFin: "02:00",
};

type ManagedUser = {
  id: number;
  username: string;
  name: string;
  role: Role;
  active: number;
  createdAt: string;
};

const MAX_LOGO_BYTES = 1_100_000;

export default function CompanySettings() {
  const { t } = useLocale();
  const { toast, showToast } = useToast();
  const [tab, setTab] = useState<"general" | "contact" | "system" | "users">("general");

  const [form, setForm] = useState<SettingsForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [me, setMe] = useState<{ username: string } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/company-settings", { cache: "no-store" });
        if (r.ok) {
          const row = await r.json();
          if (row) setForm({ ...EMPTY_FORM, ...row });
        }
      } finally {
        setLoading(false);
      }
    })();
    (async () => {
      try {
        const r = await fetch("/api/users", { cache: "no-store" });
        if (r.ok) setUsers(await r.json());
      } finally {
        setUsersLoading(false);
      }
    })();
    (async () => {
      const r = await fetch("/api/auth/me", { cache: "no-store" });
      const d = await r.json().catch(() => ({ user: null }));
      setMe(d.user);
    })();
  }, []);

  function set<K extends keyof SettingsForm>(key: K, value: SettingsForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleLogoFile(file: File) {
    if (!/^image\/(png|jpeg|jpg|webp)$/.test(file.type)) {
      showToast({ type: "error", text: t("companySettings.logoHint") });
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      showToast({ type: "error", text: t("companySettings.logoHint") });
      return;
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("read failed"));
      reader.readAsDataURL(file);
    });
    set("logoUrl", dataUrl);
  }

  async function save() {
    setSaving(true);
    const res = await apiSend("/api/company-settings", "PUT", form);
    setSaving(false);
    if (res.ok) {
      showToast({ type: "success", text: t("companySettings.saved") });
    } else {
      showToast({ type: "error", text: res.error || t("companySettings.saveError") });
    }
  }

  async function refreshUsers() {
    const r = await fetch("/api/users", { cache: "no-store" });
    if (r.ok) setUsers(await r.json());
  }

  const tabs = [
    { key: "general", label: t("companySettings.tab.general") },
    { key: "contact", label: t("companySettings.tab.contact") },
    { key: "system", label: t("companySettings.tab.system") },
    { key: "users", label: t("companySettings.tab.users") },
  ];

  return (
    <div className="ef-fade">
      <PageHeader title={t("companySettings.title")} subtitle={t("companySettings.subtitle")} />
      <Tabs tabs={tabs} active={tab} onChange={(k) => setTab(k as typeof tab)} />

      {loading ? (
        <div className="flex h-40 items-center justify-center text-slate-400">{t("app.loading")}</div>
      ) : (
        <>
          {tab === "general" && (
            <SettingsPanel onSave={save} saving={saving}>
              <div className="mb-5 flex items-center gap-4">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  {form.logoUrl ? (
                    // Data-URL / arbitrary uploaded logo — not eligible for next/image optimization.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={form.logoUrl} alt="" className="h-full w-full object-contain p-1" />
                  ) : (
                    <span className="text-xs text-slate-300">{t("companySettings.logo")}</span>
                  )}
                </div>
                <div>
                  <div className="flex flex-wrap gap-2">
                    <label className="ef-btn ef-btn-ghost cursor-pointer">
                      <IconUpload className="h-4 w-4" /> {t("companySettings.logoUpload")}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleLogoFile(file);
                          e.target.value = "";
                        }}
                      />
                    </label>
                    {form.logoUrl && (
                      <button type="button" className="ef-btn ef-btn-ghost" onClick={() => set("logoUrl", "")}>
                        {t("companySettings.logoRemove")}
                      </button>
                    )}
                  </div>
                  <p className="mt-1.5 text-xs text-slate-400">{t("companySettings.logoHint")}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label={t("companySettings.name")}>
                  <input className="ef-input" value={form.name} onChange={(e) => set("name", e.target.value)} />
                </Field>
                <Field label={t("companySettings.salleName")}>
                  <input className="ef-input" value={form.salleName} onChange={(e) => set("salleName", e.target.value)} />
                </Field>
                <Field label={t("companySettings.description")}>
                  <textarea
                    className="ef-input min-h-[84px] resize-y sm:col-span-2"
                    value={form.description}
                    onChange={(e) => set("description", e.target.value)}
                  />
                </Field>
                <Field label={t("companySettings.address")}>
                  <input className="ef-input" value={form.address} onChange={(e) => set("address", e.target.value)} />
                </Field>
                <Field label={t("companySettings.city")}>
                  <input className="ef-input" value={form.city} onChange={(e) => set("city", e.target.value)} />
                </Field>
                <Field label={t("companySettings.wilaya")}>
                  <input className="ef-input" value={form.wilaya} onChange={(e) => set("wilaya", e.target.value)} />
                </Field>
                <Field label={t("companySettings.country")}>
                  <input className="ef-input" value={form.country} onChange={(e) => set("country", e.target.value)} />
                </Field>
              </div>
            </SettingsPanel>
          )}

          {tab === "contact" && (
            <SettingsPanel onSave={save} saving={saving}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label={t("companySettings.phone")}>
                  <input className="ef-input" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
                </Field>
                <Field label={t("companySettings.phone2")}>
                  <input className="ef-input" value={form.phone2} onChange={(e) => set("phone2", e.target.value)} />
                </Field>
                <Field label={t("companySettings.email")}>
                  <input type="email" className="ef-input" value={form.email} onChange={(e) => set("email", e.target.value)} />
                </Field>
                <Field label={t("companySettings.website")}>
                  <input className="ef-input" value={form.website} onChange={(e) => set("website", e.target.value)} />
                </Field>
                <Field label={t("companySettings.rc")}>
                  <input className="ef-input" value={form.rc} onChange={(e) => set("rc", e.target.value)} />
                </Field>
                <Field label={t("companySettings.nif")}>
                  <input className="ef-input" value={form.nif} onChange={(e) => set("nif", e.target.value)} />
                </Field>
                <Field label={t("companySettings.nis")}>
                  <input className="ef-input" value={form.nis} onChange={(e) => set("nis", e.target.value)} />
                </Field>
              </div>
            </SettingsPanel>
          )}

          {tab === "system" && (
            <SettingsPanel onSave={save} saving={saving}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label={t("companySettings.currency")}>
                  <input className="ef-input" value={form.currency} onChange={(e) => set("currency", e.target.value)} />
                </Field>
                <Field label={t("companySettings.defaultTaxRate")}>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    className="ef-input"
                    value={form.defaultTaxRate}
                    onChange={(e) => set("defaultTaxRate", e.target.value)}
                  />
                </Field>
                <Field label={t("companySettings.defaultLanguage")}>
                  <select
                    className="ef-input"
                    value={form.defaultLanguage}
                    onChange={(e) => set("defaultLanguage", e.target.value as "fr" | "ar")}
                  >
                    <option value="fr">{t("lang.french")}</option>
                    <option value="ar">{t("lang.arabic")}</option>
                  </select>
                </Field>
              </div>

              <div className="mt-6 border-t border-slate-100 pt-5">
                <h4 className="mb-1 text-sm font-bold text-slate-700">{t("companySettings.creneauxTitle")}</h4>
                <p className="mb-4 text-xs text-slate-400">{t("companySettings.creneauxHint")}</p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="rounded-lg border border-slate-200 p-3">
                    <div className="mb-2 text-xs font-bold uppercase text-slate-400">{t("companySettings.creneauJournee")}</div>
                    <div className="grid grid-cols-2 gap-2">
                      <Field label={t("companySettings.creneauDebut")}>
                        <input type="time" className="ef-input" value={form.creneauJourneeDebut} onChange={(e) => set("creneauJourneeDebut", e.target.value)} />
                      </Field>
                      <Field label={t("companySettings.creneauFin")}>
                        <input type="time" className="ef-input" value={form.creneauJourneeFin} onChange={(e) => set("creneauJourneeFin", e.target.value)} />
                      </Field>
                    </div>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-3">
                    <div className="mb-2 text-xs font-bold uppercase text-slate-400">{t("companySettings.creneauSoiree")}</div>
                    <div className="grid grid-cols-2 gap-2">
                      <Field label={t("companySettings.creneauDebut")}>
                        <input type="time" className="ef-input" value={form.creneauSoireeDebut} onChange={(e) => set("creneauSoireeDebut", e.target.value)} />
                      </Field>
                      <Field label={t("companySettings.creneauFin")}>
                        <input type="time" className="ef-input" value={form.creneauSoireeFin} onChange={(e) => set("creneauSoireeFin", e.target.value)} />
                      </Field>
                    </div>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-3">
                    <div className="mb-2 text-xs font-bold uppercase text-slate-400">{t("companySettings.creneauJourneeComplete")}</div>
                    <div className="grid grid-cols-2 gap-2">
                      <Field label={t("companySettings.creneauDebut")}>
                        <input type="time" className="ef-input" value={form.creneauJourneeCompleteDebut} onChange={(e) => set("creneauJourneeCompleteDebut", e.target.value)} />
                      </Field>
                      <Field label={t("companySettings.creneauFin")}>
                        <input type="time" className="ef-input" value={form.creneauJourneeCompleteFin} onChange={(e) => set("creneauJourneeCompleteFin", e.target.value)} />
                      </Field>
                    </div>
                  </div>
                </div>
              </div>
            </SettingsPanel>
          )}

          {tab === "users" && (
            <UsersPanel
              users={users}
              loading={usersLoading}
              currentUsername={me?.username}
              onChanged={refreshUsers}
              showToast={showToast}
            />
          )}
        </>
      )}

      <ToastViewport toast={toast} />
    </div>
  );
}

function SettingsPanel({
  children,
  onSave,
  saving,
}: {
  children: ReactNode;
  onSave: () => void;
  saving: boolean;
}) {
  const { t } = useLocale();
  return (
    <div className="ef-card p-5">
      {children}
      <div className="mt-6 flex justify-end border-t border-slate-100 pt-4">
        <button type="button" className="ef-btn ef-btn-primary" disabled={saving} onClick={onSave}>
          {saving ? t("companySettings.saving") : t("companySettings.save")}
        </button>
      </div>
    </div>
  );
}

function UsersPanel({
  users,
  loading,
  currentUsername,
  onChanged,
  showToast,
}: {
  users: ManagedUser[];
  loading: boolean;
  currentUsername?: string;
  onChanged: () => void;
  showToast: (m: { type: "success" | "error"; text: string }) => void;
}) {
  const { t } = useLocale();
  const [addOpen, setAddOpen] = useState(false);
  const [editUser, setEditUser] = useState<ManagedUser | null>(null);
  const [resetUser, setResetUser] = useState<ManagedUser | null>(null);

  async function toggleActive(u: ManagedUser) {
    const res = await apiSend(`/api/users/${u.id}`, "PUT", { active: u.active ? 0 : 1 });
    if (res.ok) {
      onChanged();
    } else {
      showToast({ type: "error", text: res.error || t("users.updateError") });
    }
  }

  return (
    <div className="ef-fade">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-slate-500">{t("users.subtitle")}</p>
        <button type="button" className="ef-btn ef-btn-primary" onClick={() => setAddOpen(true)}>
          <IconPlus className="h-4 w-4" /> {t("users.add")}
        </button>
      </div>

      {loading ? (
        <div className="flex h-32 items-center justify-center text-slate-400">{t("app.loading")}</div>
      ) : users.length === 0 ? (
        <EmptyState text={t("users.empty")} />
      ) : (
        <div className="ef-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-xs uppercase text-slate-400">
                  <th className="px-4 py-3">{t("users.username")}</th>
                  <th>{t("users.name")}</th>
                  <th>{t("users.role")}</th>
                  <th>{t("users.status")}</th>
                  <th className="text-right pr-4">{t("users.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isSelf = u.username === currentUsername;
                  return (
                    <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">
                        {u.username}
                        {isSelf && (
                          <span className="ef-badge ml-2 bg-slate-100 text-slate-500">{t("users.selfBadge")}</span>
                        )}
                      </td>
                      <td className="font-medium text-slate-700">{u.name}</td>
                      <td className="text-slate-500">{t(`role.${u.role}` as "role.admin")}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <Toggle checked={u.active === 1} onChange={() => toggleActive(u)} disabled={isSelf} />
                          <span className={u.active ? "text-[#137a3b]" : "text-slate-400"}>
                            {u.active ? t("users.active") : t("users.inactive")}
                          </span>
                        </div>
                      </td>
                      <td className="py-2 pr-4">
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            title={t("users.edit")}
                            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                            onClick={() => setEditUser(u)}
                          >
                            <IconEdit className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            title={t("users.resetPassword")}
                            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                            onClick={() => setResetUser(u)}
                          >
                            <IconKey className="h-4 w-4" />
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

      {addOpen && (
        <UserFormModal
          onClose={() => setAddOpen(false)}
          onDone={() => {
            setAddOpen(false);
            onChanged();
          }}
          showToast={showToast}
        />
      )}
      {editUser && (
        <UserFormModal
          user={editUser}
          onClose={() => setEditUser(null)}
          onDone={() => {
            setEditUser(null);
            onChanged();
          }}
          showToast={showToast}
        />
      )}
      {resetUser && (
        <ResetPasswordModal
          user={resetUser}
          onClose={() => setResetUser(null)}
          onDone={() => {
            setResetUser(null);
            onChanged();
          }}
          showToast={showToast}
        />
      )}
    </div>
  );
}

function UserFormModal({
  user,
  onClose,
  onDone,
  showToast,
}: {
  user?: ManagedUser;
  onClose: () => void;
  onDone: () => void;
  showToast: (m: { type: "success" | "error"; text: string }) => void;
}) {
  const { t } = useLocale();
  const isEdit = !!user;
  const [username, setUsername] = useState(user?.username ?? "");
  const [name, setName] = useState(user?.name ?? "");
  const [role, setRole] = useState<Role>(user?.role ?? "receptionist");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setSubmitting(true);
    setError("");
    const res = isEdit
      ? await apiSend(`/api/users/${user!.id}`, "PUT", { name, role })
      : await apiSend("/api/users", "POST", { username, name, role, password });
    setSubmitting(false);
    if (res.ok) {
      showToast({ type: "success", text: isEdit ? t("users.updated") : t("users.created") });
      onDone();
    } else {
      setError(res.error || (isEdit ? t("users.updateError") : t("users.createError")));
    }
  }

  return (
    <Modal open onClose={onClose} title={isEdit ? t("users.editTitle") : t("users.createTitle")}>
      <div className="flex flex-col gap-4">
        {!isEdit && (
          <Field label={t("users.username")}>
            <input className="ef-input" value={username} onChange={(e) => setUsername(e.target.value)} />
            <p className="mt-1 text-xs text-slate-400">{t("users.usernameHint")}</p>
          </Field>
        )}
        <Field label={t("users.name")}>
          <input className="ef-input" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label={t("users.role")}>
          <select className="ef-input" value={role} onChange={(e) => setRole(e.target.value as Role)}>
            <option value="admin">{t("role.admin")}</option>
            <option value="receptionist">{t("role.receptionist")}</option>
            <option value="accountant">{t("role.accountant")}</option>
          </select>
        </Field>
        {!isEdit && (
          <Field label={t("users.password")}>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                className="ef-input pr-9"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-2 flex items-center text-slate-400"
                onClick={() => setShowPw((v) => !v)}
              >
                {showPw ? <IconEyeOff className="h-4 w-4" /> : <IconEye className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-1 text-xs text-slate-400">{t("users.passwordHint")}</p>
          </Field>
        )}
        {error && <p className="text-sm font-medium text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="ef-btn ef-btn-ghost" onClick={onClose}>
            {t("users.cancel")}
          </button>
          <button type="button" className="ef-btn ef-btn-primary" disabled={submitting} onClick={submit}>
            {t("users.confirm")}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function ResetPasswordModal({
  user,
  onClose,
  onDone,
  showToast,
}: {
  user: ManagedUser;
  onClose: () => void;
  onDone: () => void;
  showToast: (m: { type: "success" | "error"; text: string }) => void;
}) {
  const { t } = useLocale();
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setSubmitting(true);
    setError("");
    const res = await apiSend(`/api/users/${user.id}`, "PUT", { password });
    setSubmitting(false);
    if (res.ok) {
      showToast({ type: "success", text: t("users.passwordReset") });
      onDone();
    } else {
      setError(res.error || t("users.updateError"));
    }
  }

  return (
    <Modal open onClose={onClose} title={`${t("users.resetPasswordTitle")} — ${user.name}`}>
      <div className="flex flex-col gap-4">
        <Field label={t("users.newPassword")}>
          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              className="ef-input pr-9"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-2 flex items-center text-slate-400"
              onClick={() => setShowPw((v) => !v)}
            >
              {showPw ? <IconEyeOff className="h-4 w-4" /> : <IconEye className="h-4 w-4" />}
            </button>
          </div>
          <p className="mt-1 text-xs text-slate-400">{t("users.passwordHint")}</p>
        </Field>
        {error && <p className="text-sm font-medium text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="ef-btn ef-btn-ghost" onClick={onClose}>
            {t("users.cancel")}
          </button>
          <button type="button" className="ef-btn ef-btn-primary" disabled={submitting} onClick={submit}>
            {t("users.confirm")}
          </button>
        </div>
      </div>
    </Modal>
  );
}
